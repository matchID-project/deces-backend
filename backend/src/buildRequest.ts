import { RequestBodyInterface, buildSort } from './types/requestInput';
import { BodyResponse } from './types/body';
import NameQuery from './types/queries';
import buildRequestFilter from "./buildRequestFilter";

function buildMatch(requestInput: RequestBodyInterface) {
  if (requestInput.fullText.value) {
    return buildSimpleMatch(requestInput.fullText.value)
  } else {
    return buildAvancedMatch(requestInput)
  }
}

function buildSimpleMatch(searchInput: string) {
  const searchTerm = searchInput.normalize('NFKD').replace(/[\u0300-\u036f]/g, "").split(/\s+/)
  let date = searchTerm.filter( x => x.match(/^\d{2}\/\d{2}\/\d{4}$/)).map( x => x.replace(/(\d{2})\/(\d{2})\/(\d{4})/,"$3$2$1"));
  date = date.length ? [date[0]] : null;
  const names = searchTerm.filter( x => x.match(/[a-z]+/)).filter( x => !x.match(/^(el|d|le|de|la|los)$/));

  const defaultQuery = { match_all: {} }

  let namesQuery
  let dateQuery

  if (names.length > 0) {
    namesQuery = new NameQuery(names);

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

function buildAvancedMatch(searchInput: RequestBodyInterface) {
  return {
    function_score: {
      query: {
        bool: {
          must: Object.keys(searchInput).map(key => {
            const value = searchInput[key].mask && searchInput[key].mask.transform && searchInput[key].value
                        ? searchInput[key].mask.transform(searchInput[key].value)
                        : searchInput[key].value;
            if (value) {
              return searchInput[key].query(searchInput[key].field, value, searchInput[key].fuzzy)
            }
          }).filter(x => x),
        }
      }
    }
  }
}

function buildFrom(current: number, resultsPerPage: number) {
  if (!current || !resultsPerPage) return;
  return (current - 1) * resultsPerPage;
}

export default function buildRequest(requestInput: RequestBodyInterface): BodyResponse {
  const sort = buildSort(requestInput.sort);
  const match = buildMatch(requestInput);
  // const filter = buildRequestFilter(myFilters); // TODO
  const size = requestInput.size;
  const from = buildFrom(requestInput.page, size);
  const body = {
    // Static query Configuration
    // --------------------------
    // https://www.elastic.co/guide/en/elasticsearch/reference/7.x/search-request-highlighting.html
    min_score: (requestInput.fullText.value ? 5: 0),
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
      "DATE_DECES","DATE_NAISSANCE",
      "DEPARTEMENT_DECES","DEPARTEMENT_NAISSANCE",
      "NOM","PRENOM","PRENOMS",
      "NUM_DECES",
      "PAYS_DECES","PAYS_DECES_CODEISO3",
      "PAYS_NAISSANCE","PAYS_NAISSANCE_CODEISO3",
      "SEXE","UID",
      "SOURCE"],
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
    sort: sort,
    // https://www.elastic.co/guide/en/elasticsearch/reference/7.x/search-request-sort.html
    size,
    from
  };

  return body;
}
