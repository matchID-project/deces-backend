import {
    dateRangeTypingMask,
    dateRangeValidationMask,
    dateRangeTransformMask
} from '../masks';
import {
    prefixQuery,
    dateRangeStringQuery,
    firstNameQuery,
    fuzzyTermQuery,
    matchQuery
} from '../queries'

export default class RequestInput {
  fullText: {
    path: string;
    url: string;
    value: string;
    field: string;
    placeholder: string;
    title: string;
    size: number;
    active: boolean;
  };
  firstName: {
    path: string;
    url: string;
    value: string;
    field: string[];
    query: any;
    fuzzy: string;
    placeholder: string;
    title: string;
    size: number;
    active: boolean;
  };
  lastName: {
    path: string;
    url: string;
    value: string;
    section: string;
    field: string;
    query: any;
    fuzzy: string;
    placeholder: string;
    title: string;
    size: number;
    active: boolean;
  };
  birthDate:  {
    path: string;
    url: string;
    before: string;
    section: string;
    value: string;
    field: string;
    placeholder: string;
    query: any;
    fuzzy: string;
    title: string;
    mask: {
      typing: any;
      validation: any;
      transform: any;
    };
    size: number;
    active: boolean;
  }
  birthCity: {
    path: string;
    url: string;
    before: string;
    value: string;
    field: string;
    query: any;
    fuzzy: string;
    placeholder: string;
    title: string;
    size: string;
    active: boolean;
  }
  birthDepartment: {
    path: string;
    url: string;
    before: string;
    value: string;
    field: string;
    query: any;
    fuzzy: boolean;
    placeholder: string;
    title: string;
    size: string;
    active: boolean;
  }
  birthCountry: {
    path: string;
    url: string;
    before: string;
    value: string;
    field: string;
    query: any;
    fuzzy: string;
    title: string;
    placeholder: string;
    size: number;
    active: boolean;
  }
  deathDate: {
    path: string;
    url: string;
    before: string;
    section: string;
    value: string;
    field: string;
    query: any;
    fuzzy: string;
    placeholder: string;
    multiQuery: string;
    title: string;
    mask: {
      typing: any;
      validation: any;
      transform: any;
    };
    size: number;
    active: boolean;
  }

  deathCity:  {
    path: string;
    url: string;
    before: string;
    value: string;
    field: string;
    query: any;
    fuzzy: string;
    title: string;
    placeholder: string;
    size: string;
    active: boolean;
  }
  deathDepartment: {
    path: string;
    url: string;
    before: string;
    value: string;
    field: string;
    query: any;
    fuzzy: boolean;
    placeholder: string;
    title: string;
    size: string;
    active: boolean;
  }
  deathCountry: {
    path: string;
    url: string;
    before: string;
    value: string;
    field: string;
    query: any;
    fuzzy: string;
    placeholder: string;
    title: string;
    size: number;
    active: boolean;
  }

  constructor() {
    this.fullText = {
      path: "fullText",
      url: "q",
      value: "",
      field: "fullText",
      placeholder: "prénom, nom, date de naissance ou de décès, ... e.g. Georges Pompidou",
      title: "saisissez en recherche libre nom, prénom, date de naissance ou de décès",
      size: 12,
      active: true,
    }
    this.firstName =  {
      path: "name",
      url: "fn",
      value: "",
      field: ["PRENOM","PRENOMS"],
      query: firstNameQuery,
      fuzzy: "auto",
      placeholder: "Georges",
      title: "saisissez le prénom",
      size: 4,
      active: true,
    }
    this.lastName = {
      path: "name",
      url: "ln",
      value: "",
      field: "NOM",
      section:"nom/prénoms",
      query: fuzzyTermQuery,
      fuzzy: "auto",
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
      value: "",
      field: "DATE_NAISSANCE",
      placeholder: "1910-1912 ou 1911 ou 05/07/1911",
      query: dateRangeStringQuery,
      fuzzy: "auto",
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
      value: "",
      field: "COMMUNE_NAISSANCE",
      query: fuzzyTermQuery,
      fuzzy: "auto",
      placeholder: "commune: Montboudif",
      title:"saisissez la commune de naissance",
      size: "3-5",
      active: true,
    }

    this.birthDepartment = {
      path: "birth.location",
      url: "bdep",
      before: "dans le",
      value: "",
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
      value: "",
      field: "PAYS_NAISSANCE",
      query: fuzzyTermQuery,
      fuzzy: "auto",
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
      value: "",
      field: "DATE_DECES",
      query: dateRangeStringQuery,
      fuzzy: "auto",
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
      value: "",
      field: "COMMUNE_DECES",
      query: fuzzyTermQuery,
      fuzzy: "auto",
      title:"saisissez la commune de décès",
      placeholder: "commune: Paris",
      size: "3-5",
      active: true,
    }

    this.deathDepartment = {
      path: "death.location",
      url: "ddep",
      before: "dans le",
      value: "",
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
      value: "",
      field: "PAYS_DECES",
      query: fuzzyTermQuery,
      fuzzy: "auto",
      placeholder: "pays: France",
      title:"saisissez le pays de décès",
      size: 3,
      active: true,
    }

  }
}
