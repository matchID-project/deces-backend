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
    sourceValidationMask
} from './masks';

import {
    dateRangeStringQuery,
    ageRangeStringQuery,
    nameQuery,
    fuzzyShouldTermQuery,
    geoPointQuery,
    matchQuery
} from './queries'

export const fullTextWithQuery = (value: string) => value && {
    value,
    field: "fullText"
};

export const nameWithQuery = (value: Name, fuzzy: boolean) => value && (value.first || value.last) && {
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

export const sexWithQuery = (value: string) => value && {
    value,
    field: "SEXE",
    query: matchQuery,
    fuzzy: false,
    mask: {
        validation: sexValidationMask,
        transform: sexTransformMask
    }
};

export const birthDateWithQuery = (value: string|number, fuzzy: boolean) => value && {
    value,
    field: "DATE_NAISSANCE",
    query: dateRangeStringQuery,
    fuzzy: fuzzy ? "auto" : false,
    mask: {
        validation: dateRangeValidationMask,
        transform: dateRangeTransformMask
    }
};

export const birthCityWithQuery = (value: string, fuzzy: boolean) => value && {
    value,
    field: "COMMUNE_NAISSANCE",
    query: fuzzyShouldTermQuery,
    fuzzy: fuzzy ? "auto" : false
};

export const birthLocationCodeWithQuery = (value: string) => value && {
    value,
    field: "CODE_INSEE_NAISSANCE_HISTORIQUE",
    query: matchQuery,
    fuzzy: false
};

export const birthDepartmentWithQuery = (value: string|number) => value && {
    value,
    field: "DEPARTEMENT_NAISSANCE",
    query: matchQuery,
    fuzzy: false
};

export const birthCountryWithQuery = (value: string, fuzzy: boolean) => value && {
    value,
    field: "PAYS_NAISSANCE",
    query: fuzzyShouldTermQuery,
    fuzzy: fuzzy ? "auto" : false
};

export const birthGeoPointWithQuery = (value: GeoPoint) => value && {
    value,
    field: "GEOPOINT_NAISSANCE",
    query: geoPointQuery,
    fuzzy: false
};

export const deathDateWithQuery = (value: string|number, fuzzy: boolean) => value && {
    value,
    field: "DATE_DECES",
    query: dateRangeStringQuery,
    fuzzy: fuzzy ? "auto" : false,
    mask: {
        validation: dateRangeValidationMask,
        transform: dateRangeTransformMask
    }
};

export const deathAgeWithQuery = (value: string|number) => value && {
    value,
    field: "AGE_DECES",
    query: ageRangeStringQuery,
    fuzzy: false,
    mask: {
      validation: ageRangeValidationMask,
      transform: ageRangeTransformMask
    }
  }

export const deathCityWithQuery = (value: string, fuzzy: boolean) => value && {
    value,
    field: "COMMUNE_DECES",
    query: fuzzyShouldTermQuery,
    fuzzy: fuzzy ? "auto" : false
};

export const deathLocationCodeWithQuery = (value: string) => value && {
    value,
    field: "CODE_INSEE_DECES_HISTORIQUE",
    query: matchQuery,
    fuzzy: false
};

export const deathDepartmentWithQuery = (value: string|number) => value && {
    value,
    field: "DEPARTEMENT_DECES",
    query: matchQuery,
    fuzzy: false
};

export const deathCountryWithQuery = (value: string, fuzzy: boolean) => value && {
    value,
    field: "PAYS_DECES",
    query: fuzzyShouldTermQuery,
    fuzzy: fuzzy ? "auto" : false
};

export const deathGeoPointWithQuery = (value: GeoPoint) => value && {
    value,
    field: "GEOPOINT_DECES",
    query: geoPointQuery,
    fuzzy: false
};

export const sortWithQuery = (value: string|Sort[]) => value && {
    value,
    mask: {
        validation: sortValidationMask
    }
};

export const aggsWithQuery = (value: string|string[]) => value && {
    value,
    mask: {
      validation: aggsValidationMask,
      transform: aggsTransformMask
    }
};

export const fuzzyWithQuery = (value: string|boolean) => value !== undefined && {
    value,
    mask: {
      validation: fuzzyValidation,
      transform: fuzzyTransform
    }
};

export const sourceWithQuery = (value: string) => value && {
    value,
    query: matchQuery,
    field: "SOURCE",
    mask: {
      validation: sourceValidationMask
    }
};
