import { GeoPoint, NameFields, Name } from './models/entities';

export const prefixQuery = (field: string, value: string, fuzzy: boolean, must: boolean) => {
    return {
        prefix: {
            [field]: value
        }
    };
};

export const matchQuery = (field: string, value: string|number, fuzzy: boolean, must: boolean) => {
    return {
        match: {
            [field]: value
        }
    }
};

export const fuzzyTermQuery = (field: string, value: string, fuzzy: number|string, must: boolean) => {
    if (fuzzy) {
        return {
            match: {
                    [field]: {
                        query: value,
                        fuzziness: fuzzy
                    }
                }
            };
    } else {
        return matchQuery(field, value, false, must);
    }
};

export const fuzzyShouldTermQuery = (field: string, value: string, fuzzy: boolean, must: boolean) => {
    if (fuzzy) {
        return {
            bool: {
                must: [
                    {
                        match: {
                            [field]: {
                                query: value,
                                fuzziness: fuzzy
                            }
                        }
                    }
                ],
                should: [
                    {
                        match: {
                            [`${field}.raw`]: value
                        }
                    }
                ]
            }
        };
    } else {
        return matchQuery(`${field}.raw`, value, false, must);
    }
};

export const nameQuery = (field: NameFields, value: Name, fuzzy: boolean, must: boolean) => {
    const min_should = ((value.last && value.first) ? 2 : 1) - (must ? 0 : 1);
    if (fuzzy) {
        return {
            bool: {
                minimum_should_match: 1,
                should: [
                    {
                        bool: {
                            should: [
                                value.first && firstNameQuery([field.first.first, field.first.all], value.first as string, fuzzy, must),
                                value.last && fuzzyShouldTermQuery(field.last as string, value.last as string, fuzzy, must),
                                value.legal && fuzzyShouldTermQuery(field.legal as string, value.legal as string, fuzzy, must)
                            ].filter(x => x),
                            minimum_should_match: min_should,
                            boost: 2
                        },
                    },
                    value.first && value.last && {
                        bool: {
                            should: [
                                firstNameQuery([field.first.first, field.first.all], value.last as string, fuzzy, must),
                                fuzzyShouldTermQuery(field.last as string, value.first as string, fuzzy, must)
                            ],
                            minimum_should_match: min_should,
                            boost: 0.5
                        }
                    }
                ].filter(x => x)
            }
        };
    } else {
        return {
            bool: {
                minimum_should_match: min_should,
                should: [
                    value.first && matchQuery(field.first.first, value.first as string, false, must),
                    value.last && matchQuery(field.last as string, value.last as string, false, must),
                    value.legal && matchQuery(field.legal as string, value.legal as string, false, must)
                ].filter(x => x)
            }
        };
    }
}

export const firstNameQuery = (field: string[], value: string, fuzzy: boolean, must: boolean) => {
    if (fuzzy) {
        return {
            bool: {
                must: [
                    {
                        match: {
                            [field[1]]: {
                                query: value,
                                fuzziness: fuzzy
                            }
                        }
                    }
                ],
                should: [
                    {
                        match: {
                            [field[0]]: {
                                query: value,
                                boost: 4
                            }
                        }
                    },
                    {
                        match: {
                            [field[0]]: {
                                query: value,
                                fuzziness: fuzzy,
                                boost: 2
                            }
                        }
                    },
                    {
                        match: {
                            [field[1]]: value
                        }
                    }
                ]
            }
        };
    } else {
        return matchQuery(field[0], value, false, must);
    }
};


export const dateRangeStringQuery = (field: string, value: string|string[], fuzzy: boolean, must: boolean) => {
    if (Array.isArray(value) && (value.length === 2)) {
      if (value[0] === null) {
        const max = value[1].padEnd(8,'9');
        return {
            range: {
                [field]: {
                    lt: max
                }
            }
        };
      } else if (value[1] === null) {
        const min = value[0].padEnd(8,'0');
        return {
            range: {
                [field]: {
                    gt: min
                }
            }
        };
      } else {
        let min = (value[0] <= value[1]) ? value[0] : value[1];
        min = min.padEnd(8,'0');
        let max = (value[0] <= value[1]) ? value[1] : value[0];
        max = max.padEnd(8,'9');
        return {
            range: {
                [field]: {
                    gte: min,
                    lte: max
                }
            }
        };
      }
    } else if ((typeof(value) === 'string') && value.length < 8){
        return prefixQuery(field, value, false, must);
    } else if ((typeof(value) === 'string')) {
        return fuzzyShouldTermQuery(field, value, fuzzy, must);
    }
};

export const ageRangeStringQuery = (field: string, value: string|number, fuzzy: boolean, must: boolean) => {
    if (Array.isArray(value) && (value.length === 2)) {
        const min = (Number(value[0]) <= Number(value[1])) ? Number(value[0]) : Number(value[1]);
        const max = (Number(value[0]) <= Number(value[1])) ? Number(value[1]) : Number(value[0]);
        return {
            range: {
                [field]: {
                    gte: min,
                    lte: max
                }
            }
        };
    } else {
        return matchQuery(field, value, fuzzy, must);
    }
};

export const geoPointQuery = (field: string, value: GeoPoint, fuzzy: boolean, must: boolean) =>  {
    if (value.latitude && value.longitude) {
        let distance;
        if (value.distance && /[1-9]\d*\s*(mi|miles|yd|yards|ft|feet|in|inch|km|kilometers|m|meters|cm|centimeters|mm|millimeters|NM|nminauticalmiles)$/.exec(value.distance)) {
            distance = value.distance;
        } else {
            distance = '1km';
        }
        return {
            bool: {
                must: {
                    match_all: {}
                },
                filter : {
                    geo_distance: {
                        distance,
                        [field] : {
                            lat: value.latitude,
                            lon: value.longitude
                        }
                    }
                }
            }
        }
    } else {
        return undefined
    }
}
