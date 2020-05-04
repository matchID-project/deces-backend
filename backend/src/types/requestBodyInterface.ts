export class Name {
  first: string|string[];
  name: string|string[];
};

export class GeoPoint {
  latitude: number;
  longitude: number;
  distance: string;
};

export class NameFields {
  first?: {
    first?: string;
    all?: string;
  };
  last: string|string[];
};

export class RequestField {
  value: string|Name|number|GeoPoint;
  field?: string|string[]|NameFields;
  query?: any;
  fuzzy?: string|boolean;
  mask?: {
    validation?: any;
    transform?: any;
  };
};

export class RequestBodyInterface {
  [key: string]: any; // Index signature
  scroll: string;
  scrollId: string;
  size: number;
  page: number;
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
};
