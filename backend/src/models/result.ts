import { Person } from './entities';
import { RequestInput } from './requestInput';
import { scoreResults } from '../score';
import { wikidata } from '../wikidata';

interface RequestType {
  [key: string]: any; // Index signature
  q?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  birthCity?: string;
  birthLocationCode?: string;
  birthDepartment?: string;
  birthCountry?: string;
  deathDate?: string;
  deathCity?: string;
  deathLocationCode?: string;
  deathDepartment?: string;
  deathCountry?: string;
  size?: number;
  page?: number;
  fuzzy?: string;
  sort?: string;
  dateFormat?: string;
}

interface ResType {
 scrollId?: string;
 /**
  * nombre d'identité trouvé
  */
 total: number;
 /**
  * score maximum obtenu lors de la recherche
  */
 maxScoreES: number;
 /**
  * nombre d'identité présent dans la réponse
  */
 size: number;
 /**
  * numéro de page
  */
 page: number;
 /**
  * délai du traitement
  */
 delay: number;
 persons: Person[];
}

interface ResTypeAgg {
 total: number;
 /**
  * délai du traitement
  */
 delay: number;
 aggregations: any;
}

/**
 * This is a description of a model
 * @tsoaModel
 * @example
 * {
 *   "request": {
 *    "q": "Georges Pompidou"
 *   },
 *   "response": {
 *     "scrollId": "123XXX",
 *     "total": 2,
 *     "maxScore": 10.54,
 *     "size": 20,
 *     "page": 1,
 *     "delay": 2,
 *     "persons": [{
 *        "score":10.542101,
 *        "source":"2020-m01",
 *        "sourceLine": 212,
 *        "id":"ba7582a6344757e67351bf42096c952a12108e06",
 *        "name":{"first":["Jean","Pierre"],"last":"Dupont"},
 *        "sex": "M",
 *        "birth":{
 *          "date":"19691111",
 *          "location":{
 *            "city":"Clermont-Ferrand",
 *            "code":"63113",
 *            "departmentCode":"63",
 *            "country":"France",
 *            "countryCode":"FRA",
 *            "latitude": 45.7833,
 *            "longitude": 3.0833
 *          }
 *        },
 *        "death":{
 *          "date":"20200604",
 *          "certificateId": "69 N",
 *          "age": 50,
 *          "location":{
 *            "city":"Clermont-Ferrand",
 *            "code":"63113",
 *            "departmentCode":"63",
 *            "country":"France",
 *            "countryCode":"FRA",
 *            "latitude": 45.7833,
 *            "longitude": 3.0833
 *          }
 *        }
 *      }]
 *   }
 * }
 */
export interface Result {
  msg?: string|string[];
  request?: RequestType;
  response?: ResType;
}

/**
 * This is a description of a model
 * @tsoaModel
 * @example
 * {
 *   "request": {
 *    "q": "Georges Pompidou"
 *   },
 *   "response": {
 *    "bucket": "bucket"
 *   }
 * }
 */
export interface ResultAgg {
  msg?: string|string[];
  request?: RequestType;
  response?: ResTypeAgg;
}

export interface ResultRawES {
  '_scroll_id'?: string;
  took: number;
  hits: {
    total: {
      value: number;
    }
    'max_score': number;
    hits:  ResultRawHit[]
  };
  aggregations?: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: any[];
  }
}

export interface ResultRawHit {
  _score: number;
  _id: string;
  _source: {
    SOURCE: string;
    SOURCE_LINE: number;
    PRENOMS: string;
    NOM: string;
    SEXE: 'M'|'F';
    UID: string;
    DATE_NAISSANCE: string;
    COMMUNE_NAISSANCE: string;
    CODE_INSEE_NAISSANCE: string;
    CODE_INSEE_NAISSANCE_HISTORIQUE: string|string[];
    DEPARTEMENT_NAISSANCE: string;
    PAYS_NAISSANCE: string;
    PAYS_NAISSANCE_CODEISO3: string;
    GEOPOINT_NAISSANCE: string;
    GEOPOINT_DECES: string;
    DATE_DECES: string;
    NUM_DECES: string;
    AGE_DECES: number;
    COMMUNE_DECES: string;
    CODE_INSEE_DECES: string;
    CODE_INSEE_DECES_HISTORIQUE: string|string[];
    DEPARTEMENT_DECES: string;
    PAYS_DECES: string;
    PAYS_DECES_CODEISO3: string;
  }
}

