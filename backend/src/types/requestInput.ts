import {
  fullTextWithQuery,
  firstNameWithQuery,
  lastNameWithQuery,
  sexWithQuery,
  birthDateWithQuery,
  birthCityWithQuery,
  birthDepartmentWithQuery,
  birthCountryWithQuery,
  deathDateWithQuery,
  deathCityWithQuery,
  deathDepartmentWithQuery,
  deathCountryWithQuery,
  deathAgeWithQuery
} from '../fieldsWithQueries';

import { RequestBodyInterface } from './requestBodyInterface';

export class RequestInput extends RequestBodyInterface {
  error: boolean = false;
  constructor(q: string, firstName: string, lastName: string, sex: string, birthDate: string, birthCity: string, birthDepartment: string, birthCountry: string, deathDate: string, deathCity: string, deathDepartment: string, deathCountry: string, deathAge: string|number, scroll: string, scrollId: string, size: number, page: number, fuzzy: string, sort: string) {
    super()
    if (birthDate) {
      const validRangeYear = /^\d{4}-\d{4}$/.test(birthDate);
      const validRangeDate = /^\d{2}\/\d{2}\/\d{4}-\d{2}\/\d{2}\/\d{4}$/.test(birthDate);
      const validYear = /^\d{4}$/.test(birthDate);
      const validDate = /^\d{2}\/\d{2}\/\d{4}$/.test(birthDate);
      if (validRangeYear || validRangeDate || validYear || validDate) {
        this.error = false;
      } else {
        this.error = true;
      }
    }
    if (deathDate) {
      const validRangeYear = /^\d{4}-\d{4}$/.test(deathDate);
      const validRangeDate = /^\d{2}\/\d{2}\/\d{4}-\d{2}\/\d{2}\/\d{4}$/.test(deathDate);
      const validYear = /^\d{4}$/.test(deathDate);
      const validDate = /^\d{2}\/\d{2}\/\d{4}$/.test(deathDate);
      if (validRangeYear || validRangeDate || validYear || validDate) {
        this.error = false;
      } else {
        this.error = true;
      }
    }
    this.size = size ? size : 20;
    this.page = page ? page : 1;
    this.scroll = scroll ? scroll : "";
    this.scrollId = scrollId ? scrollId : "";
    this.sort = sort ? sort: [{score: 'desc'}];

    this.fullText = fullTextWithQuery(q, fuzzy);
    this.firstName = firstNameWithQuery(firstName, fuzzy);
    this.lastName = lastNameWithQuery(lastName, fuzzy);
    this.sex = sexWithQuery(sex, fuzzy);
    this.birthDate = birthDateWithQuery(birthDate, fuzzy);
    this.birthCity = birthCityWithQuery(birthCity, fuzzy);
    this.birthDepartment = birthDepartmentWithQuery(birthDepartment, fuzzy);
    this.birthCountry = birthCountryWithQuery(birthCountry, fuzzy);
    this.deathDate = deathDateWithQuery(deathDate, fuzzy);
    this.deathCity = deathCityWithQuery(deathCity, fuzzy);
    this.deathDepartment = deathDepartmentWithQuery(deathDepartment, fuzzy);
    this.deathCountry = deathCountryWithQuery(deathCountry, fuzzy);
    this.deathAge = deathAgeWithQuery(deathAge, fuzzy);

  }
}
