import { RequestBody } from './models/requestInput';
import { Person, Location, Name, RequestField } from './models/entities';
import levenshtein from 'js-levenshtein';
import moment from 'moment';
import { dateTransformMask, isDateRange } from './masks';
import soundex from '@thejellyfish/soundex-fr';

const perfectScoreThreshold = 0.95;
const multiplePerfectScorePenalty = 0.8;
const secondaryCandidatePenaltyPow = 1.5;
const secondaryCandidateThreshold = 0.5;

const tokenPlacePenalty = 0.7;
const blindTokenScore = 0.5;

const nameInversionPenalty = 0.7;
const stopNamePenalty = 0.8;
const minNameScore = 0.1;
const blindNameScore = 0.5;
const lastNamePenalty = 3

const minSexScore = 0.5;
const firstNameSexPenalty = 0.75;
const blindSexScore = 1;

const minDateScore = 0.2;
const blindDateScore = 0.8;
const uncertainDateScore = 0.7;
const datePenalty = 3

const minLocationScore = 0.2;
const minDepScore = 0.8;
const minNotFrCityScore = 0.5;
const minNotFrCountryScore = 0.5;
const blindLocationScore = 0.7;

const boostSoundex = 1.5;

const pruneScore = 0.25;

const multyiply = (a:number, b: number): number => a*b;
const max = (a:number, b: number): number => Math.max(a*b);
const sum = (a:number, b: number): number => a+b;
const mean = (table: number[]): number => (table.length ? table.reduce(sum)/table.length : 0);

const normalize = (token: string|string[]): string|string[] => {
    if ((token === undefined) || (token === null)) {
        return '';
    }
    if (typeof(token) === 'string') {
        return token.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g,' ').replace(/^\s*$/,'');
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
        return 0.01 * Math.round(100 * score.score);
    } else {
        const r:any = Object.keys(score).map(k => {
            if (typeof(score[k]) === 'number') {
                return  0.01 * Math.round(100 * score[k]);
            } else {
                return  0.01 * Math.round(100 * score[k].score) || scoreReduce(score[k]);
            }
        });
        return r.length ? 0.01 * Math.round(100 * r.reduce(multyiply)) : 0;
    }
}

export const scoreResults = (request: RequestBody, results: Person[], dateFormat: string): Person[] => {
    let maxScore = 0;
    let perfectScoreNumber = 0;
    const resultsWithScores: any = results
            .filter((result:any) => result.score > 0)
            .map((result:any) => {
                try {
                    result.scores = new ScoreResult(request, result, dateFormat);
                    result.scores.score =  0.01 * Math.round(100 * scoreReduce(result.scores) ** (3/(Object.keys(result.scores).length || 1)));
                } catch(err) {
                    result.scores = {};
                }
                result.scores.es = 0.005 * Math.round(Math.min(200, result.score));
                result.score = (result.scores.score !== undefined) ?  0.01 * Math.round(100 * result.scores.score) : result.scores.es;
                if (result.score > maxScore) { maxScore = result.score }
                if (result.score >= perfectScoreThreshold) { perfectScoreNumber++ }
                return result;
            })
            .filter((result: any) => result.score >= pruneScore)
            .sort((a: any, b: any) => (a.score < b.score) ? 1 : ( (a.score > b.score) ? -1 : 0 ))
            .map((result: any) => {
                if (perfectScoreNumber) {
                    if (result.score < perfectScoreThreshold) {
                        result.score = 0.01 * Math.round(100 * (
                            ((perfectScoreNumber > 1) ? multiplePerfectScorePenalty : 1) * result.score ** secondaryCandidatePenaltyPow)
                        );
                        if (result.score < secondaryCandidateThreshold) {
                            result.score = 0;
                        };
                    } else {
                        if (perfectScoreNumber > 1) {
                            result.score = result.score * multiplePerfectScorePenalty;
                        }
                    }
                }
                return result;
            })
            .filter((result: any) => result.score >= pruneScore);
    return resultsWithScores;
}

export class ScoreResult {
  score: number;
  date?: number
  name?: number;
  sex?: number;
  location?: number;

