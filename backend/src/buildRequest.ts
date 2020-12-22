import { RequestInput } from './models/requestInput';
import { BodyResponse, ScrolledResponse } from './models/body';
import { buildRequestFilter } from "./buildRequestFilter";
import { fuzzyTermQuery, matchQuery, dateRangeStringQuery } from './queries';
import { isDateRange, isDateLimit } from './masks';

const buildMatch = (requestInput: RequestInput) => {
  if (requestInput.block) {
    return buildAdaptativeBlockMatch(requestInput);
  } else {
    if (requestInput.fullText && requestInput.fullText.value) {
      return buildSimpleMatch(requestInput.fullText.value as string)
    } else {
      return buildAdvancedMatch(requestInput)
    }
  }
}

const buildAdaptativeBlockMatch = (searchInput: RequestInput) => {
  /*
    apply the costless blocking strategy :
  */
  if (searchInput.name && searchInput.name.value && searchInput.name.value.last && searchInput.name.value.first) {
    let queryMust = [fuzzyTermQuery('PRENOMS_NOM', [searchInput.name.value.last, searchInput.name.value.first].filter(x => x).join(" "), "auto", false)]
    let queryShould = [matchQuery('NOM', searchInput.name.value.last as string, false, false)]
    if (searchInput.birthDate && searchInput.birthDate.value) {
      if (isDateRange(searchInput.birthDate.value as string) || isDateLimit(searchInput.birthDate.value as string)) {
        queryMust = [
          ...queryMust,
          searchInput.birthDate.query(searchInput.birthDate.field, searchInput.birthDate.mask.transform(searchInput.birthDate.value, searchInput.dateFormat) as string, false, true)
        ];
      } else {
        queryMust = [...queryMust, fuzzyTermQuery(searchInput.birthDate.field as string, searchInput.birthDate.mask.transform(searchInput.birthDate.value, searchInput.dateFormat) as string, "auto", false)]
        queryShould = [...queryShould, matchQuery(searchInput.birthDate.field as string, searchInput.birthDate.mask.transform(searchInput.birthDate.value, searchInput.dateFormat) as string, false, false)]
      }
    }
    if (searchInput.deathDate && searchInput.deathDate.value) {
      if (isDateRange(searchInput.deathDate.value as string) || isDateLimit(searchInput.deathDate.value as string)) {
        queryMust = [
          ...queryMust,
          searchInput.deathDate.query(searchInput.deathDate.field, searchInput.deathDate.mask.transform(searchInput.deathDate.value, searchInput.dateFormat) as string, false, true)
        ];
      } else {
        /* dont add must query for death date as it will slow down query, but rank first strict matching*/
        queryShould = [...queryShould, matchQuery(searchInput.deathDate.field as string, searchInput.deathDate.mask.transform(searchInput.deathDate.value, searchInput.dateFormat) as string, false, false)]
      }
    }
    return {
        function_score : {
          query: {
            bool: {
              must: queryMust,
              should: queryShould,
              minimum_should_match: 1
            }
          }
        }
    };
  } else {
    return buildAdvancedMatch(searchInput);
  }
}

