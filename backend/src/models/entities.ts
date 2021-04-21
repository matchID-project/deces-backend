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
    value: boolean|string|string[]|Name|number|GeoPoint|Sort[];
    field?: string|string[]|NameFields;
    query?: any;
    fuzzy?: string|boolean;
    mask?: {
      validation?: any;
      transform?: any;
    };
  };

/**
 * Coordonnés GPS
 */
export interface GeoPoint {
  /**
   * Latitude de la coordonnée GPS
   */
  latitude: number;
  /**
   * Latitude de la coordonnée GPS
   */
  longitude: number;
  /**
   * Rayon de distance du point GPS
   */
  distance: string;
};

export interface Location {
    city?: string|string[]|RequestField;
    code?: string|RequestField;
    codeHistory?: string|string[]|RequestField;
    departmentCode?: string|number|RequestField;
    country?: string|RequestField;
    countryCode?: string|RequestField
    latitude?: number;
    longitude?: number;
  };

/**
 * Identity modification
 * @tsoaModel
 * @example
 * {
 *   "firstName": "Paul"
 * }
 */
export interface UpdateFields {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  birthCity?: string;
  birthCountry?: string;
  birthLocationCode?: string;
  deathAge?: number;
  deathDate?: string;
  deathCity?: string;
  deathCountry?: string;
  deathLocationCode?: string;
}

export interface UpdateUserRequest extends UpdateFields {
  proof: string;
  message?: string;
};

export interface Modification {
  id: string;
  date: string;
  author: string;
  fields: UpdateFields;
  proof: string;
  auth: -2|-1|0|1|2|3;
  message?: string;
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
    links?: {
      label?: string;
      wikipedia?: string;
      wikidata?: string;
      wikimedia?: string;
    };
    modifications?: [Modification];
  };

export interface ScoreParams {
  dateFormat?: string;
  pruneScore?: number;
  candidateNumber?: number;
};

export type StrAndNumber = string | number;