export const getFromGeoPoint = (geoPoint: string, latOrLon: string): number  => {
  try {
    if (latOrLon === 'latitude') {
      return Number(geoPoint.replace(/^POINT\s*\((-?[0-9]+\.?[0-9]*)\s+(-?[0-9]+\.?[0-9]*)\)\s*$/,'$2'));
    } else if (latOrLon === 'longitude') {
      return Number(geoPoint.replace(/^POINT\s*\((-?[0-9]+\.?[0-9]*)\s+(-?[0-9]+\.?[0-9]*)\)\s*$/,'$1'));
    } else {
      return undefined
    }
  } catch {
    return undefined;
  }
}

export const buildResult = (result: ResultRawES, requestInput: RequestInput): Result => {
  const filteredRequest: RequestType = {}
  Object.keys(requestInput).forEach((item: any) => {
    if (requestInput[item] && requestInput[item].value) {
      if (item === 'name') {
        filteredRequest.firstName = requestInput.name.value && requestInput.name.value.first;
        filteredRequest.lastName = requestInput.name.value && requestInput.name.value.last;
        filteredRequest.legalName = requestInput.name.value && requestInput.name.value.legal;
      } else {
        filteredRequest[item] = requestInput[item].value
      }
    }
  })
  let filteredResults = result.hits.hits.map(buildResultSingle)
  scoreResults(filteredRequest, filteredResults, {dateFormat: filteredRequest.dateFormat})
  if (requestInput.sort && Object.values(requestInput.sort.value).map(x => Object.keys(x))[0].includes('score')) {
    if (Object.values(requestInput.sort.value).find(x => x.score).score === 'asc') {
      filteredResults = filteredResults.sort((a: Person, b: Person) => a.score - b.score)
    } else if (Object.values(requestInput.sort.value).find(x => x.score).score === 'desc') {
      filteredResults = filteredResults.sort((a: Person, b: Person) => b.score - a.score)
    }
  }
  const composedResult: Result =  {
    request: filteredRequest,
    response: {
      total: result.hits.total.value,
      maxScoreES: result.hits.max_score,
      size: requestInput.size,
      page: requestInput.page,
      delay: result.took,
      persons: filteredResults
    }
  }
  if (result._scroll_id) {
    composedResult.response.scrollId = result._scroll_id
  }
  return composedResult

}

export const buildResultSingle = (item: ResultRawHit): Person => {
  const result: Person = {
    score: item._score,
    // source: dataCatalog[item._source.SOURCE],
    source: item._source.SOURCE,
    sourceLine: item._source.SOURCE_LINE,
    scores: {score: 0},
    id: item._source.UID,
    name: {
      first: item._source.PRENOMS ? item._source.PRENOMS.split(' ') : [''],
      last: item._source.NOM
    },
    sex: item._source.SEXE,
    birth: {
      date: item._source.DATE_NAISSANCE,
      location: {
        city: item._source.COMMUNE_NAISSANCE,
        code: item._source.CODE_INSEE_NAISSANCE,
        codeHistory: item._source.CODE_INSEE_NAISSANCE_HISTORIQUE,
        departmentCode: item._source.DEPARTEMENT_NAISSANCE,
        country: item._source.PAYS_NAISSANCE,
        countryCode: item._source.PAYS_NAISSANCE_CODEISO3,
        latitude: getFromGeoPoint(item._source.GEOPOINT_NAISSANCE, 'latitude'),
        longitude: getFromGeoPoint(item._source.GEOPOINT_NAISSANCE, 'longitude')
      }
    },
    death: {
      date: item._source.DATE_DECES,
      certificateId: item._source.NUM_DECES,
      age: item._source.AGE_DECES,
      location: {
        city: item._source.COMMUNE_DECES, // str|str[]
        code: item._source.CODE_INSEE_DECES,
        codeHistory: item._source.CODE_INSEE_DECES_HISTORIQUE,
        departmentCode: item._source.DEPARTEMENT_DECES,
        country: item._source.PAYS_DECES,
        countryCode: item._source.PAYS_DECES_CODEISO3,
        latitude: getFromGeoPoint(item._source.GEOPOINT_DECES, 'latitude'),
        longitude: getFromGeoPoint(item._source.GEOPOINT_DECES, 'longitude')
      }
    }
  }
  const wd = wikidata[result.id];
  if (wd) {
    result.links = {wikidata: wd.wikidata}
    if (wd.wikimedia) { result.links.wikimedia = wd.wikimedia }
    if (wd.wikipedia) { result.links.wikipedia = wd.wikipedia }
    if (wd.label) { result.links.label = wd.label }
  }
  return result;
}

/**
 * Ce message décrit les erreurs rencontrées
 * @tsoaModel
 * @example
 * {
 *   "msg": "Error"
 * }
 */
export interface ErrorResponse {
  msg: string|string[]
}

/**
 * The message shows OK when the backend is running successfully
 * @tsoaModel
 * @example
 * {
 *   "msg": "Ok"
 * }
 */
export interface HealthcheckResponse {
  msg: string;
}
