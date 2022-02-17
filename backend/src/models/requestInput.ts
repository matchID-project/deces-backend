import { isDateRange, isDateLimit, dateTransform } from '../masks';
import {
  fullTextWithQuery,
  nameWithQuery,
  sexWithQuery,
  sortWithQuery,
  aggsWithQuery,
  birthDateWithQuery,
  birthCityWithQuery,
  birthLocationCodeWithQuery,
  birthPostalCodeWithQuery,
  birthDepartmentWithQuery,
  birthCountryWithQuery,
  birthGeoPointWithQuery,
  deathDateWithQuery,
  deathAgeWithQuery,
  deathCityWithQuery,
  deathLocationCodeWithQuery,
  deathPostalCodeWithQuery,
  deathDepartmentWithQuery,
  deathCountryWithQuery,
  deathGeoPointWithQuery,
  fuzzyWithQuery,
  sourceWithQuery
} from '../fieldsWithQueries';

import { GeoPoint, RequestField, Sort } from './entities';

export interface Block {
  scope: string[],
  'minimum_match': number,
  should?: boolean
}

export type AggsInputParams = 'firstName'|'lastName'|'birthDate'|'birthCity'|'birthDepartment'|'birthCountry'|'deathDate'|'deathCity'|'deathDepartment'|'deathCountry'|'deathAge'|'sex';

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
 birthPostalCode?: string;
 /**
  * Code postal du lieu de naissance (commune pour les personnes nées en France ou dans les DOM/TOM/COM, ou code pays)
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
 birthGeoPoint?: GeoPoint;
 /**
  * Date de décès au format\: JJ/MM/AAAA. <br> <li> Pour une date inconnue les valeurs sont 0000 pour AAAA; 00 pour MM et JJ</li>.<br> <li> Une recherche par tranche de date est également possible sous la forme: JJ/MM/AAAA - JJ/MM/AAAA</li>
  */
 deathDate?: string|number;
 /**
  * Libellé de la commune de décès (pour les personnes nées en France ou dans les DOM/TOM/COM)
  */
 deathPostalCode?: string;
 /**
  * Code postal du lieu de décès (commune pour les personnes décédées en France ou dans les DOM/TOM/COM, ou code pays)
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
 deathGeoPoint?: GeoPoint;
 /**
  * Age du décès
  */
 deathAge?: string|number;
 /**
  * Recherche floue ou exacte
  */
 fuzzy?: string|boolean;
 /**
  * Age du décès
  */
 lastSeenAliveDate?: string;
 /**
  * Nom du fichier INSEE source
  */
 source?: string;
 /**
  * Langage entête
  */
 headerLang?: string;
 /**
  * Champs à aggréger
  */
 aggs?: AggsInputParams[];
  /**
  * Nombre de clé max d'aggrégation
  */
 aggsSize?: number;
};


