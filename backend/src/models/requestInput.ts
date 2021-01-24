import moment from 'moment'
import {
  fullTextWithQuery,
  nameWithQuery,
  sexWithQuery,
  sortWithQuery,
  birthDateWithQuery,
  birthCityWithQuery,
  birthLocationCodeWithQuery,
  birthDepartmentWithQuery,
  birthCountryWithQuery,
  birthGeoPointWithQuery,
  deathDateWithQuery,
  deathAgeWithQuery,
  deathCityWithQuery,
  deathLocationCodeWithQuery,
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
  * Nom d'usage
  */
 legalName?: string;
 /**
  * Sexe
  */
 sex?: 'M'|'F'|'H';
 /**
  * Date de naissance au format\: JJ/MM/AAAA<br>  <li> Pour une date inconnue les valeurs sont 0000 pour AAAA; 00 pour MM et JJ</li><br> <li> Une recherche par tranche de date est également possible sous la forme: JJ/MM/AAAA - JJ/MM/AAAA</li>
  */
 birthDate?: string|number;
 /**
  * Libellé de la commune de naissance (pour les personnes nées en France ou dans les DOM/TOM/COM)
  */
 birthCity?: string;
 /**
  * Code INSEE du lieu de naissance (commune pour les personnes nées en France ou dans les DOM/TOM/COM, ou code pays)
  */
 birthLocationCode?: string;
 /**
  * Code département du lieu de naissance
  */
 birthDepartment?: string|number;
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
  * Libellé de la commune de décès (pour les personnes nées en France ou dans les DOM/TOM/COM)
  */
 deathCity?: string;
 /**
  * Code INSEE du lieu de décès (commune pour les personnes décédées en France ou dans les DOM/TOM/COM, ou code pays)
  */
 deathLocationCode?: string;
 /**
  * Code département du lieu de décès
  */
 deathDepartment?: string|number;
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
 /**
  * Langage entête
  */
 headerLang?: string;
};


interface RequestInputParams {
  q?: string;
  firstName?: string;
  lastName?: string;
  legalName?: string;
  sex?: string;
  birthDate?: string|number;
  birthCity?: string;
  birthLocationCode?: string;
  birthDepartment?: string|number;
  birthCountry?: string;
  birthGeoPoint?: GeoPoint;
  deathDate?: string|number;
  deathCity?: string;
  deathLocationCode?: string;
  deathDepartment?: string|number;
  deathCountry?: string;
  deathGeoPoint?: GeoPoint;
  deathAge?: string|number;
  lastSeenAliveDate?: string;
  id?: string;
  scroll?: string;
  scrollId?: string;
  size?: number;
  page?: number;
  fuzzy?: string|boolean;
  sort?: string|Sort[];
  block?: Block;
  dateFormat?: any;
}

export class RequestInput {
  [key: string]: any; // Index signature
  fullText?: RequestField;
  firstName?: RequestField;
  lastName?: RequestField;
  legalName?: RequestField;
  sex?: RequestField;
  birthDate?: RequestField;
  birthCity?: RequestField;
  birthLocationCode?: RequestField;
  birthDepartment?: RequestField;
  birthCountry?: RequestField;
  birthGeoPoint?: RequestField;
  deathDate?: RequestField;
  deathCity?: RequestField;
  deathLocationCode?: RequestField;
  deathDepartment?: RequestField;
  deathCountry?: RequestField;
  deathGeoPoint?: RequestField;
  deathAge?: RequestField;
  lastSeenAliveDate?: RequestField;
  id?: string;
  size?: number;
  scroll?: string;
  scrollId?: string;
  page?: number;
  fuzzy?: string|boolean;
  sort?: RequestField;
  block?: Block;
  dateFormat?: string;
  metadata?: any;
  errors: string[] = [];
  constructor(params: RequestInputParams) {
    this.size = params.size ? params.size : 20;
    this.page = params.page ? params.page : 1;
    this.scroll = params.scroll ? params.scroll : '';
    this.scrollId = params.scrollId ? params.scrollId : '';
    this.sort = params.sort ? sortWithQuery(params.sort) : {value: [{score: 'desc'}]}
    this.block = params.block;
    this.id = params.id;
    this.dateFormat = params.dateFormat;
    const birthDateTransformed = params.birthDate && params.dateFormat ? moment(params.birthDate.toString(), params.dateFormat).format("DD/MM/YYYY"): params.birthDate;
    let deathDateTransformed
    if (params.lastSeenAliveDate) {
      deathDateTransformed = params.dateFormat ? `>${moment(params.lastSeenAliveDate.toString(), params.dateFormat).format("DD/MM/YYYY")}` : `>${params.lastSeenAliveDate}`;
    } else {
      deathDateTransformed = params.deathDate && params.dateFormat ? moment(params.deathDate.toString(), params.dateFormat).format("DD/MM/YYYY") : params.deathDate;
    }

    this.fuzzy = typeof(params.fuzzy) === 'boolean' ? params.fuzzy.toString() : params.fuzzy
    this.fullText = fullTextWithQuery(params.q, this.fuzzy);
    this.name = nameWithQuery({
      first: params.firstName,
      last: params.lastName,
      legal: params.legalName
    }, this.fuzzy);
    this.sex = sexWithQuery(params.sex, this.fuzzy);
    this.birthDate = birthDateWithQuery(birthDateTransformed, this.fuzzy);
    this.birthCity = birthCityWithQuery(params.birthCity, this.fuzzy);
    this.birthLocationCode = birthLocationCodeWithQuery(params.birthLocationCode, this.fuzzy);
    this.birthDepartment = birthDepartmentWithQuery(params.birthDepartment, this.fuzzy);
    this.birthCountry = birthCountryWithQuery(params.birthCountry, this.fuzzy);
    this.birthGeoPoint = birthGeoPointWithQuery(params.birthGeoPoint, this.fuzzy);
    this.deathDate = deathDateWithQuery(deathDateTransformed, this.fuzzy);
    this.deathAge = deathAgeWithQuery(params.deathAge, this.fuzzy);
    this.deathCity = deathCityWithQuery(params.deathCity, this.fuzzy);
    this.deathLocationCode = deathLocationCodeWithQuery(params.deathLocationCode, this.fuzzy);
    this.deathDepartment = deathDepartmentWithQuery(params.deathDepartment, this.fuzzy);
    this.deathCountry = deathCountryWithQuery(params.deathCountry, this.fuzzy);
    this.deathGeoPoint = deathGeoPointWithQuery(params.deathGeoPoint, this.fuzzy);

    Object.keys(this).map(field => {
      if (this[field] && this[field].mask && this[field].mask.validation) {
        if (!this[field].mask.validation(this[field].value)) {
          this.errors.push(`invalid ${field} value: ${this[field].value as string}`);
        }
      }
    });
  }
}
