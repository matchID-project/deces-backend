import {
    dateRangeTypingMask,
    dateRangeValidationMask,
    dateRangeTransformMask
} from '../masks';
import {
    dateRangeStringQuery,
    firstNameQuery,
    fuzzyTermQuery,
    matchQuery
} from '../queries'
import { RequestBodyInterface } from './requestBodyInterface';



export class RequestInput extends RequestBodyInterface {
  error: boolean = false;
  constructor(q: string, firstName: string, lastName: string, birthDate: string, birthCity: string, birthDepartment: string, birthCountry: string, deathDate: string, deathCity: string, deathDepartment: string, deathCountry: string, size: number, page: number, fuzzy: string, sort: string) {
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
    this.sort = sort ? sort: [{score: 'desc'}];
    this.fullText = {
      path: "fullText",
      url: "q",
      value: q ? q : "",
      field: "fullText",
      placeholder: "prénom, nom, date de naissance ou de décès, ... e.g. Georges Pompidou",
      title: "saisissez en recherche libre nom, prénom, date de naissance ou de décès",
      size: 12,
      active: true,
    }
    this.firstName =  {
      path: "name",
      url: "fn",
      value: firstName ? firstName : "",
      field: ["PRENOM","PRENOMS"],
      query: firstNameQuery,
      fuzzy: (fuzzy && fuzzy === 'false') ? false : "auto",
      placeholder: "Georges",
      title: "saisissez le prénom",
      size: 4,
      active: true,
    }
    this.lastName = {
      path: "name",
      url: "ln",
      value: lastName ? lastName : "",
      field: "NOM",
      section:"nom/prénoms",
      query: fuzzyTermQuery,
      fuzzy: (fuzzy && fuzzy === 'false') ? false : "auto",
      placeholder: "Pompidou",
      title: "saisissez le nom",
      size: 6,
      active: true,
    }
    this.birthDate =  {
      path: "birth.date",
      url: "bd",
      before: "le",
      section:"naissance",
      value: birthDate ? birthDate : "",
      field: "DATE_NAISSANCE",
      placeholder: "1910-1912 ou 1911 ou 05/07/1911",
      query: dateRangeStringQuery,
      fuzzy: (fuzzy && fuzzy === 'false') ? false : "auto",
      title:"saisissez la date de naissance: 05/07/1911 ou 1911 ou un intervalle : 1909-1915, 01/01/1911-01/09/1911",
      mask: {
        typing: dateRangeTypingMask,
        validation: dateRangeValidationMask,
        transform: dateRangeTransformMask
      },
      size: 2,
      active: true
    }

    this.birthCity = {
      path: "birth.location",
      url: "bc",
      before: "à",
      value: birthCity ? birthCity : "",
      field: "COMMUNE_NAISSANCE",
      query: fuzzyTermQuery,
      fuzzy: (fuzzy && fuzzy === 'false') ? false : "auto",
      placeholder: "commune: Montboudif",
      title:"saisissez la commune de naissance",
      size: "3-5",
      active: true,
    }

    this.birthDepartment = {
      path: "birth.location",
      url: "bdep",
      before: "dans le",
      value: birthDepartment ? birthDepartment : "",
      field: "DEPARTEMENT_NAISSANCE",
      query: matchQuery,
      fuzzy: false,
      placeholder: "dépt: 15",
      title:"saisissez le département de naissance",
      size: "1-5",
      active: true,
    }

    this.birthCountry = {
      path: "birth.location",
      url: "bco",
      before: "en/au",
      value: birthCountry ? birthCountry : "",
      field: "PAYS_NAISSANCE",
      query: fuzzyTermQuery,
      fuzzy: (fuzzy && fuzzy === 'false') ? false : "auto",
      title:"saisissez le pays de naissance",
      placeholder: "pays: France",
      size: 3,
      active: true,
    }

    this.deathDate = {
      path: "death.date",
      url: "dd",
      before: "le",
      section:"décès",
      value: deathDate ? deathDate : "",
      field: "DATE_DECES",
      query: dateRangeStringQuery,
      fuzzy: (fuzzy && fuzzy === 'false') ? false : "auto",
      placeholder: "1970-1980 ou 1974 ou 04/02/1974",
      multiQuery: "range",
      title:"saisissez la date de décès: 04/02/1974 ou 1974 ou un intervalle : 1970-1980 ou 01/01/1974-01/06/1974",
      mask: {
        typing: dateRangeTypingMask,
        validation: dateRangeValidationMask,
        transform: dateRangeTransformMask
      },
      size: 2,
      active: true,
    }

    this.deathCity =  {
      path: "death.location",
      url: "dc",
      before: "à",
      value: deathCity ? deathCity : "",
      field: "COMMUNE_DECES",
      query: fuzzyTermQuery,
      fuzzy: (fuzzy && fuzzy === 'false') ? false : "auto",
      title:"saisissez la commune de décès",
      placeholder: "commune: Paris",
      size: "3-5",
      active: true,
    }

    this.deathDepartment = {
      path: "death.location",
      url: "ddep",
      before: "dans le",
      value: deathDepartment ? deathDepartment : "",
      field: "DEPARTEMENT_DECES",
      query: matchQuery,
      fuzzy: false,
      placeholder: "dépt: 75",
      title:"saisissez le département de décès",
      size: "1-5",
      active: true,
    }

    this.deathCountry = {
      path: "death.location",
      url: "dco",
      before: "en/au",
      value: deathCountry ? deathCountry : "",
      field: "PAYS_DECES",
      query: fuzzyTermQuery,
      fuzzy: (fuzzy && fuzzy === 'false') ? false : "auto",
      placeholder: "pays: France",
      title:"saisissez le pays de décès",
      size: 3,
      active: true,
    }

  }
}
