import { Controller, Get, Post, Body, Route, Query, Tags, Header, Request } from 'tsoa';
import express from 'express';
import { runRequest } from '../runRequest';
import { buildRequest } from '../buildRequest';
import { RequestInput, RequestBody, AggsInputParams } from '../models/requestInput';
import { ResultAgg } from '../models/result';
import { StrAndNumber } from '../models/entities';

/**
 * @swagger
 * tags:
 *   name: Aggregations
 *   description: Requêtes d'agrégations sur l'ensemble des données
 */
@Route('')
export class AggregationController extends Controller {

  /**
   * Aggregation request
   * @summary Requête d'agrégation sur l'ensemble des données
   * @param q Nom, prénom, date de naissance ou de décès (JJ/MM/AAAA)
   * @param firstName Prénom
   * @param lastName Nom de famille
   * @param legalName Nom d'usage
   * @param sex Sexe
   * @param birthDate Date de naissance au format\: JJ/MM/AAAA<br>  <li> Pour une date inconnue les valeurs sont 0000 pour AAAA; 00 pour MM et JJ</li><br> <li> Une recherche par tranche de date est également possible sous la forme: JJ/MM/AAAA - JJ/MM/AAAA</li>
   * @param birthCity Localité\: de naissance en claire (pour les personnes nées en France ou dans les DOM/TOM/COM)
   * @param birthPostalCode Code postal du lieu de naissance
   * @param birthDepartment Code département du lieu de naissance
   * @param birthCountry Libellé de pays de naissance en clair (pour les personnes nées à l'étranger)
   * @param deathDate Date de décès au format\: JJ/MM/AAAA. <br> <li> Pour une date inconnue les valeurs sont 0000 pour AAAA; 00 pour MM et JJ</li>.<br> <li> Une recherche par tranche de date est également possible sous la forme: JJ/MM/AAAA - JJ/MM/AAAA</li>
   * @param deathCity Localité de décès en claire** (pour les personnes nées en France ou dans les DOM/TOM/COM)
   * @param deathPostalCode Code postal du lieu de décès
   * @param deathDepartment Code département du lieu de décès
   * @param deathCountry Pays du lieu de décès
   * @param deathAge Age du décès
   * @param fuzzy Recherche floue ou exacte
   * @param aggs Colonnes à utiliser pour l'aggregation
   * @param aggsSize Nombre de valeurs max pour les champs keyword comportant de nombreuses valeur (*City, *Name)
   */
  @Tags('Aggregations')
  @Get('/agg')
  public async aggregation(
    @Request() request: express.Request,
    @Query() q?: string,
    @Query() firstName?: string,
    @Query() lastName?: string,
    @Query() legalName?: string,
    @Query() sex?: 'M'|'F'|'H',
    @Query() birthDate?: StrAndNumber,
    @Query() birthCity?: string,
    @Query() birthPostalCode?: string,
    @Query() birthDepartment?: string,
    @Query() birthCountry?: string,
    @Query() deathDate?: StrAndNumber,
    @Query() deathCity?: string,
    @Query() deathDepartment?: string,
    @Query() deathPostalCode?: string,
    @Query() deathCountry?: string,
    @Query() deathAge?: StrAndNumber,
    @Query() fuzzy?: 'true'|'false',
    @Query() aggs?: AggsInputParams[],
    @Query() aggsSize?: number,
    @Header('Accept') accept?: string
  ): Promise<ResultAgg> {
    if (aggs === undefined) {
      this.setStatus(400);
      return  { msg: "error - missing aggs parameter" };
    }
    const requestInput = new RequestInput({q, firstName, lastName, legalName, sex, birthDate, birthCity, birthPostalCode, birthDepartment, birthCountry, deathDate, deathCity, deathPostalCode, deathDepartment, deathCountry, deathAge, fuzzy, size: 0, aggs, aggsSize});
    if (requestInput.errors.length) {
      this.setStatus(400);
      return  { msg: requestInput.errors };
    }
    if ((firstName || lastName || legalName || sex || birthDate || birthCity || birthPostalCode || birthDepartment || birthCountry || deathDate || deathCity || deathPostalCode || deathDepartment || deathCountry || deathAge) && q) {
      this.setStatus(400);
      return  { msg: "error - simple and complex request at the same time" };
    }
    await this.streamAggs((request).res, requestInput, accept)
  }

  /**
   * Aggregation request
   * @summary Requête d'agrégations sur l'ensemble des données
   * @param accept Format of the response text/csv for csv otherwise application/json
   */
  @Tags('Aggregations')
  @Post('/agg')
  public async aggregationPost(@Body() requestBody: RequestBody, @Request() request: express.Request, @Header('Accept') accept?: string): Promise<ResultAgg> {
    const validFields = ['q', 'firstName', 'lastName', 'legalName', 'sex', 'birthDate', 'birthCity', 'birthPostalCode', 'birthDepartment', 'birthCountry', 'deathDate', 'deathCity', 'deathPostalCode', 'deathDepartment', 'deathCountry', 'deathAge', 'fuzzy', 'aggs', 'aggsSize']
    const notValidFields = Object.keys(requestBody).filter((item: string) => !validFields.includes(item))
    if (notValidFields.length > 0) {
      this.setStatus(400);
      return  { msg: "error - unknown field" };
    }
    if (requestBody.aggs === undefined) {
      this.setStatus(400);
      return  { msg: "error - missing aggs parameter" };
    }
    if ((requestBody.firstName || requestBody.lastName || requestBody.legalName || requestBody.birthDate || requestBody.birthCity || requestBody.birthPostalCode || requestBody.birthDepartment || requestBody.birthCountry || requestBody.birthGeoPoint || requestBody.deathDate || requestBody.deathCity || requestBody.deathPostalCode || requestBody.deathDepartment || requestBody.deathCountry || requestBody.deathAge || requestBody.deathGeoPoint ) && requestBody.q) {
      this.setStatus(400);
      return  { msg: "error - simple and complex request at the same time" };
    }
    requestBody.size = 0
    const requestInput = new RequestInput(requestBody);
    if (requestInput.errors.length) {
      this.setStatus(400);
      return  { msg: requestInput.errors };
    }
    await this.streamAggs((request).res, requestInput, accept)
  }

