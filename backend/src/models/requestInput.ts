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
 sex?: 'M'|'F';
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
  constructor(q?: string, firstName?: string, lastName?: string, sex?: string, birthDate?: string|number, birthCity?: string, birthDepartment?: string, birthCountry?: string, birthGeoPoint?: GeoPoint, deathDate?: string|number, deathCity?: string, deathDepartment?: string, deathCountry?: string, deathGeoPoint?: GeoPoint, deathAge?: string|number, scroll?: string, scrollId?: string, size?: number, page?: number, fuzzy?: string, sort?: string|Sort[], block?: Block, dateFormat?: any, metadata?: any) {
    this.size = size ? size : 20;
    this.page = page ? page : 1;
    this.scroll = scroll ? scroll : '';
    this.scrollId = scrollId ? scrollId : '';
    this.sort = sort ? sortWithQuery(sort) : {value: [{score: 'desc'}]}
    this.block = block;
    this.dateFormat = dateFormat;

    this.fullText = fullTextWithQuery(q, fuzzy);
    this.name = nameWithQuery({
      first: firstName,
      last: lastName
    }, fuzzy);
    this.sex = sexWithQuery(sex, fuzzy);
    this.birthDate = birthDateWithQuery(birthDate, fuzzy);
    this.birthCity = birthCityWithQuery(birthCity, fuzzy);
    this.birthDepartment = birthDepartmentWithQuery(birthDepartment, fuzzy);
    this.birthCountry = birthCountryWithQuery(birthCountry, fuzzy);
    this.birthGeoPoint = birthGeoPointWithQuery(birthGeoPoint, fuzzy);
    this.deathDate = deathDateWithQuery(deathDate, fuzzy);
    this.deathAge = deathAgeWithQuery(deathAge, fuzzy);
    this.deathCity = deathCityWithQuery(deathCity, fuzzy);
    this.deathDepartment = deathDepartmentWithQuery(deathDepartment, fuzzy);
    this.deathCountry = deathCountryWithQuery(deathCountry, fuzzy);
    this.deathGeoPoint = deathGeoPointWithQuery(deathGeoPoint, fuzzy);

    Object.keys(this).map(field => {
      if (this[field] && this[field].mask && this[field].mask.validation) {
        if (!this[field].mask.validation(this[field].value)) {
          this.errors.push(`invalid ${field} value: ${this[field].value}`);
        }
      }
    });

  }
}