  constructor(request: RequestBody, result: Person, dateFormat?: string) {
    if (request.birthDate) {
      this.date = scoreDate(request.birthDate, result.birth.date, dateFormat);
    }
    if (request.firstName || request.lastName) {
      if ((pruneScore < scoreReduce(this)) || !this.date) {
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
    } else if (request.firstName && firstNameSexMismatch(request.firstName, result.name.first as string)) {
        this.sex = firstNameSexPenalty;
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
    [/(^|\s)de (los|la)\s+/,'$1'],
    [/(^|\s)(du|de|l|d|dos|del|le|el)\s+/, '$1'],
    [/\s+(du|de la|des|de|le|aux|de los|del|l|d)\s+/,' '],
    [/(^|\s)st\s+/, '$1saint ']
];

const filterStopNames = (name: string|string[]): string|string[] => {
    return applyRegex(name, stopNames);
}

const firstNameSexMismatch = (firstNameA: string, firstNameB: string): boolean => {
    let firstA = tokenize(normalize(firstNameA as string|string[]), true);
    firstA = typeof(firstA) === 'string' ? firstA : (firstA as string[])[0];
    let firstB = tokenize(normalize(firstNameB as string|string[]), true);
    firstB = typeof(firstB) === 'string' ? firstB : (firstB as string[])[0];
    return /.?e/.test(firstA.replace(firstB, '')) || /.?e/.test(firstB.replace(firstA, ''));
}

const scoreName = (nameA: Name, nameB: Name): number => {
    if ((!nameA.first && !nameA.last) || (!nameB.first && !nameB.last)) { return blindNameScore }
    let score = 0;
    const firstA = tokenize(normalize(nameA.first as string|string[]), true);
    let lastA = tokenize(normalize(nameA.last as string|string[]));
    const firstB = tokenize(normalize(nameB.first as string|string[]), true);
    let lastB = tokenize(normalize(nameB.last as string|string[]));

    const scoreFirst = scoreToken(firstA, firstB as string|string[]);
    score = 0.01 * Math.round(100*
        Math.max(
            Math.max(
                scoreFirst * (scoreToken(lastA, lastB as string) ** lastNamePenalty),
                nameInversionPenalty * (scoreToken(firstA, lastB as string) ** lastNamePenalty) * scoreToken(lastA, firstB as string|string[]) ** lastNamePenalty
            ),
        minNameScore
    ));

    if (score === 1) return 1;

    lastA = tokenize(filterStopNames(normalize(nameA.last as string|string[])));
    lastB = tokenize(filterStopNames(normalize(nameB.last as string|string[])));

    return Math.max(
        score,
        stopNamePenalty * (0.01 * Math.round(100*
            Math.max(
                Math.max(
                    scoreFirst * (scoreToken(lastA, lastB as string) ** lastNamePenalty),
                    nameInversionPenalty * (scoreToken(firstA, lastB as string) ** lastNamePenalty) * scoreToken(lastA, firstB as string|string[]) ** lastNamePenalty
                ),
            minNameScore
        )))
    );
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
                            ? (option === 'any' ? 1 : tokenPlacePenalty) * tokenB.slice(1, tokenB.length).map(token => fuzzyScore(tokenA, token)).reduce(max) : 0
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
    [ /hollande/, 'pays-bas'],
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
    if (locB.country && (scoreCountry('FRANCE', locB.country as string|string[]) === 1)) {
        if (normalize(locA.country as string|string[])) {
            score.country = scoreCountry(locA.country, tokenize(locB.country as string) as string|string[]);
        }
        if (normalize(locA.city as string|string[]) && locB.city) {
            score.city = scoreCity(locA.city, locB.city as string|string[]);
        }
        if (normalize(locA.departmentCode as string|string[]) && locB.departmentCode) {
            if (locB.country && (scoreCountry('FRANCE', locB.country as string|string[]) === 1)) {
                score.department = (locA.departmentCode === locB.departmentCode) ? 1 : minDepScore;
            }
        }
        score.score = (score.country || score.city || score.department) ? Math.max(minLocationScore, scoreReduce(score)) : blindLocationScore;
    } else {
        if (normalize(locA.country as string|string[])) {
            score.country = scoreCountry(locA.country, tokenize(locB.country as string) as string|string[]);
        } else {
            if (normalize(locA.city as string|string[])) {
                const sCountry = scoreCountry(locA.city, tokenize(locB.country as string) as string|string[]);
                if (sCountry > minNotFrCountryScore) {
                    score.country = sCountry;
                }
            } else {
                score.country = blindLocationScore;
            }
        }
        if (normalize(locA.city as string|string[]) && locB.city) {
            const sCity = scoreCity(locA.city, tokenize(locB.city) as string|string[]);
            if (sCity > minNotFrCityScore) { score.city = sCity; }
        }
        score.score = Math.max(minNotFrCountryScore, score.country, scoreReduce(score));
    }
    return score;
}

const scoreDate = (dateRangeA: any, dateStringB: string, dateFormat: string): number => {
  if (dateFormat) {
    dateRangeA = moment(dateRangeA.toString(), dateFormat).format("YYYYMMDD");
  }
  return 0.01 * Math.round((scoreDateRaw(dateRangeA, dateStringB) ** datePenalty) * 100);
}

const scoreDateRaw = (dateRangeA: any, dateStringB: string): number => {
    if (/^00000000$/.test(dateStringB) || !dateStringB || !dateRangeA) {
        return blindDateScore;
    }
    if (typeof(dateRangeA) === 'string') {
        if (/^\s*$/.test(dateRangeA)) {
            return blindDateScore;
        }
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
