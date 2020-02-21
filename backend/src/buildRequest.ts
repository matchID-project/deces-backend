export default function buildRequest(searchInput: string) {
  let searchTerm = searchInput.normalize('NFKD').replace(/[\u0300-\u036f]/g, "").split(/\s+/)
  let date = searchTerm.filter( x => x.match(/^\d{2}\/\d{2}\/\d{4}$/)).map( x => x.replace(/(\d{2})\/(\d{2})\/(\d{4})/,"$3$2$1"));
  let names = searchTerm.filter( x => x.match(/[a-z]+/)).filter( x => !x.match(/^(el|d|le|de|la|los)$/));

  let names_query
  if (names.length > 0) {
    names_query = {
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
      names_query.bool.must.push(
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

  const body = {
    // Static query Configuration
    // --------------------------
    // https://www.elastic.co/guide/en/elasticsearch/reference/7.x/search-request-highlighting.html
    min_score: 5,
    // highlight: {
    //   fragment_size: 200,
    //   number_of_fragments: 1,
    //   fields: {
    //     title: {},
    //     description: {}
    //   }
    // },
    //https://www.elastic.co/guide/en/elasticsearch/reference/7.x/search-request-source-filtering.html#search-request-source-filtering
    _source: [
      "CODE_INSEE_DECES","CODE_INSEE_NAISSANCE",
      "COMMUNE_DECES","COMMUNE_NAISSANCE",
      "DATE_DECES","DATE_NAISSANCE",
      "DEPARTEMENT_DECES","DEPARTEMENT_NAISSANCE",
      "NOM","PRENOM","PRENOMS",
      "NUM_DECES",
      "PAYS_DECES","PAYS_DECES_CODEISO3",
      "PAYS_NAISSANCE","PAYS_NAISSANCE_CODEISO3",
      "SEXE","UID"],
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
        must: [names_query]
      }
    },
    // https://www.elastic.co/guide/en/elasticsearch/reference/7.x/search-request-sort.html
    size: 20,
    from: 0
  };

  return body;
}
