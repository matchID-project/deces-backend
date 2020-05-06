import {
  fullTextWithQuery,
  nameWithQuery,
  sexWithQuery,
  birthDateWithQuery,
  birthCityWithQuery,
  birthDepartmentWithQuery,
  birthCountryWithQuery,
  birthGeoPointWithQuery,
  deathDateWithQuery,
  deathAgeWithQuery,
  deathCityWithQuery,
  deathDepartmentWithQuery,
  deathCountryWithQuery,
  deathGeoPointWithQuery
} from '../fieldsWithQueries';

export interface Name {
  first: string|string[];
  last: string|string[];
};

export interface GeoPoint {
  latitude: number;
  longitude: number;
  distance: string;
};

export interface NameFields {
  first?: {
    first?: string;
    all?: string;
  };
  last: string|string[];
};

export interface RequestField {
  value: string|Name|number|GeoPoint;
  field?: string|string[]|NameFields;
  query?: any;
  fuzzy?: string|boolean;
  mask?: {
    validation?: any;
    transform?: any;
  };
};

/**
 * This is an example of advanced request, there is no q parameter.
 * @tsoaModel
 * @example
 * {
 *   "firstName": "Georges",
 *   "lastName": "Pompidou",
 *   "sex": "M",
 *   "deathCity": "Paris"
 * }
 */
export interface RequestBody {
 [key: string]: any; // Index signature
 scroll?: string;
 scrollId?: string;
 size?: number;
 page?: number;
 fullText?: string;
 firstName?: string;
 lastName?: string;
 sex?: string;
 birthDate?: string|number;
 birthCity?: string;
 birthDepartment?: string;
 birthCountry?: string;
 birthGeoPoint?: GeoPoint;
 deathDate?: string|number;
 deathCity?: string;
 deathDepartment?: string;
 deathCountry?: string;
 deathGeoPoint?: GeoPoint;
 deathAge?: string|number;
};

export class RequestInput {
  [key: string]: any; // Index signature
  fullText?: RequestField;
  firstName?: RequestField;
  lastName?: RequestField;
  sex?: RequestField;
  birthDate?: RequestField;
  birthCity?: RequestField;
  birthDepartment?: RequestField;
  birthCountry?: RequestField;
  birthGeoPoint?: RequestField;
  deathDate?: RequestField;
  deathCity?: RequestField;
  deathDepartment?: RequestField;
  deathCountry?: RequestField;
  deathGeoPoint?: RequestField;
  deathAge?: RequestField;
  size?: number;
  scroll?: string;
  scrollId?: string;
  page?: number;
  fuzzy?: string;
  sort?: any;
  errors: string[] = [];
  constructor(q?: string, firstName?: string, lastName?: string, sex?: string, birthDate?: string|number, birthCity?: string, birthDepartment?: string, birthCountry?: string, birthGeoPoint?: GeoPoint, deathDate?: string|number, deathCity?: string, deathDepartment?: string, deathCountry?: string, deathGeoPoint?: GeoPoint, deathAge?: string|number, scroll?: string, scrollId?: string, size?: number, page?: number, fuzzy?: string, sort?: string) {
    this.size = size ? size : 20;
    this.page = page ? page : 1;
    this.scroll = scroll ? scroll : '';
    this.scrollId = scrollId ? scrollId : '';
    this.sort = sort ? sort: [{score: 'desc'}];

    this.fullText = fullTextWithQuery(q, fuzzy);
    this.name = nameWithQuery({
      first: firstName,
      last: lastName
    }, fuzzy);
    this.sex = sexWithQuery(sex, fuzzy);
    this.birthDate = birthDateWithQuery(birthDate, fuzzy);
    this.birthCity = birthCityWithQuery(birthCity, fuzzy);
    this.birthDepartment = birthDepartmentWithQuery(birthDepartment, fuzzy);
    this.birthCountry = birthCountryWithQuery(birthCountry, fuzzy);
    this.birthGeoPoint = birthGeoPointWithQuery(birthGeoPoint, fuzzy);
    this.deathDate = deathDateWithQuery(deathDate, fuzzy);
    this.deathAge = deathAgeWithQuery(deathAge, fuzzy);
    this.deathCity = deathCityWithQuery(deathCity, fuzzy);
    this.deathDepartment = deathDepartmentWithQuery(deathDepartment, fuzzy);
    this.deathCountry = deathCountryWithQuery(deathCountry, fuzzy);
    this.deathGeoPoint = deathGeoPointWithQuery(deathGeoPoint, fuzzy);

    Object.keys(this).map(field => {
      if (this[field] && this[field].mask && this[field].mask.validation) {
        if (!this[field].mask.validation(this[field].value)) {
          this.errors.push(`invalid ${field} value: ${this[field].value}`);
        }
      }
    });

  }
}
