import { RequestBody } from './models/requestInput';
import { Person, Location, Name, RequestField, ScoreParams } from './models/entities';
import { distance } from 'fastest-levenshtein';
import damlev from 'damlev';
import * as fuzz from "fuzzball";
import { dateTransformMask, isDateRange, isDateLimit, dateTransform } from './masks';
import soundex from '@jollie/soundex-fr';
import loggerStream from './logger';
import timer from './timer';
import { communesDict, cityNorm, applyRegex, normalize } from './communes';

const perfectScoreThreshold = 0.75;
const multipleMatchPenaltyMax = 0.5;
const multiplePerfectScorePenalty = 0.1;
const multipleBestScorePenalty = 0.15;
const secondaryCandidatePenaltyPow = 2;
const secondaryCandidateThreshold = 0.4;

const multipleErrorPenalty = 0.8;

const tokenPlacePenalty = 0.7;
const blindTokenScore = 0.5;

const nameInversionPenalty = 0.7;
const fuzzPenalty = 1.5;
const stopNamePenalty = 0.8;
const minNameScore = 0.1;
const blindNameScore = 0.5;
const wrongLastNamePenalty = {
    M: 0.1,
    F: 0.65
}
const lastNamePenalty = 1.5;

const minSexScore = 0.5;
const firstNameSexPenalty = 0.65;
const blindSexScore = 0.99;

const minDateScore = 0.2;
const blindDateScore = 0.85;
const uncertainDateScore = 0.95;
const datePenalty = 2.5;

const minLocationScore = 0.2;
const boroughLocationPenalty = 0.9;
const minCodeScore = 0.7;
const minDepScore = 0.7;
const minNotFrCityScore = 0.65;
const minCityCountrySwapScore = 0.6;
const minNotFrScore = 0.4;
const blindLocationScore = 0.75;

const boostSoundex = 1.5;

const defaultPruneScore = 0.3;

const multyiply = (a:number, b: number): number => a*b;
const max = (a:number, b: number): number => Math.max(a*b);
const sum = (a:number, b: number): number => a+b;
const mean = (table: number[]): number => (table.length ? table.reduce(sum)/table.length : 0);
const round = (s: number): number => parseFloat(s.toFixed(2));

const levRatio = (tokenA: string, tokenB: string, option?: any): number => {
    const lev = option || distance;
    if (!tokenA || !tokenB) { return 0 }
    if (tokenA === tokenB) {
        return 1
    }
    if (tokenA.length < tokenB.length) {
      return levRatio(tokenB, tokenA, option)
    }
    return round((1 - (lev(tokenA, tokenB) / tokenA.length)));
}

const fuzzyRatio = (tokenA: string, tokenB: string, option?: any): number => {
    const compare = option || levRatio;
    if (!tokenA || !tokenB) {
        return 0;
    }
    const a:string = normalize(tokenA) as string;
    const b:string = normalize(tokenB) as string;
    if (a === b) {return 1}
    let s = compare(a, b);
    if (s === 1) { return 1}
    if (! option) {
        s = s ** ((soundex(a) === soundex(b)) ? (1/boostSoundex) : boostSoundex );
    }
    return round(s);
};

const fuzzballPartialTokenSortRatio = (a: string, b: string): number => {
    return 0.01 * fuzz.token_sort_ratio(a,b);
}

export const fuzzballTokenSetRatio = (a: string, b: string): number => {
    return 0.01 * fuzz.token_set_ratio(a,b);
}

// const fuzzballRatio = (a: string, b: string) => {
//     return 0.01 * fuzz.ratio(a,b);
// }

const fuzzMixRatio = (a: string, b: string) => {
    if (Array.isArray(tokenize(a)) || Array.isArray(tokenize(b))) {
        return 0.01 * fuzz.token_set_ratio(a,b);
    }
    return levRatio(a,b);
}

const tokenize = (sentence: string|string[], tokenizeArray?: boolean): string|string[] => {
    if (typeof(sentence) === 'string') {
        const s = sentence.split(/,\s*|\s+/);
        return s.length === 1 ? s[0] : s ;
    }
    if (tokenizeArray && Array.isArray(sentence)) {
        return ((sentence).map(s => tokenize(s)) as any).flat();
    } else {
        // default dont tokenize if string[]
        return sentence;
    }
}

const scoreReduce = (score:any, multiplePenalty?: boolean ):number => {
    if (!score) {
        return 0;
    }
    if (score.score) {
        return round(score.score);
    } else {
        const r:any = Object.keys(score).filter(x => x !== 'explain').map(k => {
            if (typeof(score[k]) === 'number') {
                return  round(score[k]);
            } else {
                return  round(score[k].score) || scoreReduce(score[k], multiplePenalty);
            }
        });
        return r.length ?
            (round(r.reduce(multyiply) ** (multiplePenalty ?
                ( multipleErrorPenalty * ( 2 - (r.filter((s: number) => s >= perfectScoreThreshold).length)/r.length))
                : 1 )))
            : 0;
    }
}

