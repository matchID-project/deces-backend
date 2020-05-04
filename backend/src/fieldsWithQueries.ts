import { GeoPoint } from './types/requestBodyInterface';

import {
    dateRangeTypingMask,
    dateRangeValidationMask,
    dateRangeTransformMask,
    ageRangeTransformMask,
    ageRangeValidationMask,
    ageRangeTypingMask,
    sexTransformMask,
    sexValidationMask,
    sexTypingMask
} from './masks';

import {
    dateRangeStringQuery,
    ageRangeStringQuery,
    firstNameQuery,
    fuzzyTermQuery,
    geoPointQuery,
    matchQuery
} from './queries'

export const fullTextWithQuery = (value: string, fuzzy: string|boolean) => value && {
    value: value,
    field: "fullText"
};

export const firstNameWithQuery = (value: string, fuzzy: string|boolean) => value && {
    value: value,
    field: ["PRENOM","PRENOMS"],
    query: firstNameQuery,
    fuzzy: (fuzzy && fuzzy === 'false') ? false : "auto"
};

export const lastNameWithQuery = (value: string, fuzzy: string|boolean) => value && {
    value: value,
    field: "NOM",
    query: fuzzyTermQuery,
    fuzzy: (fuzzy && fuzzy === 'false') ? false : "auto"
};

export const sexWithQuery = (value: string, fuzzy: string|boolean) => value && {
    value: value,
    field: "SEXE",
    query: matchQuery,
    fuzzy: false,
    mask: {
        typing: sexTypingMask,
        validation: sexValidationMask,
        transform: sexTransformMask
    }
};

export const birthDateWithQuery = (value: string, fuzzy: string|boolean) => value && {
    value: value,
    field: "DATE_NAISSANCE",
    query: dateRangeStringQuery,
    fuzzy: (fuzzy && fuzzy === 'false') ? false : "auto",
    mask: {
        typing: dateRangeTypingMask,
        validation: dateRangeValidationMask,
        transform: dateRangeTransformMask
    }
};

export const birthCityWithQuery = (value: string, fuzzy: string|boolean) => value && {
    value: value,
    field: "COMMUNE_NAISSANCE",
    query: fuzzyTermQuery,
    fuzzy: (fuzzy && fuzzy === 'false') ? false : "auto"
};

export const birthDepartmentWithQuery = (value: string, fuzzy: string|boolean) => value && {
    value: value,
    field: "DEPARTEMENT_NAISSANCE",
    query: matchQuery,
    fuzzy: false
};

export const birthCountryWithQuery = (value: string, fuzzy: string|boolean) => value && {
    value: value,
    field: "PAYS_NAISSANCE",
    query: fuzzyTermQuery,
    fuzzy: (fuzzy && fuzzy === 'false') ? false : "auto"
};

export const birthGeoPointWithQuery = (value: GeoPoint, fuzzy: string|boolean) => value && {
    value: value,
    field: "GEOPOINT_NAISSANCE",
    query: geoPointQuery,
    fuzzy: false
};

export const deathDateWithQuery = (value: string, fuzzy: string|boolean) => value && {
    value: value,
    field: "DATE_DECES",
    query: dateRangeStringQuery,
    fuzzy: (fuzzy && fuzzy === 'false') ? false : "auto",
    mask: {
        typing: dateRangeTypingMask,
        validation: dateRangeValidationMask,
        transform: dateRangeTransformMask
    }
};

export const deathAgeWithQuery = (value: string|number, fuzzy: string|boolean) => value && {
    value: value,
    field: "AGE_DECES",
    query: ageRangeStringQuery,
    fuzzy: false,
    mask: {
      typing: ageRangeTypingMask,
      validation: ageRangeValidationMask,
      transform: ageRangeTransformMask
    }
  }

export const deathCityWithQuery = (value: string, fuzzy: string|boolean) => value && {
    value: value,
    field: "COMMUNE_DECES",
    query: fuzzyTermQuery,
    fuzzy: (fuzzy && fuzzy === 'false') ? false : "auto"
};

export const deathDepartmentWithQuery = (value: string, fuzzy: string|boolean) => value && {
    value: value,
    field: "DEPARTEMENT_DECES",
    query: matchQuery,
    fuzzy: false
};

export const deathCountryWithQuery = (value: string, fuzzy: string|boolean) => value && {
    value: value,
    field: "PAYS_DECES",
    query: fuzzyTermQuery,
    fuzzy: (fuzzy && fuzzy === 'false') ? false : "auto"
};

export const deathGeoPointWithQuery = (value: GeoPoint, fuzzy: string|boolean) => value && {
    value: value,
    field: "GEOPOINT_DECES",
    query: geoPointQuery,
    fuzzy: false
};