const buildSimpleMatch = (searchInput: string) => {
  const searchTerm = searchInput.normalize('NFKD').replace(/[\u0300-\u036f]/g, "").split(/\s+/);
  let date = searchTerm.filter( x => /^\d{2}\/\d{2}\/\d{4}$/.exec(x)).map( x => x.replace(/(\d{2})\/(\d{2})\/(\d{4})/,"$3$2$1"));
  date = date.length ? [date[0]] : null;
  const names = searchTerm.filter( x => /[a-z]+/i.exec(x)).filter( x => !/^(el|d|le|de|la|los)$/i.exec(x));

  const defaultQuery = { match_all: {} }

  let namesQuery:any
  let dateQuery

  if (names.length > 0) {
    namesQuery = {
      bool: {
        must: [
          {
            match: {
              PRENOMS_NOM: {
                query: names.join(" "),
                fuzziness: "auto"
              }
            }
          }
        ],
        should: [
          {
            match: {
              PRENOM_NOM: names.join(" "),
            }
          },
          {
            match: {
              PRENOM_NOM: {
                query: names.join(" "),
                fuzziness: "auto"
              }
            }
          }
        ]
      }
    }


    if (names.length === 2) {
      namesQuery.bool.must.push(
        {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                bool: {
                  must: [
                    {
                      bool: {
                        must: [
                          {
                            match: {
                              NOM: {
                                query: names[0],
                                fuzziness: "auto"
                              }
                            }
                          }
                        ],
                        should: [
                          {
                            match: {
                              NOM: names[0]
                            }
                          }
                        ]
                      }
                    },
                    {
                      bool: {
                        must: [
                          {
                            match: {
                              PRENOMS: {
                                query: names[1],
                                fuzziness: "auto"
                              }
                            }
                          }
                        ],
                        should: [
                          {
                            match: {
                              PRENOM: {
                                query: names[1],
                                fuzziness: "auto"
                              }
                            }
                          },
                          {
                            match: {
                              PRENOM: names[1]
                            }
                          }
                        ]
                      }
                    }
                  ]
                }
              },
              {
                bool: {
                  must: [
                    {
                      bool: {
                        must: [
                          {
                            match: {
                              NOM: {
                                query: names[1],
                                fuzziness: "auto"
                              }
                            }
                          }
                        ],
                        should: [
                          {
                            match: {
                              NOM: names[1]
                            }
                          }
                        ]
                      }
                    },
                    {
                      bool: {
                        must: [
                          {
                            match: {
                              PRENOMS: {
                                query: names[0],
                                fuzziness: "auto"
                              }
                            }
                          }
                        ],
                        should: [
                          {
                            match: {
                              PRENOM: {
                                query: names[0],
                                fuzziness: "auto"
                              }
                            }
                          },
                          {
                            match: {
                              PRENOM: names[0]
                            }
                          }
                        ]
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      )
    }
  }

  if (date) {
    dateQuery = {
      bool: {
        minimum_should_match: 1,
        should: [
          {
            match: {
              DATE_NAISSANCE: {
                query: date[0],
                fuzziness: "auto"
              }
            }
          },
          {
            match: {
              DATE_DECES: {
                query: date[0],
                fuzziness: "auto"
              }
            }
          }
        ]
      }
    }
  }

  const query = dateQuery
    ? namesQuery
      ? {
          function_score: {
            query: {
              bool: {
                must: [ namesQuery ],
                should: [ dateQuery ]
              }
            }
          }
        }
      : dateQuery
    : namesQuery
      ?
        namesQuery
      :
        defaultQuery

  return query

}

const buildFieldRequest = (key: string, searchInput: RequestInput, must: boolean) => {
  const value = searchInput[key] && ( searchInput[key].mask && searchInput[key].mask.transform && searchInput[key].value
    ? searchInput[key].mask.transform(searchInput[key].value)
    : searchInput[key].value );
  if (value && searchInput[key].query) {
    return searchInput[key].query(searchInput[key].field, value, searchInput[key].fuzzy, must)
  }
}

const buildAdvancedMatch = (searchInput: RequestInput) => {
  return {
    function_score: {
      query: {
        bool: {
          must: searchInput.block
            ?
            [
              {
                bool: {
                  should: Object.keys(searchInput)
                        .filter(key => searchInput.block.scope.includes(key))
                        .map(key => buildFieldRequest(key, searchInput, false))
                        .filter(x => x),
                  minimum_should_match: searchInput.block.minimum_match
                },
              },
              searchInput.block.should && {
                bool: {
                  should: Object.keys(searchInput)
                    .filter(key => !searchInput.block.scope.includes(key))
                    .map(key => buildFieldRequest(key, searchInput, false))
                    .filter(x => x)
                }
              }
            ]
            :
            Object.keys(searchInput)
             .map(key => buildFieldRequest(key, searchInput, true))
             .filter(x => x)
        }
      }
    }
  }
}

const buildFrom = (current: number, resultsPerPage: number) => {
  if (!current || !resultsPerPage) return;
  return (current - 1) * resultsPerPage;
}

const referenceSort: any = {
  score: "_score",
  firstName: "PRENOM.raw",
  lastName: "NOM.raw",
  sex: "SEXE",
  birthDate: "DATE_NAISSANCE.raw",
  birthCity: "COMMUNE_NAISSANCE.raw",
  birthDepartment: "DEPARTEMENT_NAISSANCE",
  birthCountry: "PAYS_NAISSANCE.raw",
  deathDate: "DATE_DECES.raw",
  deathAge: "AGE_DECES",
  deathCity: "COMMUNE_DECES.raw",
  deathDepartment: "DEPARTEMENT_DECES",
  deathCountry: "PAYS_DECES.raw"
}

export const buildSort = (inputs?: any) => {
  let parsedInput
  if (typeof(inputs) === 'string') {
    parsedInput = JSON.parse(inputs)
  } else {
    parsedInput = Object.values(inputs);
  }
  return parsedInput.map((item: any) => {
    const _myvar = Object.keys(item)[0]
    return {field: referenceSort[_myvar], order: Object.values(item)[0]}
  }).filter((x:any) => x.order).map((x: any) => { return { [x.field]: x.order } })
}

export const buildRequest = (requestInput: RequestInput): BodyResponse|ScrolledResponse => {
  const sort = buildSort(requestInput.sort.value);
  const match = buildMatch(requestInput);
  // const filter = buildRequestFilter(myFilters); // TODO
  const size = requestInput.size;
  const from = buildFrom(requestInput.page, size);

  let body
  if (requestInput.scrollId && requestInput.scroll) {
    body = {
      scroll: requestInput.scroll,
      scroll_id: requestInput.scrollId
    }
  } else {
    body = {
      // Static query Configuration
      // --------------------------
      // https://www.elastic.co/guide/en/elasticsearch/reference/7.x/search-request-highlighting.html
      min_score: ((requestInput.fullText && requestInput.fullText.value) ? 5: 0),
      track_total_hits: requestInput.block ? false : true,
      // highlight: {
      //   fragment_size: 200,
      //   number_of_fragments: 1,
      //   fields: {
      //     title: {},
      //     description: {}
      //   }
      // },
      // https://www.elastic.co/guide/en/elasticsearch/reference/7.x/search-request-source-filtering.html#search-request-source-filtering
      _source: [
        "CODE_INSEE_DECES","CODE_INSEE_NAISSANCE",
        "COMMUNE_DECES","COMMUNE_NAISSANCE",
        "DATE_DECES","DATE_NAISSANCE","AGE_DECES",
        "DEPARTEMENT_DECES","DEPARTEMENT_NAISSANCE",
        "NOM","PRENOM","PRENOMS",
        "NUM_DECES",
        "PAYS_DECES","PAYS_DECES_CODEISO3",
        "PAYS_NAISSANCE","PAYS_NAISSANCE_CODEISO3",
        "GEOPOINT_NAISSANCE","GEOPOINT_DECES",
        "SEXE","UID",
        "SOURCE", "SOURCE_LINE"],
      // aggs: {
      //   COMMUNE_NAISSANCE: { terms: { field: "COMMUNE_NAISSANCE.keyword", size: 30 } },
      //   PAYS_NAISSANCE: {
      //     terms: { field: "PAYS_NAISSANCE.keyword" }
      //   }
      // },

      // Dynamic values based on current Search UI state
      // --------------------------
      // https://www.elastic.co/guide/en/elasticsearch/reference/7.x/full-text-queries.html
      query: {
        bool: {
          must: [match]
        }
      },
      sort,
      // https://www.elastic.co/guide/en/elasticsearch/reference/7.x/search-request-sort.html
      size,
      from
    };
  }

  return body;
}
