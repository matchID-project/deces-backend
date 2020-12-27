import { RequestBody } from './models/requestInput';
import { Person, Location, Name, RequestField } from './models/entities';
import levenshtein from 'js-levenshtein';
import jw from 'jaro-winkler';
import fuzz from 'fuzzball';
import moment from 'moment';
import { dateTransformMask, isDateRange } from './masks';
import soundex from '@thejellyfish/soundex-fr';

const perfectScoreThreshold = 0.7;
const multiplePerfectScorePenalty = 0.9;
const multipleErrorPenalty = 0.8;
const secondaryCandidatePenaltyPow = 1.5;
const secondaryCandidateThreshold = 0.5;

const tokenPlacePenalty = 0.7;
const blindTokenScore = 0.5;

const nameInversionPenalty = 0.7;
const jwPenalty = 1.5;
const stopNamePenalty = 0.8;
const minNameScore = 0.1;
const blindNameScore = 0.5;
const lastNamePenalty = 2;

const minSexScore = 0.5;
const firstNameSexPenalty = 0.75;
const blindSexScore = 1;

const minDateScore = 0.2;
const blindDateScore = 0.8;
const uncertainDateScore = 0.7;
const datePenalty = 3

const minLocationScore = 0.2;
const boroughLocationPenalty = 0.85;
const minDepScore = 0.85;
const minNotFrCityScore = 0.5;
const minNotFrCountryScore = 0.5;
const blindLocationScore = 0.7;

const boostSoundex = 1.5;

const pruneScore = 0.3;

const multyiply = (a:number, b: number): number => a*b;
const max = (a:number, b: number): number => Math.max(a*b);
const sum = (a:number, b: number): number => a+b;
const mean = (table: number[]): number => (table.length ? table.reduce(sum)/table.length : 0);

const normalize = (token: string|string[]): string|string[] => {
    if ((token === undefined) || (token === null)) {
        return '';
    }
    if (typeof(token) === 'string') {
        return token.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g,' ').replace(/^\s*$/,'');
    } else {
        return token.map(t => normalize(t) as string);
    }
}

