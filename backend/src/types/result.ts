
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

export interface Result {
  request: any;
  response: {
    scrollId?: string;
    total: number;
    maxScore: number;
    size: number;
    page: number;
    delay: number;
    persons: Person[];
  }
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
    if (requestInput[item].value) {
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

export function buildResultSingle (item: any): any { //TODO
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
