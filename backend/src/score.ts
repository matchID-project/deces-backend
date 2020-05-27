import { RequestInput } from './models/requestInput';
import { Person, Location, Name, RequestField } from './models/entities';
import levenshtein from 'js-levenshtein';
import { dateTransformMask, isDateRange } from './masks';
import soundex from '@thejellyfish/soundex-fr';

const decreaseTokenPlace = 0.7;
const blindTokenScore = 0.5;

const decreaseNameInversion = 0.7;
const minNameScore = 0.1;
const blindNameScore = 0.5;
const lastNamePenalty = 3

const minSexScore = 0.5;
const blindSexScore = 1;

const minDateScore = 0.2;
const blindDateScore = 0.8;
const uncertainDateScore = 0.7;

const minLocationScore = 0.2;
const minDepScore = 0.6;

const boostSoundex = 1.5;

const pruneScore = 0.25;

const multyiply = (a:number, b: number): number => a*b;
const max = (a:number, b: number): number => Math.max(a*b);
const sum = (a:number, b: number): number => a+b;
const mean = (table: number[]): number => (table.length ? table.reduce(sum)/table.length : 0);

const normalize = (token: string): string => {
    return token.normalize('NFKD').replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

const fuzzyScore = (tokenA: string, tokenB: string): number => {
    if (!tokenA || !tokenB) {
        return 0;
    }
    const a:string = normalize(tokenA);
    const b:string = normalize(tokenB);
    // console.log(a,b);
    if (a === b) {return 1}
    const s1 = levNormScore(a, b);
    const s2 = (soundex(a) === soundex(b));
    const s = 0.01 * Math.round(
        100 * (levNormScore(a, b) ** ((soundex(a) === soundex(b)) ? (1/boostSoundex) : boostSoundex ** 2) )
    );
    // console.log('fuzzyScore',a,b,s,s1,s2);
    return s;
};

const levNormScore = (tokenA: string, tokenB: string): number => {
    if (!tokenA || !tokenB) { return 0 }
    if (tokenA === tokenB) {
        return 1
    } else {
        if (tokenA.length < tokenB.length) {
            return levNormScore(tokenB, tokenA)
        }
        return 0.01 * Math.round(100 * (1 - (levenshtein(normalize(tokenA), normalize(tokenB)) / tokenA.length)));
    }
}

const applyRegex = (a: string|string[], reTable: any): string|string[] => {
    if (typeof(a) === 'string') {
        let b = normalize(a);
        reTable.map(r => b = b.replace(r[0], r[1]));
        return b;
    } else {
        return a.map(c => applyRegex(c, reTable) as string);
    }
}

const tokenize = (sentence: string|string[]|RequestField): string|string[]|RequestField => {
    if (typeof(sentence) === 'string') {
        const s = sentence.split(/,\s*|\s+/);
        return s.length === 1 ? s[0] : s ;
    } else {
        // dont tokenize if string[]
        return sentence as string[];
    }
}


const scoreReduce = (score:any):number => {
    if (score.score) {
        return score.score;
    } else {
        const r:any = Object.keys(score).map(k => {
            if (typeof(score[k]) === 'number') {
                return score[k];
            } else {
                return score[k].score || scoreReduce(score[k]);
            }
        });
        return 0.01 * Math.round(100 * r.reduce(multyiply));
    }
}

export const scoreResults = (request: RequestInput, results: any): any => {
    return results
            .filter(result => result.score > 0)
            .map(result => {
                try {
                    result.scores = scoreResult(request, result);
                    result.scores.score = scoreReduce(result.scores) ** (3/(Object.keys(result.scores).length || 1));
                } catch(err) {
                    // console.log(err);
                    result.scores = {};
                }
                result.scores.es = 0.005 * Math.round(Math.min(200, result.score));
                result.score = (result.scores.score !== undefined) ? result.scores.score : result.scores.es;
                // console.log(result.score, result.scores);
                return result;
            })
            .filter((result: any) => result.score >= pruneScore)
            .sort((a: any, b: any) => (a.score < b.score) ? 1 : ( (a.score > b.score) ? -1 : 0 ))
            // .map(r =>y, b: any) => (a.score < b.score) ? 1 : ( (a.score > b.score) ? -1 : 0 ))
}

const scoreResult = (request: RequestInput, result: Person): any => {
    const score:any = {};
    if (request.birthDate) {
        score.date = scoreDate(request.birthDate, result.birth.date);
        if (pruneScore > scoreReduce(score)) { score.score = 0; return score }
    }
    if (request.firstName || request.lastName) {
        score.name = scoreName({first: request.firstName, last: request.lastName}, result.name);
        // console.log('name', score.name, {first: request.firstName, last: request.lastName}, result.name);
        if (pruneScore > scoreReduce(score)) { score.score = 0; return score }
    }
    if (request.sex) {
        score.sex = scoreSex(request.sex, result.sex);
        if (pruneScore > scoreReduce(score)) { score.score = 0; return score }
    }
    if (request.birthCity || request.birthCityCode || request.birthDepartment || request.latitude || request.longitude) {
        score.location = scoreLocation({
            city: request.birthCity,
            cityCode: request.birthCityCode,
            departmentCode: request.birthDepartment,
            country: request.birthCountry,
            latitude: request.latitude,
            longitude: request.longitude
        }, result.birth.location);
        if (pruneScore > scoreReduce(score)) { score.score = 0; return score }
    }
    score.score = scoreReduce(score);
    return score;
}

export const stopNames = [
    [/(^|\s)(le|du|de|de la|l|d|de los|dos|del|el)\s/, '$1 $2'],
    [/st/, 'saint']
];

const filterStopNames = (name: string|string[]): string|string[] => {
    return applyRegex(name, stopNames);
}

const scoreName = (nameA: Name, nameB: Name): number => {
    if ((!nameA.first && !nameA.last) || (!nameB.first && !nameB.last)) { return blindNameScore }
    const firstA = tokenize(nameA.first);
    const lastA = tokenize(filterStopNames(nameA.last as string|string[]));
    const firstB = tokenize(nameB.first);
    const lastB = tokenize(filterStopNames(nameB.last as string|string[]));

    // console.log('scoreName',nameA, firstA, lastA, nameB, firstB, lastB,
    //     scoreToken(firstA, firstB as string|string[]),
    //     scoreToken(lastA, lastB as string),
    //     scoreToken(firstA, lastB as string),
    //     scoreToken(lastA, firstB as string|string[])
    //     );

    return (0.01 * Math.round(100*
        Math.max(
            Math.max(
                (scoreToken(firstA, firstB as string|string[])) * (scoreToken(lastA, lastB as string) ** lastNamePenalty),
                decreaseNameInversion * (scoreToken(firstA, lastB as string) ** lastNamePenalty) * scoreToken(lastA, firstB as string|string[]) ** lastNamePenalty
            ),
        minNameScore
    )));
}

const scoreToken = (tokenA: string|string[]|RequestField, tokenB: string|string[], option: string): number => {
    // console.log('scoreToken before', tokenA, tokenB)
    let s:number;
    try {
        if (!tokenA || !tokenB) {
            s = blindTokenScore
        } else {
            if (typeof(tokenA) === 'string') {
                if (typeof(tokenB) === 'string') {
                    // console.log('scoreToken string string', tokenA, tokenB);
                    s = fuzzyScore(tokenA, tokenB);
                } else {
                    // console.log('scoreToken string to string[]', tokenA, tokenB);
                    s = Math.max(
                        fuzzyScore(tokenA, tokenB[0]),
                        ( tokenB.length > 1 )
                            ? (option === 'any' ? 1 : decreaseTokenPlace) * tokenB.slice(1, tokenB.length).map(token => fuzzyScore(tokenA, token)).reduce(max) : 0
                    );
                }
            } else {
                if (typeof(tokenB) === 'string') {
                    // console.log('scoreToken string[] string', tokenA, tokenB);
                    s = scoreToken(tokenB, tokenA, option);
                } else {
                    // if both tokenA and tokenB are arrays
                    // console.log('scoreToken string[] string[]', tokenA, tokenB);
                    if (option === 'any') {
                        s = (tokenA as string[]).map(a => tokenB.map(b => fuzzyScore(a,b)).reduce(max)).reduce(max);
                    } else {
                    // compare field by field
                        let min = 1
                        s = mean((tokenA as string[]).map((token, i) => {
                            const current = tokenB[i] ? fuzzyScore(token, tokenB[i]) : min;
                            if (min > current) { min = current }
                            return current;
                        }))
                    }
                }
            }
        }
    } catch(err) {
        s = err;
    }
    // console.log('scoreToken after', tokenA, tokenB, s);
    return s;
}

const tokenize = (sentence: string|string[]|RequestField): string|string[]|RequestField => {
    if (typeof(sentence) === 'string') {
        return sentence.split(/\s+/);
    } else {
        // dont tokenize if string[]
        return sentence as string[];
    }
}

const scoreToken = (tokenA: string|string[]|RequestField, tokenB: string|string[]): number => {
    if (!tokenA || !tokenB) {return minNameScore}
    if (typeof(tokenA) === 'string') {
        if (typeof(tokenB) === 'string') {
            return levNormScore(tokenA, tokenB);
        } else {
            return Math.max(levNormScore(tokenA, tokenB[0]),
                tokenB.length ? decreaseNamePlace * scoreToken(tokenA, tokenB.slice(1, tokenB.length)) : 0);
        }
    } else {
        return Math.max(scoreToken((tokenA as string[])[0], tokenB),
            (tokenA as string[]).length ? decreaseNamePlace * scoreToken((tokenA as string[]).slice(1, (tokenA as string[]).length), tokenB) : 0);
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

const scoreCity = (cityA: string|string[]|RequestField, cityB: string|string[]): number => {
    if (typeof(cityA) === 'string') {
        if (typeof(cityB) === 'string') {
            return levNormScore(cityA, cityB);
        } else {
            return Math.max(...cityB.map(city => levNormScore(cityA, city)));
        }
    } else {
        return Math.max(...(cityA as string[]).map(city => scoreCity(city, cityB)));
    }
}

const scoreLocation = (locA: Location, locB: Location): number => {
    const score = [];
    score.unshift((locA.city ? ( locB.city ? scoreCity(locA.city, locB.city as string|string[]) : blindLocationScore ) : 1 )) ;
    score.unshift((locA.departmentCode
            ? (locB.departmentCode
                ? ((locA.departmentCode === locB.departmentCode) ? 1 : minLocationScore )
                : blindLocationScore )
            : 1));
    score.unshift((locA.country ? (locB.country ? levNormScore(locA.country as string, locB.country as string) : blindLocationScore ) : 1));
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


const scoreSex = (sexA: any, sexB: string): number => {
    return (sexA && sexB)
            ? ((sexA === sexB) ? 1 : minSexScore)
            : blindSexScore;
}

const scoreGeo = (latA: number, lonA: number, latB: number, lonB: number): number => {
    return 0.01*Math.round(
        Math.max(0, 100/(100 + distance(latA, lonA, latB, lonB)))
    )
};

const distance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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