const firstNameRegExp = [[/^(inconnu|spc?|sans prenom( connu)?|X+)$/,'']]

const firstNameNorm = (name: string|string[]): string|string[] => {
    return tokenize(applyRegex(name, firstNameRegExp), true);
}

const lastNameRegExp = [
    [/^(mr|mme|mlle|monsieur|madame|mademoiselle)\s+/,''],
    [/^(inconnu|snc?|sans nom( connu)?|X+)$/,'']
]

const lastNameNorm = (name: string|string[]): string|string[] => {
    return applyRegex(name, lastNameRegExp);
}

export const stopNames = [
    [/(^|\s)de (los|la)\s+/,'$1'],
    [/(^|\s)(baron|marquis|duc|vicomte|prince|chevalier)\s+/,'$1'],
    [/(^|\s)(ait|ben|du|de|l|d|dos|del|le|el)\s+/, '$1'],
    [/\s+(du|de la|des|de|le|aux|de los|del|l|d)\s+/,' '],
    [/(^|\s)st\s+/, '$1saint '],
    [/\s+dit\s+.*$/, '']
];

const filterStopNames = (name: string|string[]): string|string[] => {
    return applyRegex(name, stopNames);
}

const firstNameSexMismatch = (firstNameA: string, firstNameB: string): boolean => {
    let firstA = firstNameNorm(firstNameA);
    firstA = typeof(firstA) === 'string' ? firstA : (firstA)[0];
    let firstB = firstNameNorm(firstNameB);
    firstB = typeof(firstB) === 'string' ? firstB : (firstB)[0];
    return /^.?(e|a)$/.test(firstA.replace(firstB, '')) || /^.?(e|a)$/.test(firstB.replace(firstA, ''));
}

const updateObjProp = (obj = {}, key: any, val: any) => {
  if (obj === null) return
  const keys = key.split('.')
  const last = keys.pop()
  keys.reduce((o: any, k: any) => o[k] ??= {}, obj)[last] = val
  return obj
}

