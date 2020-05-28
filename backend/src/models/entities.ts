export interface Name {
    first: string|string[]|RequestField;
    last: string|string[]|RequestField;
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

export interface GeoPoint {
    latitude: number;
    longitude: number;
    distance: string;
};

export interface Location {
    city?: string|RequestField;
    cityCode?: string|RequestField;
    departmentCode?: string|RequestField;
    country?: string|RequestField;
    countryCode?: string|RequestField
    latitude?: number;
    longitude?: number;
  };

export interface Person {
    score: number;
    source: string;
    id: string;
    name: Name;
    sex: 'M'|'F';
    birth: {
      date: string;
      location: Location;
    };
    death: {
      date: string;
      certificateId: string;
      age: number;
      location: Location;
    };
  };
