import {
  fullTextWithQuery,
  firstNameWithQuery,
  lastNameWithQuery,
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

import { GeoPoint, RequestBodyInterface } from './requestBodyInterface';

export interface RequestBody {
  [key: string]: any; // Index signature
  q?: string;
  firstName?: string;
  lastName?: string;
  sex?: string;
  birthDate?: string;
  birthCity?: string;
  birthDepartment?: string;
  birthCountry?: string;
  birthGeoPoint?: GeoPoint;
  deathDate?: string;
  deathCity?: string;
  deathDepartment?: string;
  deathCountry?: string;
  deathGeoPoint?: GeoPoint;
  deathAge?: number|string;
  size?: number;
  scroll?: string;
  scrollId?: string;
  page?: number;
  fuzzy?: string;
  sort?: any;
}


export class RequestInputPost extends RequestBodyInterface {
  error: boolean = false;
  constructor(requestBody: RequestBody) {
    super()
    if (requestBody.birthDate) {
      const validRangeYear = /^\d{4}-\d{4}$/.test(requestBody.birthDate);
      const validRangeDate = /^\d{2}\/\d{2}\/\d{4}-\d{2}\/\d{2}\/\d{4}$/.test(requestBody.birthDate);
      const validYear = /^\d{4}$/.test(requestBody.birthDate);
      const validDate = /^\d{2}\/\d{2}\/\d{4}$/.test(requestBody.birthDate);
      if (validRangeYear || validRangeDate || validYear || validDate) {
        this.error = false;
      } else {
        this.error = true;
      }
    }
    if (requestBody.deathDate) {
      const validRangeYear = /^\d{4}-\d{4}$/.test(requestBody.deathDate);
      const validRangeDate = /^\d{2}\/\d{2}\/\d{4}-\d{2}\/\d{2}\/\d{4}$/.test(requestBody.deathDate);
      const validYear = /^\d{4}$/.test(requestBody.deathDate);
      const validDate = /^\d{2}\/\d{2}\/\d{4}$/.test(requestBody.deathDate);
      if (validRangeYear || validRangeDate || validYear || validDate) {
        this.error = false;
      } else {
        this.error = true;
      }
    }
    this.size = requestBody.size ? requestBody.size : 20;
    this.page = requestBody.page ? requestBody.page : 1;
    this.scroll = requestBody.scroll ? requestBody.scroll : '';
    this.scrollId = requestBody.scrollId ? requestBody.scrollId : '';
    this.sort = requestBody.sort ? requestBody.sort: [{score: 'desc'}];

    this.fullText = fullTextWithQuery(requestBody.q, requestBody.fuzzy);
    this.firstName = firstNameWithQuery(requestBody.firstName, requestBody.fuzzy);
    this.lastName = lastNameWithQuery(requestBody.lastName, requestBody.fuzzy);
    this.sex = sexWithQuery(requestBody.sex, requestBody.fuzzy);
    this.birthDate = birthDateWithQuery(requestBody.birthDate, requestBody.fuzzy);
    this.birthCity = birthCityWithQuery(requestBody.birthCity, requestBody.fuzzy);
    this.birthDepartment = birthDepartmentWithQuery(requestBody.birthDepartment, requestBody.fuzzy);
    this.birthCountry = birthCountryWithQuery(requestBody.birthCountry, requestBody.fuzzy);
    this.birthGeoPoint = birthGeoPointWithQuery(requestBody.birthGeoPoint, requestBody.fuzzy);
    this.deathDate = deathDateWithQuery(requestBody.deathDate, requestBody.fuzzy);
    this.deathAge = deathAgeWithQuery(requestBody.deathAge, requestBody.fuzzy);
    this.deathCity = deathCityWithQuery(requestBody.deathCity, requestBody.fuzzy);
    this.deathDepartment = deathDepartmentWithQuery(requestBody.deathDepartment, requestBody.fuzzy);
    this.deathCountry = deathCountryWithQuery(requestBody.deathCountry, requestBody.fuzzy);
    this.deathGeoPoint = deathGeoPointWithQuery(requestBody.deathGeoPoint, requestBody.fuzzy);
  }
}
