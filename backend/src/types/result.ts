interface Person {
  score: number;
  source: string;
  id: string;
  name: {
    first: string[];
    last: string;
  };
  sex: string;
  birth: {
    date: string;
    location: {
      city: string;
      cityCode: string;
      departmentCode: string;
      country: string;
      countryCode: string
      latitude: number;
      longitude: number;
    }
  };
  death: {
    date: string;
    certificateId: string;
    age: number;
    location: {
      city: string;
      cityCode: string;
      departmentCode: string;
      country: string;
      countryCode: string;
      latitude: number;
      longitude: number;
    }
  };
}

interface RequestType {
  [key: string]: any; // Index signature
  q?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  birthCity?: string;
  birthDepartment?: string;
  birthCountry?: string;
  deathDate?: string;
  deathCity?: string;
  deathDepartment?: string;
  deathCountry?: string;
  size?: number;
  page?: number;
  fuzzy?: string;
  sort?: string;
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
 *        "id":"ba7582a6344757e67351bf42096c952a12108e06",
 *        "name":{"first":["Jean","Pierre"],"last":"Dupont"},
 *        "sex": "M",
 *        "birth":{
 *          "date":"19691111",
 *          "location":{
 *            "city":"Clermont-Ferrand",
 *            "cityCode":"63113",
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
 *            "cityCode":"63113",
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
  response?: {
    scrollId?: string;
    total: number;
    maxScore: number;
    size: number;
    page: number;
    delay: number;
    persons: Person[];
  }
}

export function getFromGeoPoint (geoPoint: string, latOrLon: string): number {
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

export function buildResult (result: any, page: any, size: any, searchKeys: any): Result {
  // const dataCatalog = await getDataGouvCatalog()
  const filteredResults = result.hits.hits.map((item: any) => {
    return {
      score: item._score,
      // source: dataCatalog[item._source.SOURCE],
      source: item._source.SOURCE,
      id: item._id,
      name: {
        first: item._source.PRENOMS ? item._source.PRENOMS.split(' ') : "",
        last: item._source.NOM
      },
      sex: item._source.SEXE,
      birth: {
        date: item._source.DATE_NAISSANCE,
        location: {
          city: item._source.COMMUNE_NAISSANCE,
          cityCode: item._source.CODE_INSEE_NAISSANCE,
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
          cityCode: item._source.CODE_INSEE_DECES,
          departmentCode: item._source.DEPARTEMENT_DECES,
          country: item._source.PAYS_DECES,
          countryCode: item._source.PAYS_DECES_CODEISO3,
          latitude: getFromGeoPoint(item._source.GEOPOINT_DECES, 'latitude'),
          longitude: getFromGeoPoint(item._source.GEOPOINT_DECES, 'longitude')
        }
      }
    }
  });
  const composedResult: Result = {
    request: searchKeys,
    response: {
      total: result.hits.total.value,
      maxScore: result.hits.max_score,
      size,
      page,
      delay: result.took,
      persons: filteredResults
    }
  }
  if (result._scroll_id) {
    composedResult.response.scrollId = result._scroll_id
  }
  return composedResult
}

export function buildResultPost (result: any, requestInput: any): Result {
  const filteredRequest: RequestType = {}
  Object.keys(requestInput).forEach((item: any) => {
    if (requestInput[item] && requestInput[item].value) {
      return filteredRequest[item] = requestInput[item].value
    }
  })
  const filteredResults = result.hits.hits.map(buildResultSingle)
  const composedResult: Result =  {
    request: filteredRequest,
    response: {
      total: result.hits.total.value,
      maxScore: result.hits.max_score,
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

export function buildResultSingle (item: any): any { // TODO
  return {
    score: item._score,
    // source: dataCatalog[item._source.SOURCE],
    source: item._source.SOURCE,
    id: item._id,
    name: {
      first: item._source.PRENOMS ? item._source.PRENOMS.split(' ') : "",
      last: item._source.NOM
    },
    sex: item._source.SEXE,
    birth: {
      date: item._source.DATE_NAISSANCE,
      location: {
        city: item._source.COMMUNE_NAISSANCE,
        cityCode: item._source.CODE_INSEE_NAISSANCE,
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
        cityCode: item._source.CODE_INSEE_DECES,
        departmentCode: item._source.DEPARTEMENT_DECES,
        country: item._source.PAYS_DECES,
        countryCode: item._source.PAYS_DECES_CODEISO3,
        latitude: getFromGeoPoint(item._source.GEOPOINT_DECES, 'latitude'),
        longitude: getFromGeoPoint(item._source.GEOPOINT_DECES, 'longitude')
      }
    }
  }
}

/**
 * The message shows information to solve the error
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