let scoreName = (nameA: Name, nameB: Name, sex: string, explain?: any): any => {
    if ((!nameA.first && !nameA.last) || (!nameB.first && !nameB.last)) { return blindNameScore }
    let score:any;
    const firstA = firstNameNorm(nameA.first as string|string[]);
    const lastA = lastNameNorm(nameA.last as string|string[]);
    const firstB = firstNameNorm(nameB.first as string|string[]);
    const lastB = lastNameNorm(nameB.last as string|string[]);
    const lastAtokens = tokenize(lastA);
    const lastBtokens = tokenize(lastB);
    // reduce lastNamePenalty for long names
    let thisLastNamePenalty;
    if ((Array.isArray(lastAtokens) && (lastAtokens.length > 2)) || (Array.isArray(lastBtokens) && (lastBtokens.length > 2))) {
      thisLastNamePenalty = 1
      updateObjProp(explain, 'lastName.longname', true)
      updateObjProp(explain, 'lastName.penalty', lastNamePenalty)
    } else {
      thisLastNamePenalty = lastNamePenalty
      updateObjProp(explain, 'lastName.longname', false)
      updateObjProp(explain, 'lastName.penalty', lastNamePenalty)
    }
    let firstFirstA; let firstFirstB; let scoreFirstALastB; let fuzzScore;
    const scoreFirst = round(scoreToken(firstA, firstB));
    const scoreLast = round(scoreToken(lastA, lastB));
    updateObjProp(explain, 'firstName.levenshteinScore', scoreFirst)
    updateObjProp(explain, 'lastName.levenshteinScore', scoreLast)
    score = round(Math.max(
                scoreFirst * (scoreLast ** thisLastNamePenalty),
                Math.max(
                    /* missing first name */
                    (!nameA.first || !nameB.last) ? (scoreLast ** thisLastNamePenalty) * (blindNameScore ** 2): 0,
                    /* wrong last name, give a chance for legal Name */
                    scoreFirst * wrongLastNamePenalty[sex as 'F'|'M']
                )
            ),
          );
    if (score < blindNameScore) {
        if ( ((scoreFirst >= blindNameScore) || (scoreLast >= blindNameScore))
            && (Array.isArray(lastAtokens) || Array.isArray(lastBtokens)) && (Array.isArray(firstA) || Array.isArray(firstB)) ) {
            // backoff to fuzzball set ratio for complex names situations
            const partA = filterStopNames(`${lastA !== undefined ? lastA.toString() : ''} ${firstA !== undefined ? firstA.toString() : ''}`);
            const partB = filterStopNames(`${lastB !== undefined ? lastB.toString() : ''} ${firstB !== undefined ? firstB.toString() : ''}`);
            fuzzScore = round((tokenPlacePenalty * fuzzyRatio(partA as string, partB as string , fuzzballPartialTokenSortRatio) ** fuzzPenalty)
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
        scoreFirstALastB = scoreToken(firstFirstA, lastB as string);
        if (scoreFirstALastB >= blindNameScore) {
            firstFirstB = Array.isArray(firstB) ? firstB[0] : firstB ;
            score = Math.max(
                score,
                Math.max(
                    minNameScore,
                    nameInversionPenalty * (scoreFirstALastB ** thisLastNamePenalty) * scoreToken(lastA, firstFirstB) ** thisLastNamePenalty
                )
            );
            updateObjProp(explain, 'firstName.nameSwap', true)
            updateObjProp(explain, 'lastName.nameSwap', true)
        }
    }
    score = { score, first: scoreFirst, last: scoreLast };
    if (fuzzScore) { score.fuzz = fuzzScore}
    if (score.score === 1) return score;

    // give a chance to particle names
    const lastStopA = filterStopNames(lastA);
    const lastStopB = filterStopNames(lastB);
    if ((lastA !== lastStopA) || (lastB !== lastStopB)) {
        let particleScore = stopNamePenalty * (round(scoreFirst * (scoreToken(lastStopA, lastStopB as string) ** thisLastNamePenalty)));
        if (particleScore < blindNameScore) {
            firstFirstA = firstFirstA || (Array.isArray(firstA) ? firstA[0] : firstA);
            scoreFirstALastB = scoreToken(firstFirstA, lastStopB as string);
            if (scoreFirstALastB >= blindNameScore) {
                firstFirstB = firstFirstB || (Array.isArray(firstB) ? firstB[0] : firstB);
                particleScore = Math.max(
                    particleScore,
                    stopNamePenalty * (round(nameInversionPenalty * (scoreFirstALastB ** thisLastNamePenalty) * scoreToken(lastStopB, firstFirstB as string|string[]) ** thisLastNamePenalty
                    )));
            }
        }
        if (particleScore > score.score) {
            score.score = particleScore;
            score.particleScore = particleScore;
            updateObjProp(explain, 'firstName.particles', true)
        }
    }
    return score;
}

const scoreToken = (tokenA: string|string[], tokenB: string|string[], option?: any): number => {
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
                        s = fuzzyRatio(tokenA, tokenB, option);
                    }
                } else {
                    s = Math.max(
                        fuzzyRatio(tokenA, tokenB[0], option),
                        ( tokenB.length > 1 )
                            ? tokenPlacePenalty * tokenB.slice(1, tokenB.length).map(token => fuzzyRatio(tokenA, token, option)).reduce(max) : 0
                    );
                }
            } else {
                if (typeof(tokenB) === 'string') {
                    s = scoreToken(tokenB, tokenA as string|string[], option);
                } else {
                    // if both tokenA and tokenB are arrays
                    // compare field by field, first field error lead to greater penalty (cf ** (1/(i+1)))
                    let previous = 0;
                    s = mean((tokenA).filter((token,i) => (i<tokenB.length))
                        .map((token, i) => {
                        const current = fuzzyRatio(token, tokenB[i],option);
                        previous = previous ? 0.5*(previous + current) : current;
                        return previous;
                    }))
                }
            }
        }
    } catch(err) {
        s = 0;
    }
    return s;
}

const scoreCity = (cityA: string|string[]|RequestField, cityB: string|string[]): number => {
    if (typeof(cityA) === 'string') {
        const cityNormA = cityNorm(cityA) as string;
        const cityNormB = cityNorm(cityB);
        let score;
        if (typeof(cityNormB) === 'string') {
            score = fuzzyRatio(cityNormA, cityNormB, fuzzMixRatio);
        } else {
            score = Math.max(...cityNormB.map(city => fuzzyRatio(cityNormA, city, fuzzMixRatio)));
        }
        if ((score === 1) && Array.isArray(cityNormB) && cityNormB[0] === 'paris') {
            const boroughA = extractboroughNumber(cityA);
            if (boroughA && (boroughA !== extractboroughNumber(cityB[1]))) {
                return boroughLocationPenalty;
            }
        }
        return score;
    } else {
        const cityNormB = cityNorm(cityB);
        return Math.max(...(cityA as string[]).map(city => scoreCity(cityNorm(city), cityNormB)));
    }
}

