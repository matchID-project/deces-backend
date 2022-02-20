import { GeoPoint, Name, Sort } from './models/entities';

import {
    dateRangeValidationMask,
    dateRangeTransformMask,
    ageRangeTransformMask,
    ageRangeValidationMask,
    sexTransformMask,
    sexValidationMask,
    sortValidationMask,
    aggsValidationMask,
    aggsTransformMask,
    fuzzyValidation,
    fuzzyTransform,
    sourceValidationMask,
    geoPointValidationMask,
    geoPointTransformMask
} from './masks';

import {
    dateRangeStringQuery,
    ageRangeStringQuery,
    nameQuery,
    fuzzyShouldTermQuery,
    geoPointQuery,
    matchQuery
} from './queries'

interface WithQuery {
    value: any;
    field?: any;
    query?: any;
    fuzzy?: any;
    mask?: any;
}

export const fullTextWithQuery = (value: string): WithQuery => value && {
    value,
    field: "fullText"
};

export const nameWithQuery = (value: Name, fuzzy: boolean): WithQuery => value && (value.first || value.last) && {
    value,
    field: {
        first: {
            first: "PRENOM",
            all: "PRENOMS"
        },
        last: "NOM",
        legal: "NOM"
    },
    query: nameQuery,
    fuzzy: fuzzy ? "auto" : false
};

export const sexWithQuery = (value: string): WithQuery => value && {
    value,
    field: "SEXE",
    query: matchQuery,
    fuzzy: false,
    mask: {
        validation: sexValidationMask,
        transform: sexTransformMask
    }
};

export const birthDateWithQuery = (value: string|number, fuzzy: boolean): WithQuery => value && {
    value,
    field: "DATE_NAISSANCE",
    query: dateRangeStringQuery,
    fuzzy: fuzzy ? "auto" : false,
    mask: {
        validation: dateRangeValidationMask,
        transform: dateRangeTransformMask
    }
};

export const birthCityWithQuery = (value: string, fuzzy: boolean): WithQuery => value && {
    value,
    field: "COMMUNE_NAISSANCE",
    query: fuzzyShouldTermQuery,
    fuzzy: fuzzy ? "auto" : false
};

export const birthPostalCodeWithQuery = (value: string): WithQuery => value && {
    value,
    field: "CODE_POSTAL_NAISSANCE",
    query: matchQuery,
    fuzzy: false
};

export const birthLocationCodeWithQuery = (value: string): WithQuery => value && {
    value,
    field: "CODE_INSEE_NAISSANCE_HISTORIQUE",
    query: matchQuery,
    fuzzy: false
};

export const birthDepartmentWithQuery = (value: string|number): WithQuery => value && {
    value,
    field: "DEPARTEMENT_NAISSANCE",
    query: matchQuery,
    fuzzy: false
};

export const birthCountryWithQuery = (value: string, fuzzy: boolean): WithQuery => value && {
    value,
    field: "PAYS_NAISSANCE",
    query: fuzzyShouldTermQuery,
    fuzzy: fuzzy ? "auto" : false
};

export const birthGeoPointWithQuery = (value: GeoPoint|string): WithQuery => value && {
    value,
    mask: {
        validation: geoPointValidationMask,
        transform: geoPointTransformMask
    },
    field: "GEOPOINT_NAISSANCE",
    query: geoPointQuery,
    fuzzy: false
};

export const deathDateWithQuery = (value: string|number, fuzzy: boolean): WithQuery => value && {
    value,
    field: "DATE_DECES",
    query: dateRangeStringQuery,
    fuzzy: fuzzy ? "auto" : false,
    mask: {
        validation: dateRangeValidationMask,
        transform: dateRangeTransformMask
    }
};

export const deathAgeWithQuery = (value: string|number): WithQuery => value && {
    value,
    field: "AGE_DECES",
    query: ageRangeStringQuery,
    fuzzy: false,
    mask: {
      validation: ageRangeValidationMask,
      transform: ageRangeTransformMask
    }
  }

export const deathCityWithQuery = (value: string, fuzzy: boolean): WithQuery => value && {
    value,
    field: "COMMUNE_DECES",
    query: fuzzyShouldTermQuery,
    fuzzy: fuzzy ? "auto" : false
};

export const deathPostalCodeWithQuery = (value: string): WithQuery => value && {
    value,
    field: "CODE_POSTAL_DECES",
    query: matchQuery,
    fuzzy: false
};

export const deathLocationCodeWithQuery = (value: string): WithQuery => value && {
    value,
    field: "CODE_INSEE_DECES_HISTORIQUE",
    query: matchQuery,
    fuzzy: false
};

export const deathDepartmentWithQuery = (value: string|number): WithQuery => value && {
    value,
    field: "DEPARTEMENT_DECES",
    query: matchQuery,
    fuzzy: false
};

export const deathCountryWithQuery = (value: string, fuzzy: boolean): WithQuery => value && {
    value,
    field: "PAYS_DECES",
    query: fuzzyShouldTermQuery,
    fuzzy: fuzzy ? "auto" : false
};

export const deathGeoPointWithQuery = (value: GeoPoint|string): WithQuery => value && {
    value,
    mask: {
        validation: geoPointValidationMask,
        transform: geoPointTransformMask
    },
    field: "GEOPOINT_DECES",
    query: geoPointQuery,
    fuzzy: false
};

export const sortWithQuery = (value: string|Sort[]): WithQuery => value && {
    value,
    mask: {
        validation: sortValidationMask
    }
};

export const aggsWithQuery = (value: string|string[]): WithQuery => value && {
    value,
    mask: {
      validation: aggsValidationMask,
      transform: aggsTransformMask
    }
};

export const fuzzyWithQuery = (value: string|boolean): WithQuery => value !== undefined && {
    value,
    mask: {
      validation: fuzzyValidation,
      transform: fuzzyTransform
    }
};

export const sourceWithQuery = (value: string): WithQuery => value && {
    value,
    query: matchQuery,
    field: "SOURCE",
    mask: {
      validation: sourceValidationMask
    }
};
