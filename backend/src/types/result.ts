
interface Person {
  score: number;
  source: string;
  id: string;
  name: {
    first: string[];
    last: string;
  };
  birth: {
    date: string;
    location: {
      city: string;
      cityCode: string;
      departmentCode: string;
      country: string
      countryCode: string
    }
  };
  death: {
    date: string;
    location: {
      city: string;
      cityCode: string;
      departmentCode: string;
      country: string;
      countryCode: string;
    }
  };
}

interface Result {
  request: any;
  response: {
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

export function buildResult (result: any, page: any, size: any, searchKeys: any): Result {
  // const dataCatalog = await getDataGouvCatalog()
  const filteredResults = result.hits.hits.map((item: any) => {
    return {
      score: item._score,
      // source: dataCatalog[item._source.SOURCE],
      source: item._source.SOURCE,
      id: item._id,
      name: {
        first: item._source.PRENOMS.split(' '),
        last: item._source.NOM
      },
      birth: {
        date: item._source.DATE_NAISSANCE,
        location: {
          city: item._source.COMMUNE_NAISSANCE,
          cityCode: item._source.CODE_INSEE_NAISSANCE,
          departmentCode: item._source.DEPARTEMENT_NAISSANCE,
          country: item._source.PAYS_NAISSANCE,
          countryCode: item._source.PAYS_NAISSANCE_CODEISO3
        }
      },
      death: {
        date: item._source.DATE_DECES,
        location: {
          city: item._source.COMMUNE_DECES, // str|str[]
          cityCode: item._source.CODE_INSEE_DECES,
          departmentCode: item._source.DEPARTEMENT_DECES,
          country: item._source.PAYS_DECES,
          countryCode: item._source.PAYS_DECES_CODEISO3
        }
      }
    }
  });
  return {
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
}

export function buildResultPost (result: any, requestInput: any): Result {
  const filteredRequest: RequestType = {}
  Object.keys(requestInput).forEach((item: any) => {
    if (requestInput[item].value) {
      return filteredRequest[item] = requestInput[item].value
    }
  })
  const filteredResults = result.hits.hits.map((item: any) => {
    return {
      score: item._score,
      // source: dataCatalog[item._source.SOURCE],
      source: item._source.SOURCE,
      id: item._id,
      name: {
        first: item._source.PRENOMS.split(' '),
        last: item._source.NOM
      },
      birth: {
        date: item._source.DATE_NAISSANCE,
        location: {
          city: item._source.COMMUNE_NAISSANCE,
          cityCode: item._source.CODE_INSEE_NAISSANCE,
          departmentCode: item._source.DEPARTEMENT_NAISSANCE,
          country: item._source.PAYS_NAISSANCE,
          countryCode: item._source.PAYS_NAISSANCE_CODEISO3
        }
      },
      death: {
        date: item._source.DATE_DECES,
        location: {
          city: item._source.COMMUNE_DECES, // str|str[]
          cityCode: item._source.CODE_INSEE_DECES,
          departmentCode: item._source.DEPARTEMENT_DECES,
          country: item._source.PAYS_DECES,
          countryCode: item._source.PAYS_DECES_CODEISO3
        }
      }
    }
  });
  return {
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
}