const scoreLocationCode = (codeA: string|string[]|RequestField, codeB: string|string[]): number => {
    if (typeof(codeA) === 'string') {
        if (typeof(codeB) === 'string') {
            if (codeA.length === 4) {
                // pads codeA with 0 if input is badly encoded as integer
                codeA = `0${codeA}`
            }
            if (codeA === codeB) { return 1 }
            else {
                const depA = codeA.substring(0,2);
                const depB = codeB.substring(0,2);
                if ((["91","92","93","94","99"].indexOf(depB) >= 0) && (codeB.substring(2,5) === "352")) {
                    return (["91","92","93","94"].indexOf(depA) >= 0 || (codeA.substring(2,5) === "352")) ? round(blindLocationScore ** 0.5) : minCodeScore;
                }
                if (((depA === "98") && (depB === "99")) || ((depA === "99") && (depB === "98"))) { return blindLocationScore; }
                if (depA === depB) {
                    // if 99, it's a foreign counrty so 99 isn't a good proof enough
                    return depA === "99" ? blindLocationScore : round(blindLocationScore ** 0.5);
                }
                return minCodeScore;
            }
        } else {
            return Math.max(...((codeB ).map((code) => scoreLocationCode(codeA, code))));
        }
    } else {
        return Math.max(...((codeA as string[]).map((code) => scoreLocationCode(code, codeB))));
    }
};

const boroughRegExp = [[/^\D*0*([1-9]+0?)\D*$/, '$1']];

const extractboroughNumber = (city: string): string => {
    const borough = applyRegex(city, boroughRegExp);
    if (borough !== normalize(city)) { return borough as string; }
    return undefined;
}

const depCodeRexExp = [
    [/^0?2[ab]$/,'20'],
    [/^0*([1-9]+0?)$/, '$1'],
    [/^(\D*|99|0)$/,'']
];

const scoreDepCode = (depCodeA: number|string|string[]|RequestField, depCodeB: number|string|RequestField, sameCity: boolean ) => {
    const normDepCodeA = applyRegex(depCodeA as string|string[], depCodeRexExp);
    const normDepCodeB = applyRegex(depCodeB as string|string[], depCodeRexExp);
    if (!normDepCodeA || !normDepCodeB) {
        return undefined;
    }
    if (normDepCodeA === normDepCodeB) {
        return 1;
    } else {
        if (
            ((['78','75'].indexOf(normDepCodeB as string)>=0) && (['91','92','93','94','95'].indexOf(normDepCodeA as string)>=0))
            ||
            ((['78','75'].indexOf(normDepCodeA as string)>=0) && (['91','92','93','94','95'].indexOf(normDepCodeB as string)>=0))
        ) {
            if (sameCity === true) {
                return 1;
            } else {
                if (sameCity === undefined) {
                    // no city
                    return round((3+minDepScore)/4);
                } else {
                    return minDepScore;
                }
            }
        } else {
            if (normDepCodeA === '97') {
                return round((3+minDepScore)/4);
            } else {
                return minDepScore;
            }
        }
    }
}

const countryRegExp = [
    [ /(^|\s)(de|en|les|le|la|a|aux|au|du|de la|s|sous|sur|l|d|des)\s/g, ' '],
    [ /hollande/, 'pays-bas'],
    [ /(angleterre|grande bretagne)/, 'royaume-uni'],
    [ /(vietnam)/, 'viet nam']
];

const countryNorm = (country: string|string[]): string|string[] => {
    return applyRegex(country, countryRegExp);
}

const scoreCountry = (countryA: string|string[]|RequestField, countryB: string|string[]): number => {
    if (typeof(countryA) === 'string') {
        const countryNormA = countryNorm(countryA) as string;
        if (typeof(countryB) === 'string') {
            return fuzzyRatio(countryNormA, countryNorm(countryB) as string, fuzzballTokenSetRatio);
        } else {
            return Array.isArray(countryB) ? Math.max(...countryB.map(country => fuzzyRatio(countryNormA, countryNorm(country) as string, fuzzballTokenSetRatio)),
                fuzzballTokenSetRatio(countryNormA, countryB.join(' '))
                ) : fuzzballTokenSetRatio(countryNormA, countryB);
        }
    } else {
        const countryNormB = countryNorm(countryB);
        return Math.max(...(countryA as string[]).map(country => scoreCountry(countryNorm(country), countryNormB)),
            fuzzballTokenSetRatio((countryA as string[]).join(' '), Array.isArray(countryNormB) ? countryNormB.join(' ') : countryNormB)
        );
    }
}


