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
    section: string;
    field: string;
    placeholder: string;
    title: string;
    size: number;
    active: boolean;
  };
  lastName: {
    path: string;
    url: string;
    value: string;
    field: string;
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
    title: string;
    size: number;
    active: boolean;
  }
  birthYear: {
    path: string;
    url: string;
    before: string;
    section: string;
    value: string;
    field: string;
    query: string;
    placeholder: string,
      title: string,
      size: string,
      active: boolean,
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
      section:"prénoms/nom",
      field: "PRENOM",
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
        field: "ANNEE_NAISSANCE",
        placeholder: "05/07/1911",
        title:"saisissez la date de naissance",
        size: 2,
        active: false,
    }
    this.birthYear = {
        path: "birth.date",
        url: "by",
        before: "en",
        section:"naissance",
        value: "",
        field: "DATE_NAISSANCE",
        query: "prefix",
        placeholder: "1911",
        title:"saisissez l'année de naissance",
        size: "1-5",
        active: true,
    }
  }
}
