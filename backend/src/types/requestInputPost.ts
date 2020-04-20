import {
  dateRangeTypingMask,
  dateRangeValidationMask,
  dateRangeTransformMask,
  ageRangeTransformMask
} from '../masks';
import {
  dateRangeStringQuery,
  firstNameQuery,
  fuzzyTermQuery,
  matchQuery,
  geoPointQuery,
  ageRangeStringQuery
} from '../queries'
import { RequestBodyInterface } from './requestBodyInterface';

export interface GeoPoint {
  latitude: number;
  longitude: number;
  distance: string;
}

export interface RequestBody {
  [key: string]: any; // Index signature
  q?: string;
  firstName?: string;
  lastName?: string;
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
    this.page = requestBody.page ? requestBody.page: 1;
    this.sort = requestBody.sort ? requestBody.sort: [{score: 'desc'}];
    this.fullText = {
      path: "fullText",
      url: "q",
      value: requestBody.q ? requestBody.q : "",
      field: "fullText",
      placeholder: "prénom, nom, date de naissance ou de décès, ... e.g. Georges Pompidou",
      title: "saisissez en recherche libre nom, prénom, date de naissance ou de décès",
      size: 12,
      active: true,
    }
    this.firstName =  {
      path: "name",
      url: "fn",
      value: requestBody.firstName ? requestBody.firstName : "",
      field: ["PRENOM","PRENOMS"],
      query: firstNameQuery,
      fuzzy: (requestBody.fuzzy && requestBody.fuzzy === 'false') ? false : "auto",
      placeholder: "Georges",
      title: "saisissez le prénom",
      size: 4,
      active: true,
    }
    this.lastName = {
      path: "name",
      url: "ln",
      value: requestBody.lastName ? requestBody.lastName : "",
      field: "NOM",
      section:"nom/prénoms",
      query: fuzzyTermQuery,
      fuzzy: (requestBody.fuzzy && requestBody.fuzzy === 'false') ? false : "auto",
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
      value: requestBody.birthDate ? requestBody.birthDate : "",
      field: "DATE_NAISSANCE",
      placeholder: "1910-1912 ou 1911 ou 05/07/1911",
      query: dateRangeStringQuery,
      fuzzy: (requestBody.fuzzy && requestBody.fuzzy === 'false') ? false : "auto",
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
      value: requestBody.birthCity ? requestBody.birthCity : "",
      field: "COMMUNE_NAISSANCE",
      query: fuzzyTermQuery,
      fuzzy: (requestBody.fuzzy && requestBody.fuzzy === 'false') ? false : "auto",
      placeholder: "commune: Montboudif",
      title:"saisissez la commune de naissance",
      size: "3-5",
      active: true,
    }

    this.birthDepartment = {
      path: "birth.location",
      url: "bdep",
      before: "dans le",
      value: requestBody.birthDepartment ? requestBody.birthDepartment : "",
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
      value: requestBody.birthCountry ? requestBody.birthCountry : "",
      field: "PAYS_NAISSANCE",
      query: fuzzyTermQuery,
      fuzzy: (requestBody.fuzzy && requestBody.fuzzy === 'false') ? false : "auto",
      title:"saisissez le pays de naissance",
      placeholder: "pays: France",
      size: 3,
      active: true,
    }

    this.birthGeoPoint = {
      path: "birth.location",
      url: "bgp",
      value: requestBody.birthGeoPoint ? requestBody.birthGeoPoint : {},
      field: "GEOPOINT_NAISSANCE",
      query: geoPointQuery,
      fuzzy: false,
      title:"saisissez les coordonnées de naissance",
      placeholder: "latitude/longitude: [45.7833, 3.0833]",
      size: 5,
      active: false,
    }

    this.deathDate = {
      path: "death.date",
      url: "dd",
      before: "le",
      section:"décès",
      value: requestBody.deathDate ? requestBody.deathDate : "",
      field: "DATE_DECES",
      query: dateRangeStringQuery,
      fuzzy: (requestBody.fuzzy && requestBody.fuzzy === 'false') ? false : "auto",
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

    this.deathAge = {
      path: "death.age",
      url: "dd",
      before: "à",
      section:"décès",
      value: requestBody.deathAge ? requestBody.deathAge : null,
      field: "AGE_DECES",
      query: ageRangeStringQuery,
      fuzzy: false,
      placeholder: "70-74 ou 52",
      multiQuery: "range",
      title:"saisissez l'age de décès: 52 ou un intervalle : 70-74",
      mask: {
        typing: null, // TODO
        validation: null, // TODO
        transform: ageRangeTransformMask
      },
      size: 2,
      active: true,
    }

    this.deathCity =  {
      path: "death.location",
      url: "dc",
      before: "à",
      value: requestBody.deathCity ? requestBody.deathCity : "",
      field: "COMMUNE_DECES",
      query: fuzzyTermQuery,
      fuzzy: (requestBody.fuzzy && requestBody.fuzzy === 'false') ? false : "auto",
      title:"saisissez la commune de décès",
      placeholder: "commune: Paris",
      size: "3-5",
      active: true,
    }

    this.deathDepartment = {
      path: "death.location",
      url: "ddep",
      before: "dans le",
      value: requestBody.deathDepartment ? requestBody.deathDepartment : "",
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
      value: requestBody.deathCountry ? requestBody.deathCountry : "",
      field: "PAYS_DECES",
      query: fuzzyTermQuery,
      fuzzy: (requestBody.fuzzy && requestBody.fuzzy === 'false') ? false : "auto",
      placeholder: "pays: France",
      title:"saisissez le pays de décès",
      size: 3,
      active: true,
    }
    this.deathGeoPoint = {
      path: "death.location",
      url: "dgp",
      value: requestBody.deathGeoPoint ? requestBody.deathGeoPoint : {},
      field: "GEOPOINT_DECES",
      query: geoPointQuery,
      fuzzy: false,
      title:"saisissez les coordonnées de naissance",
      placeholder: "latitude/longitude distance: [45.7833, 3.0833] 1km",
      size: 5,
      active: false,
    }

  }
}
