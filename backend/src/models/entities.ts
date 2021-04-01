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
    modifications?: {
      id: string;
      date: string;
      auth: number;
      proof: string;
      author: string;
      fields: UpdateFields;
    };
  };

export interface ScoreParams {
  dateFormat?: string;
  pruneScore?: number;
  candidateNumber?: number;
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
  proof?: string;
}

export type StrAndNumber = string | number;