interface RequestInputParams {
  q?: string;
  firstName?: string;
  lastName?: string;
  legalName?: string;
  sex?: string;
  birthDate?: string|number;
  birthCity?: string;
  birthPostalCode?: string;
  birthLocationCode?: string;
  birthDepartment?: string|number;
  birthCountry?: string;
  birthGeoPoint?: GeoPoint|string;
  deathDate?: string|number;
  deathCity?: string;
  deathPostalCode?: string;
  deathLocationCode?: string;
  deathDepartment?: string|number;
  deathCountry?: string;
  deathGeoPoint?: GeoPoint|string;
  deathAge?: string|number;
  lastSeenAliveDate?: string;
  source?: string;
  id?: string;
  scroll?: string;
  scrollId?: string;
  size?: number;
  page?: number;
  fuzzy?: string|boolean;
  sort?: string|Sort[];
  aggs?: string|string[];
  aggsSize?: number;
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
  birthPostalCode?: RequestField;
  birthLocationCode?: RequestField;
  birthDepartment?: RequestField;
  birthCountry?: RequestField;
  birthGeoPoint?: RequestField;
  deathDate?: RequestField;
  deathCity?: RequestField;
  deathPostalCode?: RequestField;
  deathLocationCode?: RequestField;
  deathDepartment?: RequestField;
  deathCountry?: RequestField;
  deathGeoPoint?: RequestField;
  deathAge?: RequestField;
  lastSeenAliveDate?: RequestField;
  source?: RequestField;
  id?: string;
  size?: number;
  scroll?: string;
  scrollId?: string;
  page?: number;
  fuzzy?: RequestField;
  afterKey?: number;
  aggs?: RequestField;
  aggsSize?: number;
  sort?: RequestField;
  block?: Block;
  dateFormat?: string;
  metadata?: any;
  errors: string[] = [];
  constructor(params: RequestInputParams) {
    this.size = params.size !== undefined ? params.size : 20;
    this.page = params.page ? params.page : 1;
    this.scroll = params.scroll ? params.scroll : '';
    this.scrollId = params.scrollId ? params.scrollId : '';
    this.sort = params.sort ? sortWithQuery(params.sort) : {value: [{score: 'desc'}]};
    this.aggs = aggsWithQuery(params.aggs);
    this.aggsSize = params.aggsSize !== undefined ? params.aggsSize : 250;
    this.block = params.block;
    this.id = params.id;
    this.dateFormat = params.dateFormat;
    let birthDateTransformed;
    if (params.birthDate) {
      if (!this.dateFormat) {
        birthDateTransformed = params.birthDate.toString();
      } else {
        const dr = isDateRange(params.birthDate.toString());
        if (!dr) {
          const dl = isDateLimit(params.birthDate.toString());
          birthDateTransformed = dl ? `${dl[1]}${dateTransform(dl[2], params.dateFormat, "dd/MM/yyyy")}`
            : dateTransform(params.birthDate.toString(), params.dateFormat, "dd/MM/yyyy");
        } else {
          birthDateTransformed = `${dateTransform(dr[1], params.dateFormat, "dd/MM/yyyy")}-${dateTransform(dr[2], params.dateFormat, "dd/MM/yyyy")}`;
        }
      }
    }
    let deathDateTransformed
    if (params.lastSeenAliveDate) {
      deathDateTransformed = params.dateFormat ? `>${dateTransform(params.lastSeenAliveDate.toString(), params.dateFormat, "dd/MM/yyyy")}` : `>${params.lastSeenAliveDate}`;
    } else if (params.deathDate) {
      if (!params.dateFormat) {
        deathDateTransformed = params.deathDate.toString();
      } else {
        const dr = isDateRange(params.deathDate.toString());
        if (!dr) {
          const dl = isDateLimit(params.deathDate.toString());
          deathDateTransformed = dl ? `${dl[1]}${dateTransform(dl[2], params.dateFormat, "dd/MM/yyyy")}`
            : dateTransform(params.deathDate.toString(), params.dateFormat, "dd/MM/yyyy");
        } else {
          deathDateTransformed = `${dateTransform(dr[1], params.dateFormat, "dd/MM/yyyy")}-${dateTransform(dr[2], params.dateFormat, "dd/MM/yyyy")}`;
        }
      }
    }
    this.source = sourceWithQuery(params.source);

    this.fuzzy = fuzzyWithQuery(params.fuzzy)
    const transformedFuzzy = this.fuzzy ? this.fuzzy.mask.transform(this.fuzzy.value) : true;
    this.fullText = fullTextWithQuery(params.q);
    this.name = nameWithQuery({
      first: params.firstName,
      last: params.lastName,
      legal: params.legalName
    }, transformedFuzzy);
    this.sex = sexWithQuery(params.sex);
    this.birthDate = birthDateWithQuery(birthDateTransformed, transformedFuzzy);
    this.birthCity = birthCityWithQuery(params.birthCity, transformedFuzzy);
    this.birthLocationCode = birthLocationCodeWithQuery(params.birthLocationCode);
    this.birthPostalCode = birthPostalCodeWithQuery(params.birthPostalCode);
    this.birthDepartment = birthDepartmentWithQuery(params.birthDepartment);
    this.birthCountry = birthCountryWithQuery(params.birthCountry, transformedFuzzy);
    this.birthGeoPoint = birthGeoPointWithQuery(params.birthGeoPoint);
    this.deathDate = deathDateWithQuery(deathDateTransformed, transformedFuzzy);
    this.deathAge = deathAgeWithQuery(params.deathAge);
    this.deathCity = deathCityWithQuery(params.deathCity, transformedFuzzy);
    this.deathLocationCode = deathLocationCodeWithQuery(params.deathLocationCode);
    this.deathPostalCode = deathPostalCodeWithQuery(params.deathPostalCode);
    this.deathDepartment = deathDepartmentWithQuery(params.deathDepartment);
    this.deathCountry = deathCountryWithQuery(params.deathCountry, transformedFuzzy);
    this.deathGeoPoint = deathGeoPointWithQuery(params.deathGeoPoint);

    Object.keys(this).map(field => {
      if (this[field] && this[field].mask && this[field].mask.validation) {
        if (!this[field].mask.validation(this[field].value)) {
          this.errors.push(`invalid ${field} value: ${this[field].value as string}`);
        }
      }
    });
  }
}
