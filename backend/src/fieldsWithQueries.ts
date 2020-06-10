import { GeoPoint, Name, Sort } from './models/entities';

import {
    dateRangeValidationMask,
    dateRangeTransformMask,
    ageRangeTransformMask,
    ageRangeValidationMask,
    sexTransformMask,
    sexValidationMask,
    sortValidationMask
} from './masks';

import {
    dateRangeStringQuery,
    ageRangeStringQuery,
    nameQuery,
    fuzzyShouldTermQuery,
    geoPointQuery,
    matchQuery
} from './queries'

export const fullTextWithQuery = (value: string, fuzzy: string|boolean) => value && {
    value,
    field: "fullText"
};

export const nameWithQuery = (value: Name, fuzzy: string|boolean) => value && (value.first || value.last) && {
    value,
    field: {
        first: {
            first: "PRENOM",
            all: "PRENOMS"
        },
        last: "NOM"
    },
    query: nameQuery,
    fuzzy: (fuzzy && fuzzy === 'false') ? false : "auto"
};

export const sexWithQuery = (value: string, fuzzy: string|boolean) => value && {
    value,
    field: "SEXE",
    query: matchQuery,
    fuzzy: false,
    mask: {
        validation: sexValidationMask,
        transform: sexTransformMask
    }
};

export const birthDateWithQuery = (value: string|number, fuzzy: string|boolean) => value && {
    value,
    field: "DATE_NAISSANCE",
    query: dateRangeStringQuery,
    fuzzy: (fuzzy && fuzzy === 'false') ? false : "auto",
    mask: {
        validation: dateRangeValidationMask,
        transform: dateRangeTransformMask
    }
};

export const birthCityWithQuery = (value: string, fuzzy: string|boolean) => value && {
    value,
    field: "COMMUNE_NAISSANCE",
    query: fuzzyShouldTermQuery,
    fuzzy: (fuzzy && fuzzy === 'false') ? false : "auto"
};

export const birthDepartmentWithQuery = (value: string, fuzzy: string|boolean) => value && {
    value,
    field: "DEPARTEMENT_NAISSANCE",
    query: matchQuery,
    fuzzy: false
};

export const birthCountryWithQuery = (value: string, fuzzy: string|boolean) => value && {
    value,
    field: "PAYS_NAISSANCE",
    query: fuzzyShouldTermQuery,
    fuzzy: (fuzzy && fuzzy === 'false') ? false : "auto"
};

export const birthGeoPointWithQuery = (value: GeoPoint, fuzzy: string|boolean) => value && {
    value,
    field: "GEOPOINT_NAISSANCE",
    query: geoPointQuery,
    fuzzy: false
};

export const deathDateWithQuery = (value: string|number, fuzzy: string|boolean) => value && {
    value,
    field: "DATE_DECES",
    query: dateRangeStringQuery,
    fuzzy: (fuzzy && fuzzy === 'false') ? false : "auto",
    mask: {
        validation: dateRangeValidationMask,
        transform: dateRangeTransformMask
    }
};

export const deathAgeWithQuery = (value: string|number, fuzzy: string|boolean) => value && {
    value,
    field: "AGE_DECES",
    query: ageRangeStringQuery,
    fuzzy: false,
    mask: {
      validation: ageRangeValidationMask,
      transform: ageRangeTransformMask
    }
  }

export const deathCityWithQuery = (value: string, fuzzy: string|boolean) => value && {
    value,
    field: "COMMUNE_DECES",
    query: fuzzyShouldTermQuery,
    fuzzy: (fuzzy && fuzzy === 'false') ? false : "auto"
};

export const deathDepartmentWithQuery = (value: string, fuzzy: string|boolean) => value && {
    value,
    field: "DEPARTEMENT_DECES",
    query: matchQuery,
    fuzzy: false
};

export const deathCountryWithQuery = (value: string, fuzzy: string|boolean) => value && {
    value,
    field: "PAYS_DECES",
    query: fuzzyShouldTermQuery,
    fuzzy: (fuzzy && fuzzy === 'false') ? false : "auto"
};

export const deathGeoPointWithQuery = (value: GeoPoint, fuzzy: string|boolean) => value && {
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