let scoreLocation = (locA: Location, locB: Location, event?: string, explain?: any): any => {
    const score: any = {};
    const isLocationInFrance = (locB.countryCode && (locB.countryCode === 'FRA'));
    if (locA.code && locB.code) {
        score.code = scoreLocationCode(locA.code, locB.codeHistory as string|string[]);
    }
    if (locA.codePostal && locB.codePostal) {
        score.codePostal = scoreLocationCode(locA.codePostal, locB.codePostal as string|string[]);
    }
    if (locA.latitude && locA.longitude) {
      score.geo = scoreGeo(locA.latitude, locA.longitude, locB.latitude, locB.longitude)
    }
    if (isLocationInFrance) {
        updateObjProp(explain, `${event}Country`, 'France')
        if (normalize(locA.country as string|string[])) {
            score.country = scoreCountry(locA.country, tokenize(locB.country as string));
            if ((score.code >= round(blindLocationScore ** 0.5)) && (score.country < perfectScoreThreshold)) {
                // insee code has) priority over label
                score.country = round(blindLocationScore ** 0.5);
            }
        }
        if (normalize(locA.city as string|string[]) && locB.city) {
            if (cityNorm(locA.city as string) as string in communesDict) updateObjProp(explain, `${event}City.surface`, communesDict[cityNorm(locA.city as string) as string].surface)
            score.city = scoreCity(locA.city, locB.city as string|string[]);
            if ((score.code === 1) && (score.city < perfectScoreThreshold)) {
                // insee code has priority over label
                score.city = round(blindLocationScore ** 0.5);
            } else if ((score.city < perfectScoreThreshold) && cityNorm(locA.city as string) as string in communesDict) {
                const { lat: latA, lon: lonA, code: codeA } = communesDict[cityNorm(locA.city as string) as string]
              score.code = scoreLocationCode(codeA, locB.codeHistory as string|string[]);
              if (score.code >= perfectScoreThreshold) {
                score.city = 1.0
              } else {
                score.city = Math.max(scoreGeo(latA, lonA, locB.latitude, locB.longitude),score.city)
              }
            }
        }
        if (normalize(locA.departmentCode as string|string[]) && locB.departmentCode) {
            const sDep = scoreDepCode(locA.departmentCode, locB.departmentCode,
                (score.city && (score.city >= perfectScoreThreshold))
                ||
                (score.code && (score.code >= perfectScoreThreshold))
                );
            if (sDep) {
                // good insee code has priority over wrong dep
                score.department = sDep;
                if ((score.code >= perfectScoreThreshold) && (score.department < perfectScoreThreshold)) {
                    // insee code has priority over label
                    score.department = blindLocationScore ** 0.5;
                }
            } else {
                if (locA.departmentCode === '99') {
                    if (score.country < blindLocationScore) {
                        score.country = minLocationScore;
                    }
                    else {
                        score.department = minDepScore;
                    }
                }
            }
        }
        score.score = ((score.country && (score.country < 1)) || score.code || score.city || score.department || score.geo)
            ? Math.max(minLocationScore, scoreReduce(score)) : blindLocationScore;
    } else {
        updateObjProp(explain, `${event}Country`, 'BirthCountry not France')
        if (normalize(locA.country as string|string[])) {
            score.country = scoreCountry(locA.country, tokenize(locB.country as string));
        } else {
            if (normalize(locA.city as string|string[])) {
                const sCountry = scoreCountry(locA.city, tokenize(locB.country as string));
                if ((sCountry > minCityCountrySwapScore) && (score.country ? (sCountry > score.country) : true)) {
                    score.country = sCountry ** 0.3;
                }
            } else {
                if (!score.code) {
                    score.country = blindLocationScore;
                }
            }
        }
        if (normalize(locA.city as string|string[]) && locB.city) {
            const sCity = scoreCity(locA.city, locB.city as string|string[]);
            score.city = score.country >= perfectScoreThreshold ? Math.max(minNotFrCityScore, sCity) : sCity
            updateObjProp(explain, `${event}City.country`, 'BirthCountry not France')
            if (cityNorm(locA.city as string) as string in communesDict) updateObjProp(explain, `${event}City.surface`, `${communesDict[cityNorm(locA.city as string) as string].surface} m2`)
            updateObjProp(explain, `${event}City.score`, score.city)
        }
        score.score = Math.max(minNotFrScore, scoreReduce(score));
    }
    return score;
}


export const parseYMD = (dateString: string): Date => {
  return new Date(+dateString.substring(0,4), +dateString.substring(4,6) - 1, +dateString.substring(6,8));
}

