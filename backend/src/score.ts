import { RequestBody } from './models/requestInput';
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
const datePenalty = 3

const minLocationScore = 0.2;
const minDepScore = 0.6;
const minNotFrCityScore = 0.4;

const boostSoundex = 1.5;

const pruneScore = 0.25;

const multyiply = (a:number, b: number): number => a*b;
const max = (a:number, b: number): number => Math.max(a*b);
const sum = (a:number, b: number): number => a+b;
const mean = (table: number[]): number => (table.length ? table.reduce(sum)/table.length : 0);

const normalize = (token: string|string[]): string|string[] => {
    if (typeof(token) === 'string') {
        return token.normalize('NFKD').replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ');
    } else {
        return token.map(t => normalize(t) as string);
    }
}

const fuzzyScore = (tokenA: string, tokenB: string): number => {
    if (!tokenA || !tokenB) {
        return 0;
    }
    const a:string = normalize(tokenA) as string;
    const b:string = normalize(tokenB) as string;
    if (a === b) {return 1}
    const s = 0.01 * Math.round(
        100 * (levNormScore(a, b) ** ((soundex(a) === soundex(b)) ? (1/boostSoundex) : boostSoundex ** 2) )
    );
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
        return 0.01 * Math.round(100 * (1 - (levenshtein(normalize(tokenA) as string, normalize(tokenB) as string) / tokenA.length)));
    }
}

const applyRegex = (a: string|string[], reTable: any): string|string[] => {
    if (typeof(a) === 'string') {
        let b = normalize(a) as string;
        reTable.map((r:any) => b = b.replace(r[0], r[1]));
        return b;
    } else {
        return a.map(c => applyRegex(c, reTable) as string);
    }
}

const tokenize = (sentence: string|string[]|RequestField, tokenizeArray?: boolean): string|string[]|RequestField => {
    if (typeof(sentence) === 'string') {
        const s = sentence.split(/,\s*|\s+/);
        return s.length === 1 ? s[0] : s ;
    } else {
        if (tokenizeArray) {
            return ((sentence as string[]).map(s => tokenize(s)) as any).flat();
        } else {
            // default dont tokenize if string[]
            return sentence as string[];
        }

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
        return r.length ? 0.01 * Math.round(100 * r.reduce(multyiply)) : 0;
    }
}

export const scoreResults = (request: RequestBody, results: Person[]): Person[] => {
    return results
            .filter((result:any) => result.score > 0)
            .map((result:any) => {
                try {
                    result.scores = new ScoreResult(request, result);
                    result.scores.score = scoreReduce(result.scores) ** (3/(Object.keys(result.scores).length || 1));
                } catch(err) {
                    result.scores = {};
                }
                result.scores.es = 0.005 * Math.round(Math.min(200, result.score));
                result.score = (result.scores.score !== undefined) ? result.scores.score : result.scores.es;
                return result;
            })
            .filter((result: any) => result.score >= pruneScore)
            .sort((a: any, b: any) => (a.score < b.score) ? 1 : ( (a.score > b.score) ? -1 : 0 ))
            // .map(r =>y, b: any) => (a.score < b.score) ? 1 : ( (a.score > b.score) ? -1 : 0 ))
}

export class ScoreResult {
  score: number;
  date: number
  name?: number;
  sex?: number;
  location?: number;

  constructor(request: RequestBody, result: Person) {
    if (request.birthDate) {
      this.date = scoreDate(request.birthDate, result.birth.date);
    }
    if (request.firstName || request.lastName) {
      if (pruneScore < scoreReduce(this)) {
        this.name = scoreName({first: request.firstName, last: request.lastName}, result.name);
      } else {
        this.score = 0
      }
    }
    if (request.sex) {
      if (pruneScore < scoreReduce(this)) {
        this.sex = scoreSex(request.sex, result.sex);
      } else {
        this.score = 0
      }
    }
    if (request.birthCity || request.birthCityCode || request.birthDepartment || request.latitude || request.longitude) {
      if (pruneScore < scoreReduce(this)) {
        this.location = scoreLocation({
          city: request.birthCity,
          cityCode: request.birthCityCode,
          departmentCode: request.birthDepartment,
          country: request.birthCountry,
          latitude: request.latitude,
          longitude: request.longitude
        }, result.birth.location);
      } else {
        this.score = 0
      }
    }
    if (!this.score) {
      this.score = scoreReduce(this)
    }
  }
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
    const firstA = tokenize(normalize(nameA.first as string|string[]), true);
    const lastA = tokenize(filterStopNames(nameA.last as string|string[]));
    const firstB = tokenize(normalize(nameB.first as string|string[]), true);
    const lastB = tokenize(filterStopNames(nameB.last as string|string[]));

    return (0.01 * Math.round(100*
        Math.max(
            Math.max(
                (scoreToken(firstA, firstB as string|string[])) * (scoreToken(lastA, lastB as string) ** lastNamePenalty),
                decreaseNameInversion * (scoreToken(firstA, lastB as string) ** lastNamePenalty) * scoreToken(lastA, firstB as string|string[]) ** lastNamePenalty
            ),
        minNameScore
    )));
}

