import { RequestInput, Name } from './models/requestInput';
import { Location } from './models/entities';
import levenshtein from 'js-levenshtein';
import { dateTransformMask, isDateRange } from './masks';

const decreaseNameInversion = 0.7;
const decreaseNamePlace = 0.5;
const minNameScore = 0.1;
const blindNameScore = 0.7;

const minSexScore = 0.5;
const blindSexScore = 1;

const minDateScore = 0.2;
const blindDateScore = 0.8;
const uncertainDateScore = 0.7;

const minLocationScore = 0.2;
const blindLocationScore = 0.8;

const pruneScore = 0.3;

export const scoreResults = (request: RequestInputs, results: any): any => {
    return results
            .filter((result: any) => result.score > 0)
            .map((result: any) => {
                let scores = [ Math.round(result.score * 100) * 0.01 ]
                try {
                    scores = scoreResult(request, result).concat(scores);
                } catch(err) {
                    throw("failure", err, JSON.stringify(request), JSON.stringify(result))
                }
                result.scores = scores;
                result.score = scores[0];
                return result;
            })
            .filter((result: any) => result.score >= pruneScore)
            .sort((a: any, b: any) => (a.score < b.score[0]) ? 1 : ( (a.score > b.score) ? -1 : 0 ))
}

const multyiply = (a:number ,b: number): number => a*b;

const scoreResult = (request: RequestInput, result: any): number[] => {
    let score:number[] = [];
    score.unshift(scoreDate(request.birthDate, result.birth.date));
    if (pruneScore > score.reduce(multyiply)) { score.unshift(0); return score }
    score.unshift(scoreName({first: request.firstName, last: request.lastName}, result.name));
    if (pruneScore > score.reduce(multyiply)) { score.unshift(0); return score }
    score.unshift(scoreSex(request.sex, result.sex));
    if (pruneScore > score.reduce(multyiply)) { score.unshift(0); return score }
    score.unshift(scoreLocation({
        city: request.birthCity,
        cityCode: request.birthCityCode,
        departmentCode: request.birthDepartment,
        country: request.birthCountry,
        latitude: request.latitude,
        longitude: request.longitude
    }, result.birth.location));
    if (pruneScore > score.reduce(multyiply)) { score.unshift(0); return score }
    score.unshift(0.01 * Math.round(score.reduce(multyiply) * 100));
    return score;
}


const scoreName = (nameA: Name, nameB: Name): number => {
    if ((!nameA.first && !nameA.last) || (!nameB.first && !nameB.last)) { return blindNameScore }
    const firstA = tokenize(nameA.first);
    const lastA = tokenize(nameA.last);
    const firstB = tokenize(nameB.first);
    const lastB = tokenize(nameB.last);

    return 0.01 * Math.round(100*
        Math.max(scoreToken(firstA, firstB) * scoreToken(lastA, lastB),
        decreaseNameInversion * scoreToken(firstA, lastB) * scoreToken(lastA, firstB),
        minNameScore
    ));
}

const normalize = (token: strinng): string => {
    return token.normalize('NFKD').replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/\W+/, ' ');
}

const tokenize = (sentence: string|string[]): string|string[] => {
    if (typeof(sentence) === 'string') {
        return sentence.split(/\s+/);
    } else {
        // dont tokenize if string[]
        return sentence;
    }
}

const scoreToken = (tokenA: string|string[], tokenB: string|string[]): number => {
    if (!tokenA || !tokenB) {return minNameScore}
    if (typeof(tokenA) === 'string') {
        if (typeof(tokenB) === 'string') {
            return levNormScore(tokenA, tokenB);
        } else {
            return Math.max(levNormScore(tokenA, tokenB[0]),
                tokenB.length ? decreaseNamePlace * scoreToken(tokenA, tokenB.slice(1, tokenB.length)) : 0);
        }
    } else {
        return Math.max(scoreToken(tokenA[0], tokenB),
            tokenA.length ? decreaseNamePlace * scoreToken(tokenA.slice(1, tokenA.length), tokenB) : 0);
    }
}