const scoreDateRaw = (dateRangeA: any, dateStringB: string, foreignDate: boolean, event: string, explain: any): number => {
    if (/^00000000$/.test(dateStringB) || !dateStringB || !dateRangeA) {
        return blindDateScore;
    }
    if (typeof(dateRangeA) === 'string') {
        dateRangeA = dateRangeA.trim();
        if (/^\s*$/.test(dateRangeA)) {
            return blindDateScore;
        }
        const dr = isDateRange(dateRangeA) || isDateLimit(dateRangeA);
        if (dr) {
            if (['>','<'].indexOf(dr[1])>=0) {
                return ((dr[1] === '>') ? (dr[2] <= dateStringB) : (dr[2] >= dateStringB)) ? uncertainDateScore : minDateScore;
            } else {
                const dateArrayA = [dr[1],dr[2]];
                if (dateArrayA[0] === dateArrayA[1]) {
                    return scoreDateRaw(dateArrayA[0], dateStringB, foreignDate, event, explain);
                }
                return ((dateArrayA[0] <= dateStringB) && (dateArrayA[1] >= dateStringB))
                    ? uncertainDateScore
                    : (/(^0000|0000$)/.test(dateStringB) ? uncertainDateScore : minDateScore);
            }
        } else {
            const dateRangeATransformed = dateTransformMask(dateRangeA);
            if (dateRangeATransformed === dateStringB) {
                updateObjProp(explain, `${event}Date.score`, '1')
                return 1;
            }
            if (dateStringB.startsWith("0000")) {
                return round(uncertainDateScore * levRatio(dateRangeATransformed.substring(4,8),dateStringB.substring(4,8), damlev) ** 2);
            }
            if (dateStringB.endsWith("0000")) {
                return round(uncertainDateScore * levRatio(dateRangeATransformed.substring(0,4),dateStringB.substring(0,4), damlev) ** 2);
            }
            if (
                dateStringB.endsWith("0101") || dateRangeATransformed.endsWith("0101")
             ) {
                // old foreign birth date place to 1st of january are often uncertain dates, leading to lot of confusion
                return round((foreignDate && (dateStringB.substring(0,4) < "1990") ? uncertainDateScore : uncertainDateScore ** 2) *
                    levRatio(dateRangeATransformed.substring(0,4),dateStringB.substring(0,4), damlev) ** 2);
            }
            const levenshteinScore = levRatio(dateRangeATransformed, dateStringB, damlev)
            const currentUncertainScore = round((uncertainDateScore ** 2) * (dateRangeATransformed.substring(0,6) === dateStringB.substring(0,6) ? 1: 0))
            const oldDateScore = round((1-(((parseYMD(dateRangeATransformed).getTime()-parseYMD(dateStringB).getTime()) /  31536000000) ** 2) ** 0.2))||0
            updateObjProp(explain, `${event}Date.levenshteinScore`, levenshteinScore)
            updateObjProp(explain, `${event}Date.uncertainScore`, currentUncertainScore)
            updateObjProp(explain, `${event}Date.oldDateScore`, oldDateScore)
            return Math.max(
                levenshteinScore,
                currentUncertainScore,
                oldDateScore
            );
        }
    } else {
        return blindDateScore;
    }
};

let scoreDate = (dateRangeA: any, dateStringB: string, dateFormatA: string, dateFormatB: string, foreignDate: boolean, event: string, explain: any): number => {
    if (dateStringB === "00000000" || !dateStringB || !dateRangeA) {
        return blindDateScore;
    }
    let dateRangeATransformed = dateRangeA;
    dateStringB = dateFormatB ? dateTransform(dateStringB, dateFormatB, "yyyyMMdd") : dateStringB;
    if (dateFormatA) {
        const dr = isDateRange(dateRangeA);
        if (!dr) {
          const dl = isDateLimit(dateRangeA);
          dateRangeATransformed = dl ? `${dl[1]}${dateTransform(dl[2], dateFormatA, "yyyyMMdd")}`
            : dateTransform(dateRangeA, dateFormatA, "yyyyMMdd");
        } else {
            dateRangeATransformed = `${dateTransform(dr[1], dateFormatA, "yyyyMMdd")}-${dateTransform(dr[2], dateFormatA, "yyyyMMdd")}`;
        }
    }
    return 0.01 * Math.round((scoreDateRaw(dateRangeATransformed, dateStringB, foreignDate, event, explain) ** datePenalty) * 100);
}

let scoreSex = (sexA: any, sexB: string): number => {
    return (sexA && sexB)
            ? ((sexA.replace(/^(H).*$/,'M') === sexB) ? 1 : minSexScore)
            : blindSexScore;
}

const scoreGeo = (latA: number, lonA: number, latB: number, lonB: number): number => {
    return round(
        Math.max(0, 20/(20 + geoDistance(latA, lonA, latB, lonB)))
    )
};

const geoDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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

// perf monitoring (not active in prod mode)
scoreLocation = timer(scoreLocation, 'scoreLocation',100);
scoreName = timer(scoreName, 'scoreName',500);
scoreSex = timer(scoreSex, 'scoreSex',100);
scoreDate = timer(scoreDate, 'scoreDate',1000);

export class ScoreResult {
    score: number;
    explain?: any; // TODO: type explain
    birthDate?: number
    deathDate?: number
    name?: number;
    sex?: number;
    birthLocation?: number;
    deathLocation?: number;