const scoreToken = (tokenA: string|string[]|RequestField, tokenB: string|string[], option?: string): number => {
    let s:number;
    try {
        if (!tokenA || !tokenB) {
            s = blindTokenScore
        } else {
            if (typeof(tokenA) === 'string') {
                if (typeof(tokenB) === 'string') {
                    s = fuzzyScore(tokenA, tokenB);
                } else {
                    s = Math.max(
                        fuzzyScore(tokenA, tokenB[0]),
                        ( tokenB.length > 1 )
                            ? (option === 'any' ? 1 : decreaseTokenPlace) * tokenB.slice(1, tokenB.length).map(token => fuzzyScore(tokenA, token)).reduce(max) : 0
                    );
                }
            } else {
                if (typeof(tokenB) === 'string') {
                    s = scoreToken(tokenB, tokenA as string|string[], option);
                } else {
                    // if both tokenA and tokenB are arrays
                    if (option === 'any') {
                        s = (tokenA as string[]).map(a => tokenB.map(b => fuzzyScore(a,b)).reduce(max)).reduce(max);
                    } else {
                    // compare field by field
                        let min = blindNameScore;
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
    return s;
}

const cityRegExp = [
    [ /^\s*(lyon|marseille|paris)(\s.*|\s*\d\d*.*|.*art.*|.*arr.*)$/, '$1'],
    [ /montreuil s.* bois/, 'montreuil'],
    [ /(^|\s)ste(\s|$)/, '$1sainte$2'],
    [ /(^|\s)st(\s|$)/, '$1saint$2'],
    [ /^aix pce$/, 'aix provence'],
    [ /(^|\s)(de|en|les|le|la|a|aux|au|du|de la|sous|ss?|sur|l|d|des)\s/g, ' '],
    [ /(^|\s)(de|en|les|le|la|a|aux|au|du|de la|sous|ss?|sur|l|d|des)\s/g, ' '],
    [ /^x$:/, ''],
    [ /\s+/, ' '],
    [ /œ/, 'oe'],
    [ /æ/, 'ae'],
    [ /^.*inconnu.*$/, ''],
    [ /sainte clotilde/, 'saint denis'],
    [ /berck mer/, 'berck'],
    [ /clichy garenne.*/, 'clichy'],
    [ /belleville saone/, 'belleville'],
    [ /^levallois$/, 'levallois perret'],
    [ /'\s$/, ''],
    [ /^\s*/, '']
];

const cityNorm = (city: string|string[]): string|string[] => {
    return applyRegex(city, cityRegExp);
}

const scoreCity = (cityA: string|string[]|RequestField, cityB: string|string[]): number => {
    if (typeof(cityA) === 'string') {
        const cityNormA = cityNorm(cityA) as string;
        if (typeof(cityB) === 'string') {
            return fuzzyScore(cityNormA, cityNorm(cityB) as string);
        } else {
            return Math.max(...cityB.map(city => fuzzyScore(cityNormA, cityNorm(city) as string)));
        }
    } else {
        const cityNormB = cityNorm(cityB);
        return Math.max(...(cityA as string[]).map(city => scoreCity(cityNorm(city), cityNormB)));
    }
}

const countryRegExp = [
    [ /(^|\s)(de|en|les|le|la|a|aux|au|du|de la|s|sous|sur|l|d|des)\s/g, ' '],
];

const countryNorm = (country: string|string[]): string|string[] => {
    return applyRegex(country, countryRegExp);
}

const scoreCountry = (countryA: string|string[]|RequestField, countryB: string|string[]): number => {
    if (typeof(countryA) === 'string') {
        const countryNormA = countryNorm(countryA) as string;
        if (typeof(countryB) === 'string') {
            return fuzzyScore(countryNormA, countryNorm(countryB) as string);
        } else {
            return Math.max(...countryB.map(country => fuzzyScore(countryNormA, countryNorm(country) as string)));
        }
    } else {
        const countryNormB = countryNorm(countryB);
        return Math.max(...(countryA as string[]).map(country => scoreCountry(countryNorm(country), countryNormB)));
    }
}


const scoreLocation = (locA: Location, locB: Location): any => {
    const score: any = {};
    if (locA.city && locB.city) {
        if (locB.country && (scoreCountry('FRANCE', locB.country as string|string[]) === 1)) {
            score.city = scoreCity(locA.city, locB.city as string|string[])
        } else {
            score.city = Math.max(minNotFrCityScore, scoreCity(locA.city, tokenize(locB.city) as string|string[]));
        }
    }
    if (locA.departmentCode && locB.departmentCode) {
        score.department = (locA.departmentCode === locB.departmentCode) ? 1 : minDepScore;
    }
    if (locA.country && locB.country) {
        score.country = scoreCountry(locA.country, tokenize(locB.country as string) as string|string[]);
    }
    score.score = Math.max(minLocationScore, scoreReduce(score));
    return score;
}

const scoreDate= (dateRangeA: any, dateStringB: string): number => {
    return 0.01 * Math.round((scoreDateRaw(dateRangeA, dateStringB) ** datePenalty) * 100);
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
