import moment from 'moment'
import {
  fullTextWithQuery,
  nameWithQuery,
  sexWithQuery,
  sortWithQuery,
  birthDateWithQuery,
  birthCityWithQuery,
  birthDepartmentWithQuery,
  birthCountryWithQuery,
  birthGeoPointWithQuery,
  deathDateWithQuery,
  deathAgeWithQuery,
  deathCityWithQuery,
  deathDepartmentWithQuery,
  deathCountryWithQuery,
  deathGeoPointWithQuery
} from '../fieldsWithQueries';

import { GeoPoint, RequestField, Sort } from './entities';

export interface Block {
  scope: string[],
  minimum_match: number,
  should?: boolean
}

/**
 * These are all the query parameters
 * @tsoaModel
 * @example
 * {
 *   "firstName": "Georges",
 *   "lastName": "Pompidou",
 *   "sex": "M",
 *   "deathCity": "Paris"
 * }
 */
export interface RequestBody {
 [key: string]: any; // Index signature
 /**
  * Le temps durant lequel le contexte de la requête doit être garde
  */
 scroll?: string;
 /**
  * Identifiant technique du contexte
  */
 scrollId?: string;
 /**
  * Nombre d\'identités retourne par page
  */
 size?: number;
 /**
  * Numéro de page
  */
 page?: number;
 /**
  * Tri sur les colonnes (à préciser sur la structure du champs)
  */
 sort?: string|Sort[];
 /**
  * Simple query
  */
 fullText?: string;
 /**
  * Prénom
  */
 firstName?: string;
 /**
  * Nom de famille
  */
 lastName?: string;
 /**
  * Sexe
  */
 sex?: 'M'|'F'|'H';
 /**
  * Date de naissance au format\: JJ/MM/AAAA<br>  <li> Pour une date inconnue les valeurs sont 0000 pour AAAA; 00 pour MM et JJ</li><br> <li> Une recherche par tranche de date est également possible sous la forme: JJ/MM/AAAA - JJ/MM/AAAA</li>
  */
 birthDate?: string|number;
 /**
  * Localité\: de naissance en claire (pour les personnes nées en France ou dans les DOM/TOM/COM)
  */
 birthCity?: string;
 /**
  * Code département du lieu de naissance
  */
 birthDepartment?: string;
 /**
  * Libellé de pays de naissance en clair (pour les personnes nées à l'étranger)
  */
 birthCountry?: string;
 /**
  * Coordonnés GPS du lieu de naissance
  */
 birthGeoPoint?: GeoPoint;
 /**
  * Date de décès au format\: JJ/MM/AAAA. <br> <li> Pour une date inconnue les valeurs sont 0000 pour AAAA; 00 pour MM et JJ</li>.<br> <li> Une recherche par tranche de date est également possible sous la forme: JJ/MM/AAAA - JJ/MM/AAAA</li>
  */
 deathDate?: string|number;
 /**
  * Localité de décès en claire** (pour les personnes nées en France ou dans les DOM/TOM/COM)
  */
 deathCity?: string;
 /**
  * Code département du lieu de décès
  */
 deathDepartment?: string;
 /**
  * Pays du lieu de décès
  */
 deathCountry?: string;
 /**
  * Coordonnés GPS du lieu de décès
  */
 deathGeoPoint?: GeoPoint;
 /**
  * Age du décès
  */
 deathAge?: string|number;
 /**
  * Age du décès
  */
 lastSeenAliveDate?: string;
};

export class RequestInput {
  [key: string]: any; // Index signature
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
  size?: number;
  scroll?: string;
  scrollId?: string;
  page?: number;
  fuzzy?: string;
  sort?: RequestField;
  block?: Block;
  dateFormat?: string;
  metadata?: any;
  errors: string[] = [];
  constructor(requestBody: RequestBody) {
    this.size = requestBody.size ? requestBody.size : 20;
    this.page = requestBody.page ? requestBody.page : 1;
    this.scroll = requestBody.scroll ? requestBody.scroll : '';
    this.scrollId = requestBody.scrollId ? requestBody.scrollId : '';
    this.sort = requestBody.sort ? sortWithQuery(requestBody.sort) : {value: [{score: 'desc'}]}
    this.block = requestBody.block;
    this.dateFormat = requestBody.dateFormat;
    const birthDateTransformed = requestBody.birthDate && requestBody.dateFormat ? moment(requestBody.birthDate.toString(), requestBody.dateFormat).format("DD/MM/YYYY"): requestBody.birthDate;
    let deathDateTransformed
    if (requestBody.lastSeenAliveDate) {
      deathDateTransformed = requestBody.dateFormat ? `>${moment(requestBody.lastSeenAliveDate.toString(), requestBody.dateFormat).format("DD/MM/YYYY")}`: `>${requestBody.lastSeenAliveDate}`;
    } else {
      deathDateTransformed = requestBody.deathDate && requestBody.dateFormat ? moment(requestBody.deathDate.toString(), requestBody.dateFormat).format("DD/MM/YYYY"): requestBody.deathDate;
    }

    this.fullText = fullTextWithQuery(requestBody.q, requestBody.fuzzy);
    this.name = nameWithQuery({
      first: requestBody.firstName,
      last: requestBody.lastName
    }, requestBody.fuzzy);
    this.sex = sexWithQuery(requestBody.sex, requestBody.fuzzy);
    this.birthDate = birthDateWithQuery(birthDateTransformed, requestBody.fuzzy);
    this.birthCity = birthCityWithQuery(requestBody.birthCity, requestBody.fuzzy);
    this.birthDepartment = birthDepartmentWithQuery(requestBody.birthDepartment, requestBody.fuzzy);
    this.birthCountry = birthCountryWithQuery(requestBody.birthCountry, requestBody.fuzzy);
    this.birthGeoPoint = birthGeoPointWithQuery(requestBody.birthGeoPoint, requestBody.fuzzy);
    this.deathDate = deathDateWithQuery(deathDateTransformed, requestBody.fuzzy);
    this.deathAge = deathAgeWithQuery(requestBody.deathAge, requestBody.fuzzy);
    this.deathCity = deathCityWithQuery(requestBody.deathCity, requestBody.fuzzy);
    this.deathDepartment = deathDepartmentWithQuery(requestBody.deathDepartment, requestBody.fuzzy);
    this.deathCountry = deathCountryWithQuery(requestBody.deathCountry, requestBody.fuzzy);
    this.deathGeoPoint = deathGeoPointWithQuery(requestBody.deathGeoPoint, requestBody.fuzzy);

    Object.keys(this).map(field => {
      if (this[field] && this[field].mask && this[field].mask.validation) {
        if (!this[field].mask.validation(this[field].value)) {
          this.errors.push(`invalid ${field} value: ${this[field].value}`);
        }
      }
    });

  }
}