    constructor(persA: Person, persB: Person, params: ScoreParams = {}) {
      const explain = params.explain ? {} : null;
      const pruneScore = params.pruneScore !== undefined ? params.pruneScore : defaultPruneScore
      if (persA.birth && persA.birth.date) {
        this.birthDate = scoreDate(persA.birth.date, persB.birth.date, params.dateFormatA, params.dateFormatB,
          persB.birth && persB.birth.location && persB.birth.location.countryCode && (persB.birth.location.countryCode !== 'FRA'),
          'birth',
          explain
        );
      }
      if (persA.name && (persA.name.first || persA.name.last)) {
        if ((pruneScore < scoreReduce(this, true)) || !this.birthDate) {
          if (persB.sex && persB.sex === 'F') {
              updateObjProp(explain, 'sex', 'F')
              if (persA.name.legal) {
                  this.name = scoreName({first: persA.name.first, last: [persA.name.last as string, persA.name.legal as string]}, persB.name, 'F', explain);
                  updateObjProp(explain, 'legalName', true)
              } else {
                  this.name = scoreName(persA.name, persB.name, 'F', explain);
              }
          } else {
            this.name = scoreName(persA.name, persB.name, 'M');
            updateObjProp(explain, 'sex', 'M')
          }
        } else {
          this.score = 0
        }
      }
      if (persA.sex) {
        if (pruneScore < scoreReduce(this, true)) {
          this.sex = scoreSex(persA.sex, persB.sex);
        } else {
          this.score = 0
        }
      } else if (persA.name && persA.name.first && firstNameSexMismatch(persA.name.first as string, persB.name.first as string)) {
          this.sex = firstNameSexPenalty;
      }
      // birthLocation
      if (pruneScore < scoreReduce(this, true)) {
          this.birthLocation = scoreLocation(
            persA.birth && persA.birth.location ? persA.birth.location : {},
            persB.birth && persB.birth.location ? persB.birth.location: {},
            'birth',
            explain,
          );
      } else {
          this.score = 0
      }
      if (persA.death && persA.death.date) {
          if (pruneScore < scoreReduce(this, true)) {
              this.deathDate = scoreDate(persA.death.date, persB.death.date, params.dateFormatA, params.dateFormatB,
                  persB.death && persB.death.location && persB.death.location.countryCode && (persB.death.location.countryCode !== 'FRA'),
                  'death',
                  explain
              );
          } else {
              this.score = 0
          }
      }
      if (persA.death && persA.death.location && (persA.death.location.city || persA.death.location.code || persA.death.location.country || persA.death.location.departmentCode || persA.death.location.latitude)) {
          if (pruneScore < scoreReduce(this, true)) {
              this.deathLocation = scoreLocation(
                persA.death && persA.death.location ? persA.death.location : {},
                persB.death && persB.death.location ? persB.death.location : {},
                'death',
                explain
              );
          } else {
              this.score = 0
          }
      }
      if (!this.score) {
        this.score = scoreReduce(this, true)
      }
      if (params.explain) {
        this.explain = explain
      }
    }
  }


export const personFromRequest = (item: RequestBody): Person => {
  return {
    ...(item.firstName || item.lastName || item.legalName) && {name: {
      ...item.firstName && { first: item.firstName },
      ...item.lastName && { last: item.lastName },
      ...item.legalName && { legal: item.legalName }
    }},
    ...item.sex && { sex: item.sex as 'M'|'F' },
    ...(item.birthDate || item.birthCity || item.birthLocationCode || item.birthDepartment || item.birthCountry ) && { birth: {
      ...item.birthDate && { date: item.birthDate as string },
      ...(item.birthCity || item.birthLocationCode || item.birthDepartment || item.birthCountry || item.birthGeoPoint) && { location: {
        ...item.birthCity && { city: item.birthCity },
        ...item.birthLocationCode && { code: item.birthLocationCode },
        ...item.birthDepartment && { departmentCode: item.birthDepartment },
        ...item.birthCountry && { country: item.birthCountry },
        ...item.birthGeoPoint && { latitude: item.birthGeoPoint.latitude, longitude: item.birthGeoPoint.longitude }
    }}}},
    ...(item.deathDate || item.deathCity || item.deathLocationCode || item.deathDepartment || item.deathCountry ) && { death: {
      // deathDate has priority over lastSeenAliveDate
      ...item.lastSeenAliveDate && { date: `>${item.lastSeenAliveDate}`},
      ...item.deathDate && { date: item.deathDate as string },
      ...item.deathAge && { date: item.deathAge as string },
      ...(item.deathCity || item.deathLocationCode || item.deathDepartment || item.deathCountry || item.deathGeoPoint) && { location: {
        ...item.deathCity && { city: item.deathCity },
        ...item.deathLocationCode && { code: item.deathLocationCode },
        ...item.deathDepartment && { departmentCode: item.deathDepartment },
        ...item.deathCountry && { country: item.deathCountry },
        ...item.deathGeoPoint && { latitude: item.deathGeoPoint.latitude, longitude: item.deathGeoPoint.longitude }
    }}}}
  }
}


