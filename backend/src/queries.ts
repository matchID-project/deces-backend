import { GeoPoint, NameFields, Name } from './models/requestInput';

export const prefixQuery = (field: string, value: string, fuzzy: boolean) => {
    return {
        prefix: {
            [field]: value
        }
    };
};

export const matchQuery = (field: string, value: string|number, fuzzy: boolean) => {
    return {
        match: {
            [field]: value
        }
    }
};

export const fuzzyTermQuery = (field: string, value: string, fuzzy: boolean) => {
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
                            [field]: value
                        }
                    }
                ]
            }
        };
    } else {
        return matchQuery(field, value, false);
    }
};

export const nameQuery = (field: NameFields, value: Name, fuzzy: boolean) => {
    if (fuzzy) {
        return {
            bool: {
                minimum_should_match: 1,
                should: [
                    {
                        bool: {
                            must: [
                                value.first && firstNameQuery([field.first.first, field.first.all], value.first as string, fuzzy),
                                value.last && fuzzyTermQuery(field.last as string, value.last as string, fuzzy)
                            ].filter(x => x),
                            boost: 2
                        },
                    },
                    value.first && value.last && {
                        bool: {
                            must: [
                                firstNameQuery([field.first.first, field.first.all], value.last as string, fuzzy),
                                fuzzyTermQuery(field.last as string, value.first as string, fuzzy)
                            ],
                            boost: 0.5
                        }
                    }
                ].filter(x => x)
            }
        };
    } else {
        return {
            bool: {
                must: [
                    value.first && matchQuery(field.first.first, value.first as string, false),
                    value.last && matchQuery(field.last as string, value.last as string, false)
                ].filter(x => x)
            }
        };
    }
}

export const firstNameQuery = (field: string[], value: string, fuzzy: boolean) => {
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
        return matchQuery(field[0], value, false);
    }
};


export const dateRangeStringQuery = (field: string, value: string, fuzzy: boolean) => {
    if (Array.isArray(value) && (value.length === 2)) {
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
    } else if (value.length < 8){
        return prefixQuery(field, value, false);
    } else {
        return fuzzyTermQuery(field, value, fuzzy)
    }
};

export const ageRangeStringQuery = (field: string, value: string|number, fuzzy: boolean) => {
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
        return matchQuery(field, value, fuzzy)
    }
};

export const geoPointQuery = (field: string, value: GeoPoint, fuzzy: boolean) =>  {
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
