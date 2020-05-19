import { RequestInput, Name } from './models/requestInput';
import { Location } from './models/entities';
import levenshtein from 'js-levenshtein';
import { dateTransformMask, isDateRange } from './masks';

const decreaseNameInversion = 0.7;
const decreaseNamePlace = 0.5;
const minNameScore = 0.1;
const blindNameScore = 0.7;

const minSexScore = 0.5;
const blindSexScore = 0.9;

const minDateScore = 0.2;
const blindDateScore = 0.8;
const uncertainDateScore = 0.7;

const minLocationScore = 0.2;
const blindLocationScore = 0.7;

const pruneScore = 0.3;

export const scoreResults = (request: RequestInputs, results: any): any => {
    return results
            .filter((result: any) => result.score > 15)
            .map((result: any) => {
                result.score = scoreResult(request, result);
                return result;
            })
            .filter((result: any) => result.score > pruneScore)
            .sort((a: any, b: any) => (a.score < b.score) ? 1 : ( (a.score > b.score) ? -1 : 0 ))
}

const scoreResult = (request: RequestInput, result: any): number => {
    // console.log(request, result);
    let score = 1;
    score = score * scoreDate(request.birthDate, result.birth.date);
    if (pruneScore > score) return 0;
    score = score * scoreName({first: request.firstName, last: request.lastName}, result.name);
    if (pruneScore > score) return 0;
    score = score * scoreSex(request.sex, result.sex);
    if (pruneScore > score) return 0;
    score = score * scoreLocation({
        city: request.birthCity,
        cityCode: request.birthCityCode,
        departmentCode: request.birthDepartment,
        country: request.birthCountry,
        latitude: request.latitude,
        longitude: request.longitude
    }, result.birth.location);
    if (pruneScore > score) return 0;
    return 0.01 * Math.round(score * 100);
}

const scoreName = (nameA: Name, nameB: Name): number => {
    // console.log(nameA, nameB);
    return 0.01*Math.round(100*
        Math.max(scoreToken(nameA.first, nameB.first) * scoreToken(nameB.last, nameB.last),
        decreaseNameInversion * scoreToken(nameA.first, nameB.first) * scoreToken(nameB.last, nameB.last),
        (!nameA.first && !nameA.last) || (!nameB.first && !nameB.first) ? blindNameScore : minNameScore
    ));
}

const scoreToken = (tokenA: string|string[], tokenB: string|string[]): number => {
    if (typeof(tokenA) === 'string')
        if (typeof(tokenB) === 'string') {
            return levNormScore(tokenA, tokenB);
        } else {
            return Math.max(levNormScore(tokenA, tokenB.shift()),
                decreaseNamePlace * Math.max((tokenB).map((token: string) => levNormScore(tokenA, token)))
            );
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
        return 1 - (levenshtein(tokenA.normalize('NFKD').replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase(), tokenB.normalize('NFKD').replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase()) / tokenA.length);
    }
}

const scoreLocation = (locA: Location, locB: Location) => {
    let score = 1;
    score = score * (locA.city ? ( locB.city ? levNormScore(locA.city, locB.city) : blindLocationScore ) : 1 ) ;
    score = score * (locA.departmentCode
            ? (locB.departmentCode
                ? ((locA.departmentCode === locB.departmentCode) ? 1 : minLocationScore )
                : blindLocationScore )
            : 1);
    score = score * (locA.country ? (locB.country ? levNormScore(locA.country, locB.country) : blindLocationScore ) : 1);
    return 0.01 * Math.round(score * 100);
}

const scoreDate = (dateRangeA: any, dateStringB: string): number => {
    // console.log(dateRangeA, dateStringB);
    if (/^00000000$/.test(dateStringB) || !dateStringB) {
        return blindDateScore;
    }
    if (typeof(dateRangeA) === 'string') {
        if (isDateRange(dateRangeA)) {
            const dateArrayA = dateRangeA.split(/-/);
            if (dateArrayA[0] === dateArrayA[1]) {
                return scoreDate(dateArrayA[0], dateStringB);
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