const fuzzyScore = (tokenA: string, tokenB: string, option?: any): number => {
    const compare = option || levNormScore;
    if (!tokenA || !tokenB) {
        return 0;
    }
    const a:string = normalize(tokenA) as string;
    const b:string = normalize(tokenB) as string;
    if (a === b) {return 1}
    const s = 0.01 * Math.round(
        100 * ((compare(a, b)) ** ((soundex(a) === soundex(b)) ? (1/boostSoundex) : boostSoundex ** 2) )
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

const fuzzSetRatio = (a: string, b: string) => {
    return 0.01 * fuzz.token_set_ratio(a,b);
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
    if (!score) {
        return 0;
    }
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
        return r.length ? (0.01 * Math.round(100 * r.reduce(multyiply) ** ( multipleErrorPenalty * ( 2 - (r.filter((s: number) => s === 1).length)/r.length)))) : 0;
    }
}

export const scoreResults = (request: RequestBody, results: Person[], dateFormat: string): Person[] => {
    let maxScore = 0;
    let perfectScoreNumber = 0;
    let filteredResultsNumber = 0;
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
            .map((result: any) => { filteredResultsNumber++; return result })
            .sort((a: any, b: any) => (a.score < b.score) ? 1 : ( (a.score > b.score) ? -1 : 0 ))
            .map((result: any) => {
                if (perfectScoreNumber > 0) {
                    if (result.score < perfectScoreThreshold) {
                        result.score = 0.01 * Math.round(100 * (
                            ((perfectScoreNumber > 1) ? multiplePerfectScorePenalty : 1) * result.score ** (secondaryCandidatePenaltyPow + (filteredResultsNumber - perfectScoreNumber))
                        ));
                    } else {
                        if (perfectScoreNumber > 1) {
                            result.score = result.score * multiplePerfectScorePenalty;
                        }
                    }
                    if (result.score < secondaryCandidateThreshold) {
                        result.score = 0;
                    }
                } else {
                    if (filteredResultsNumber > 1) {
                        result.score = 0.01 * Math.round(100 * (
                            result.score ** (secondaryCandidatePenaltyPow - 2 + filteredResultsNumber)
                        ));
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
        if (result.sex && result.sex === 'F') {
          this.name = scoreName({first: request.firstName, last: [request.lastName, request.legalName]}, result.name, 'F');
        } else {
          this.name = scoreName({first: request.firstName, last: request.lastName}, result.name, 'M');
        }
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
    // location
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
    return /^.?(e|a)$/.test(firstA.replace(firstB, '')) || /^.?(e|a)$/.test(firstB.replace(firstA, ''));
}

const scoreName = (nameA: Name, nameB: Name, sex: string): any => {
    if ((!nameA.first && !nameA.last) || (!nameB.first && !nameB.last)) { return blindNameScore }
    let score:any;
    const firstA = tokenize(normalize(nameA.first as string|string[]), true);
    const lastA = tokenize(normalize(nameA.last as string|string[]));
    const firstB = tokenize(normalize(nameB.first as string|string[]), true);
    const lastB = tokenize(normalize(nameB.last as string|string[]));
    let firstFirstA; let firstFirstB; let scoreFirstALastB; let fuzzScore;
    const scoreFirst = 0.01 * Math.round(100 * scoreToken(firstA, firstB as string|string[]));
    const scoreLast = 0.01 * Math.round(100 * scoreToken(lastA, lastB as string|string[]));
    score = 0.01 * Math.round(100*
            Math.max(
                scoreFirst * (scoreLast ** lastNamePenalty),
                Math.max(
                    /* missing first name */
                    (!nameA.first || !nameB.last) ? (scoreLast ** lastNamePenalty) * (blindNameScore ** 2): 0,
                    /* wrong last name, give a chance for legal Name */
                    scoreFirst * blindNameScore ** (sex === 'F' ? 1 : lastNamePenalty)
                )
            ),
          );
    if (score < blindNameScore) {
        if ( ((scoreFirst >= blindNameScore) || (scoreLast >= blindNameScore))
            && (Array.isArray(lastA) || Array.isArray(lastB)) && (Array.isArray(firstA) || Array.isArray(firstB)) ) {
            // backoff to fuzzball set ratio for complex names situations
            const partA = lastA.toString()+" "+firstA.toString();
            const partB = lastB.toString()+" "+firstB.toString();
            fuzzScore = 0.01 * Math.round(100 *
                (tokenPlacePenalty * fuzzyScore(partA, partB , fuzzSetRatio) ** jwPenalty)
            );
            if (fuzzScore > blindNameScore) {
                score = Math.max(
                    score,
                    fuzzScore
                );
            }
        }
        // first / last name inversion
        firstFirstA = Array.isArray(firstA) ? firstA[0] : firstA ;
        scoreFirstALastB = scoreToken(firstFirstA as string, lastB as string);
        if (scoreFirstALastB >= blindNameScore) {
            firstFirstB = Array.isArray(firstB) ? firstB[0] : firstB ;
            score = Math.max(
                score,
                Math.max(
                    minNameScore,
                    nameInversionPenalty * (scoreFirstALastB ** lastNamePenalty) * scoreToken(lastA, firstFirstB as string) ** lastNamePenalty
                )
            );
        }
    }
    score = { score, first: scoreFirst, last: scoreLast };
    if (fuzzScore) { score.fuzz = fuzzScore}
    if (score.score === 1) return score;

    // give a chance to particle names
    const lastStopA = tokenize(filterStopNames(normalize(nameA.last as string|string[])));
    const lastStopB = tokenize(filterStopNames(normalize(nameB.last as string|string[])));

    if ((lastA !== lastStopA) && (lastB !== lastStopB)) {
        score.score = Math.max(
            score,
            stopNamePenalty * (0.01 * Math.round(100*
                scoreFirst * (scoreToken(lastStopA, lastStopB as string) ** lastNamePenalty)
            )));
        if (score.score < blindNameScore) {
            firstFirstA = firstFirstA || (Array.isArray(firstA) ? firstA[0] : firstA);
            scoreFirstALastB = scoreToken(firstFirstA, lastStopB as string);
            if (scoreFirstALastB >= blindNameScore) {
                firstFirstB = firstFirstB || (Array.isArray(firstB) ? firstB[0] : firstB);
                score.score = Math.max(
                    score,
                    stopNamePenalty * (0.01 * Math.round(100*
                        nameInversionPenalty * (scoreFirstALastB ** lastNamePenalty) * scoreToken(lastStopB, firstFirstB as string|string[]) ** lastNamePenalty
                    )));
            }
        }
    }
    return score;
}

const scoreToken = (tokenA: string|string[]|RequestField, tokenB: string|string[], option?: any): number => {
    let s:number;
    try {
        if (!tokenA || !tokenB) {
            s = blindTokenScore;
        } else {
            if (typeof(tokenA) === 'string') {
                if (typeof(tokenB) === 'string') {
                    if (tokenA === tokenB) {
                        s = 1;
                    } else {
                        s = fuzzyScore(tokenA, tokenB, option);
                    }
                } else {
                    s = Math.max(
                        fuzzyScore(tokenA, tokenB[0], option),
                        ( tokenB.length > 1 )
                            ? tokenPlacePenalty * tokenB.slice(1, tokenB.length).map(token => fuzzyScore(tokenA, token, option)).reduce(max) : 0
                    );
                }
            } else {
                if (typeof(tokenB) === 'string') {
                    s = scoreToken(tokenB, tokenA as string|string[], option);
                } else {
                    // if both tokenA and tokenB are arrays
                    // compare field by field, first field error lead to greater penalty (cf ** (1/(i+1)))
                    let min = blindNameScore;
                    s = mean((tokenA as string[]).filter((token,i) => (i<tokenB.length))
                        .map((token, i) => {
                        const current = tokenB[i] ? fuzzyScore(token, tokenB[i],option) ** (1/(i+1)) : min;
                        if (min > current) { min = current }
                        return current;
                    }))
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

const bouroughRegExp = /^.*0?([1-9]?\d).*$/;

const extractBouroughNumber = (city: string): string => {
    return city.replace(bouroughRegExp, '$1');
}

const cityNorm = (city: string|string[]): string|string[] => {
    return applyRegex(city, cityRegExp);
}

const scoreCity = (cityA: string|string[]|RequestField, cityB: string|string[]): number => {
    if (typeof(cityA) === 'string') {
        const cityNormA = cityNorm(cityA) as string;
        const cityNormB = cityNorm(cityB);
        let score;
        if (typeof(cityNormB) === 'string') {
            score = fuzzyScore(cityNormA, cityNormB as string, jw);
        } else {
            score = Math.max(...cityNormB.map(city => fuzzyScore(cityNormA, city as string,jw)));
        }
        if ((score === 1) && Array.isArray(cityNormB) && cityNorm(cityNormB[0]) === 'paris') {
            if (extractBouroughNumber(cityA) !== extractBouroughNumber(cityB[1])) {
                return boroughLocationPenalty;
            }
        }
        return score;
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
                score.department = (locA.departmentCode === locB.departmentCode) ? 1 :
                    ( ( (score.city === 1) && (locB.departmentCode === '75') && (['78','91','92','93','94','95'].indexOf(locA.departmentCode as string)) ) ? 1 : minDepScore);
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
            ? ((sexA.replace(/^(H).*$/,'M') === sexB) ? 1 : minSexScore)
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