export const scoreResults = (request: RequestBody, results: Person[], params: ScoreParams): Person[] => {
    const pruneScore = params.pruneScore !== undefined ? params.pruneScore : defaultPruneScore
    const candidateNumber = params.candidateNumber || 1;
    let maxScore = 0;
    let perfectScoreNumber = 0;
    let perfectNameScore = false;
    let bestScoreNumber = 0;
    let filteredResultsNumber = 0;
    // following count of meaning arguments (sex and deaths fields not taken as such) used to reduce penalty of blind scoring penalties
    const requestMeaningArgsNumber = ((request.fullText || request.lastName || request.firstName) ? 1 : 0)
        + (request.birthDate ? 1 : 0)
        + ((request.birthCity || request.birthLocationCode || request.birthCountry || request.birthDepartment || request.birthGeoPoint) ? 1 : 0)
    const resultsWithScores: any = results
            .filter((result:any) => result.score > 0)
            .map((result:any) => {
                try {
                    result.scores = new ScoreResult(personFromRequest(request), result, params);
                    const perfectScores =
                        ((result.scores.name && result.scores.name.score >= perfectScoreThreshold) ? 1 : 0) +
                        ((result.scores.birthDate && result.scores.birthDate.score === 1) ? 1 : 0) +
                        ((result.scores.birthLocation && result.scores.birthLocation.score >= perfectScoreThreshold) ? 1 : 0)
                    result.scores.score =  round(scoreReduce(result.scores, true) ** (requestMeaningArgsNumber/(0.5 * perfectScores + Object.keys(result.scores).length || 1)));
                } catch(err) {
                    loggerStream.write(JSON.stringify({
                        backend: {
                            "server-date": new Date(Date.now()).toISOString(),
                            error: {
                                name: err.name,
                                message: err.message,
                                stack: err.stack,
                                request
                            }
                        }
                    }));
                    result.scores = {};
                }
                result.scores.es = round(0.005 * Math.min(200, result.score));
                result.score = (result.scores.score !== undefined) ?  round(result.scores.score) : result.scores.es;
                if (result.score > maxScore) { maxScore = result.score }
                if (result.score >= perfectScoreThreshold) { perfectScoreNumber++ }
                if ((result.sex && (result.sex === 'F')) && (result.scores && result.scores.name && (result.scores.name.score > wrongLastNamePenalty.F))) { perfectNameScore = true; }
                return result;
            })
            .filter((result: any) => result.score >= pruneScore)
            .map((result: any) => {
                if (result.score === maxScore) { bestScoreNumber++; }
                if (result.sex && (result.sex === 'M') || !perfectNameScore || (result.scores && result.scores.name && result.scores.name.score > wrongLastNamePenalty.F)) {
                    filteredResultsNumber++;
                }
                return result;
            })
            .sort((a: any, b: any) => (a.score < b.score) ? 1 : ( (a.score > b.score) ? -1 : 0 ))
            .map((result: any) => {
                if (perfectNameScore && filteredResultsNumber &&
                    result.scores && result.scores.name && (result.scores.name.score <= wrongLastNamePenalty.F)) {
                    // filter alteratives with wrong last name if a good one is present in results list
                        result.score = 0;
                }
                if (result.score > 0) {
                    if (filteredResultsNumber > 1) {
                        const myMultipleMatchPenalty = Math.max(multipleMatchPenaltyMax,
                            perfectScoreNumber ? (1 - multiplePerfectScorePenalty * (perfectScoreNumber - 1 + (filteredResultsNumber - perfectScoreNumber)/candidateNumber))
                                :                 (1 - multipleBestScorePenalty * (bestScoreNumber - 1 + (filteredResultsNumber - bestScoreNumber)/candidateNumber))
                            );
                        const myMultipleMatchPenaltyPow = (result.score === maxScore) ?
                            1 : (
                            secondaryCandidatePenaltyPow + (
                                (result.score >= perfectScoreThreshold) ?
                                    1 :
                                    filteredResultsNumber - (perfectScoreNumber || bestScoreNumber)
                                )
                            );
                        result.score = round(myMultipleMatchPenalty * result.score ** myMultipleMatchPenaltyPow);
                        if (result.score !== result.scores.score) {
                            result.scores.multiMatchPenalty = round(result.score / (result.scores.score || 1));
                            result.scores.multiMatch = filteredResultsNumber;
                            result.scores.score = result.score;
                        }
                    }
                    if ((result.score < maxScore) && (result.score < secondaryCandidateThreshold)) {
                        result.score = 0;
                    }
                }
                return result;
            })
            .filter((result: any) => result.score >= pruneScore);
    return resultsWithScores;
}
