import { ScoreResult } from '../score';

export interface Sort {
 [key: string]: 'asc'|'desc';
}

export interface Name {
    first: string|string[]|RequestField;
    last: string|string[]|RequestField;
    legal?: string|string[]|RequestField;
  };

export interface NameFields {
    first?: {
        first?: string;
        all?: string;
    };
    last: string|string[];
    legal?: string|string[];
};

export interface RequestField {
    value: string|Name|number|GeoPoint|Sort[];
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
    city?: string|string[]|RequestField;
    code?: string|RequestField;
    codeHistory?: string|string[]|RequestField;
    departmentCode?: string|RequestField;
    country?: string|RequestField;
    countryCode?: string|RequestField
    latitude?: number;
    longitude?: number;
  };

export interface Person {
    score: number;
    source: string;
    sourceLine: number;
    id: string;
    name: Name;
    sex: 'M'|'F';
    scores: ScoreResult;
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

export interface ScoreParams {
  dateFormat?: string;
  pruneScore?: number;
  candidateNumber?: number;
};