  private async streamAggs(response: any, requestInput: any, accept: string) {
    let requestBuild = buildRequest(requestInput);
    const transformedAggs = requestInput.aggs.mask.transform(requestInput.aggs.value)
    let result = await runRequest(requestBuild, null);

    let afterKey
    let buckets
    const cardinality: any = {}
    let { took: delay } = result
    if (result.aggregations.myBuckets) {
      afterKey = result.aggregations.myBuckets.after_key
      transformedAggs.forEach((agg: string) => {
        cardinality[agg] = result.aggregations[`${agg}_count`].value
        response.setHeader(`total-results-${agg}`, result.aggregations[`${agg}_count`].value);
      });
      buckets = result.aggregations.myBuckets.buckets
    } else {
      transformedAggs.forEach((agg: string) => {
        cardinality[agg] = result.aggregations[agg].buckets.length
        response.setHeader(`total-results-${agg}`, result.aggregations[agg].buckets.length);
        buckets = result.aggregations[agg].buckets
      });
    }
    if (accept === 'text/csv') {
      response.setHeader('Content-Type', 'text/csv');
      if (buckets.length > 0) {
        buckets.forEach((bucketItem: any, ind: number) => {
          const aggKeys: any = {}
          if (result.aggregations.myBuckets) {
            Object.entries(bucketItem.key).forEach(([key, value]) => {
              aggKeys[key] = value
            })
            aggKeys.value = bucketItem.doc_count
          } else {
            Object.entries(bucketItem).forEach(([key, value]) => {
              aggKeys[key] = value
            })
          }
          if (ind === 0) {
            response.write(Object.keys(aggKeys).join(",") + '\n')
          }
          /* eslint-disable-next-line @typescript-eslint/no-base-to-string */
          response.write(Object.values(aggKeys).join(",") + '\n')
        })
      }
      while (result.aggregations.myBuckets && result.aggregations.myBuckets.buckets.length > 0 ) {
        requestInput.afterKey = afterKey
        requestBuild = buildRequest(requestInput);
        result = await runRequest(requestBuild, null);
        afterKey = result.aggregations.myBuckets.after_key
        delay += result.took
        const { buckets: afterBucket } = result.aggregations.myBuckets
        if (afterBucket.length > 0 ) {
          afterBucket.forEach((bucketItem: any) => {
            const aggKeys: any = {}
            Object.entries(bucketItem.key).forEach(([key, value]) => {
              aggKeys[key] = value
            })
            aggKeys.value = bucketItem.doc_count
            /* eslint-disable-next-line @typescript-eslint/no-base-to-string */
            response.write(Object.values(aggKeys).join(",") + '\n')
          })
        }
      }
      response.end();
    } else {
      response.setHeader('Content-Type', 'application/json');
      const filteredRequest: any = {}
      Object.keys(requestInput).forEach((item: any) => {
        if (requestInput[item] && requestInput[item].value) {
          if (item === 'name') {
            filteredRequest.firstName = requestInput.name.value && requestInput.name.value.first;
            filteredRequest.lastName = requestInput.name.value && requestInput.name.value.last;
            filteredRequest.legalName = requestInput.name.value && requestInput.name.value.legal;
          } else {
            filteredRequest[item] = requestInput[item].value
          }
        }
      })
      const composedResult =  {
        request: filteredRequest,
        response: {
          total: result.hits.total.value,
          cardinality
        }
      }
      response.write(JSON.stringify(composedResult).slice(0,-2) + ",\"aggregations\":[")
      if (buckets.length > 0) {
        const firstItem = buckets.splice(0,1)
        response.write(JSON.stringify(firstItem[0]))
        buckets.forEach((bucketItem: any) => response.write("," + JSON.stringify(bucketItem)))
      }
      while (result.aggregations.myBuckets && result.aggregations.myBuckets.buckets.length > 0 ) {
        requestInput.afterKey = afterKey
        requestBuild = buildRequest(requestInput);
        result = await runRequest(requestBuild, null);
        afterKey = result.aggregations.myBuckets.after_key
        delay += result.took
        const { buckets: afterBucket } = result.aggregations.myBuckets
        if (afterBucket.length > 0 ) {
          afterBucket.forEach((bucketItem: any) => response.write("," + JSON.stringify(bucketItem)))
        }
      }
      response.write(`],"delay": ${delay as string}}}`)
      response.end();
    }
  }
}