const levNormScore = (tokenA: string, tokenB: string): number => {
    if (!tokenA || !tokenB) { return 0 }
    if (tokenA === tokenB) {
        return 1
    } else {
        if (tokenA.length < tokenB.length) {
            return levNormScore(tokenB, tokenA)
        }
        return 1 - (levenshtein(normalize(tokenA), normalize(tokenB)) / tokenA.length);
    }
}

const scoreCity = (cityA: string|string[], cityB: string|string[]) => {
    if (typeof(cityA) === 'string') {
        if (typeof(cityB) === 'string') {
            return levNormScore(cityA, cityB);
        } else {
            return Math.max(cityB.map(city => levNormScore(cityA, city)));
        }
    } else {
        return Math.max(cityA.map(city => scoreCity(city, cityB)));
    }
}

const scoreLocation = (locA: Location, locB: Location) => {
    let score = [];
    score.unshift((locA.city ? ( locB.city ? scoreCity(locA.city, locB.city) : blindLocationScore ) : 1 )) ;
    score.unshift((locA.departmentCode
            ? (locB.departmentCode
                ? ((locA.departmentCode === locB.departmentCode) ? 1 : minLocationScore )
                : blindLocationScore )
            : 1));
    score.unshift((locA.country ? (locB.country ? levNormScore(locA.country, locB.country) : blindLocationScore ) : 1));
    return 0.01 * Math.round(score.reduce(multyiply) * 100);
}

const scoreDate= (dateRangeA: any, dateStringB: string): number => {
    return 0.01 * Math.round((scoreDateRaw(dateRangeA, dateStringB) ** 4) * 100);
}

const scoreDateRaw = (dateRangeA: any, dateStringB: string): number => {
    if (/^00000000$/.test(dateStringB) || !dateStringB) {
        return blindDateScore;
    }
    if (typeof(dateRangeA) === 'string') {
        if (isDateRange(dateRangeA)) {
            const dateArrayA = dateRangeA.split(/-/);
            if (dateArrayA[0] === dateArrayA[1]) {
                return scoreDateRaw(dateArrayA[0], dateStringB);
            }
            return ((dateArrayA[0] <= dateStringB) && (dateArrayA[2] >= dateStringB))
                ? uncertainDateScore
                : (/(^0000|0000$)/.test(dateStringB) ? uncertainDateScore : minDateScore);
        } else {
            if (dateStringB.startsWith("0000")) {
                return Math.min(uncertainDateScore * levNormScore(dateTransformMask(dateRangeA).substring(4,8),dateStringB.substring(4,8)));
            }
            if (dateStringB.endsWith("0000")) {
                return Math.min(uncertainDateScore * levNormScore(dateTransformMask(dateRangeA).substring(0,4),dateStringB.substring(0,4)));
            }
            return levNormScore(dateTransformMask(dateRangeA), dateStringB);
        }
    } else {
        return blindDateScore;
    }
};


const scoreSex = (sexA: any, sexB: string) => {
    return (sexA && sexB)
            ? ((sexA === sexB) ? 1 : minSexScore)
            : blindSexScore;
}

const scoreGeo = (latA, lonA, latB, lonB) => {
    return 0.01*Math.round(
        Math.max(0, 100/(100 + distance(latA, lonA, latB, lonB)))
    )
};

const distance = (lat1, lon1, lat2, lon2) => {
	if ((lat1 === lat2) && (lon1 === lon2)) {
		return 0;
	}
	else {
		const radlat1 = Math.PI * lat1/180;
		const radlat2 = Math.PI * lat2/180;
		const theta = lon1-lon2;
		const radtheta = Math.PI * theta/180;
		let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
		if (dist > 1) {
			dist = 1;
		}
		dist = Math.acos(dist) * 6370.693486;
		return dist;
	}
}