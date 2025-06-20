import { ScoreResult } from '../score';
import { RequestBody } from './requestInput';

export interface Sort {
 [key: string]: 'asc'|'desc';
}

export interface Name {
    first?: string|string[]|RequestField;
    last?: string|string[]|RequestField;
    legal?: string|string[]|RequestField;
  }

export interface NameFields {
    first?: {
        first?: string;
        all?: string;
    };
    last: string|string[];
    legal?: string|string[];
}

export interface RequestField {
    value: boolean|string|string[]|Name|number|GeoPoint|Sort[];
    field?: string|string[]|NameFields;
    query?: any;
    fuzzy?: string|boolean;
    mask?: {
      validation?: any;
      transform?: any;
    };
  }

/**
 * GPS coordinates
 */
export interface GeoPoint {
  /**
   * Latitude of the GPS coordinate
   */
  latitude: number;
  /**
   * Longitude of the GPS coordinate
   */
  longitude: number;
  /**
   * Distance radius from the GPS point
   */
  distance: string;
}

export interface Location {
    city?: string|string[]|RequestField;
    code?: string|RequestField;
    codePostal?: string|string[]|RequestField;
    codeHistory?: string|string[]|RequestField;
    departmentCode?: string|number|RequestField;
    country?: string|RequestField;
    countryCode?: string|RequestField
    latitude?: number;
    longitude?: number;
  }

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
}

export type ReviewStatus = "rejected"|"validated"|"closed";

export const statusAuthMap = {
  rejected: -1,
  validated: 1,
  closed: -2,
};

export type ProofType = "french death certificate"|"french birth certificate"|"other french document"|"foreign document"|"grave"|"other";

export type ProofScript = "manuscript"|"typed"|"numerical";

export type ProofQuality = "poor"|"good";

export interface Review {
  status: ReviewStatus;
  date?: string;
  message?: string;
  silent?: boolean;
  proofType?: ProofType;
  proofScrupt?: ProofScript;
  proofQuality?: ProofQuality;
}

export interface Reviews {
  [key: string]: Review;
}

export interface ReviewsStringified {
  [key: string]: string;
}

export type UpdateRequest = UpdateUserRequest | ReviewsStringified ;

export interface Modification {
  id: string;
  date: string;
  author: string;
  fields: UpdateFields;
  proof: string;
  auth: number;
  message?: string;
  review?: Review;
}

export interface Person {
    score?: number;
    source?: string;
    sourceLine?: number;
    id?: string;
    name?: Name;
    sex?: 'M'|'F';
    scores?: ScoreResult;
    birth?: {
      date?: string;
      location?: Location;
    };
    death?: {
      date: string;
      certificateId?: string;
      age?: number;
      location?: Location;
    };
    links?: {
      label?: string;
      wikipedia?: string;
      wikidata?: string;
      wikimedia?: string;
    };
    modifications?: Modification[];
  }

export interface PersonCompare {
  personA: RequestBody;
  personB: RequestBody;
  params?: ScoreParams;
}

export interface ScoreParams {
  dateFormatA?: string;
  dateFormatB?: string;
  explain?: boolean;
  pruneScore?: number;
  candidateNumber?: number;
}

export type StrAndNumber = string | number;

export interface Wikidict {
  id: string;
}

/**
 * OTP Response
 * @tsoaModel
 * @example
 * {
 *   "valid": true,
 *   "msg": "Adresse valide",
 * }
 */
export interface sendOTPResponse {
  valid: boolean;
  msg: string
}

/**
 * Webhook Request
 * @tsoaModel
 * @example
 * {
 *   "url": "https://example.com/webhook",
 *   "action": "register"
 * }
 */
export interface WebhookRequest {
  url: string;
  action: 'register' | 'challenge' | 'status' | 'delete';
}
