export class RequestBodyInterface {
  [key: string]: any; // Index signature
  scroll: string;
  scrollId: string;
  size: number;
  page: number;
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
    fuzzy: string|boolean;
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
    fuzzy: string|boolean;
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
    fuzzy: string|boolean;
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
    fuzzy: string|boolean;
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
    fuzzy: string|boolean;
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
    fuzzy: string|boolean;
    title: string;
    placeholder: string;
    size: number;
    active: boolean;
  }
  birthGeoPoint: {
    path: string;
    url: string;
    value: any;
    field: string;
    query: any;
    fuzzy: string|boolean;
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
    fuzzy: string|boolean;
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
    fuzzy: string|boolean;
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
    fuzzy: string|boolean;
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
    fuzzy: string|boolean;
    placeholder: string;
    title: string;
    size: number;
    active: boolean;
  }
  deathGeoPoint: {
    path: string;
    url: string;
    value: any;
    field: string;
    query: any;
    fuzzy: string|boolean;
    title: string;
    placeholder: string;
    size: number;
    active: boolean;
  }
  deathAge: {
    path: string;
    url: string;
    before: string;
    section: string;
    value: string|number;
    field: string;
    query: any;
    fuzzy: string|boolean;
    multiQuery: string;
    mask: {
      typing: any;
      validation: any;
      transform: any;
    };
    placeholder: string;
    title: string;
    size: number;
    active: boolean;
  }
}
