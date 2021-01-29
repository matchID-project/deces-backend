import { Controller, Get, Post, Body, Route, Query, Response, Tags, Header, Request, Path } from 'tsoa';
import express from 'express';
import { resultsHeader, jsonPath, prettyString } from '../processStream';
import { runRequest } from '../runRequest';
import { buildRequest } from '../buildRequest';
import { RequestInput, RequestBody } from '../models/requestInput';
import { buildResult } from '../models/result';
import { Result, ResultAgg, ErrorResponse, HealthcheckResponse } from '../models/result';
import { format } from '@fast-csv/format';
// import getDataGouvCatalog from '../getDataGouvCatalog';

@Route('')
export class IndexController extends Controller {

  /**
   * Launch single request
   * @summary Rapprocher une seule identité
   * @param q Nom, prénom, date de naissance ou de décès (JJ/MM/AAAA)
   * @param firstName Prénom
   * @param lastName Nom de famille
   * @param legalName Nom d'usage
   * @param sex Sexe
   * @param birthDate Date de naissance au format\: JJ/MM/AAAA<br>  <li> Pour une date inconnue les valeurs sont 0000 pour AAAA; 00 pour MM et JJ</li><br> <li> Une recherche par tranche de date est également possible sous la forme: JJ/MM/AAAA - JJ/MM/AAAA</li>
   * @param birthCity Localité\: de naissance en claire (pour les personnes nées en France ou dans les DOM/TOM/COM)
   * @param birthLocationCode Code INSEE du lieu de naissance
   * @param birthDepartment Code département du lieu de naissance
   * @param birthCountry Libellé de pays de naissance en clair (pour les personnes nées à l'étranger)
   * @param deathDate Date de décès au format\: JJ/MM/AAAA. <br> <li> Pour une date inconnue les valeurs sont 0000 pour AAAA; 00 pour MM et JJ</li>.<br> <li> Une recherche par tranche de date est également possible sous la forme: JJ/MM/AAAA - JJ/MM/AAAA</li>
   * @param deathCity Localité de décès en claire** (pour les personnes nées en France ou dans les DOM/TOM/COM)
   * @param deathLocationCode Code INSEE du lieu de décès
   * @param deathDepartment Code département du lieu de décès
   * @param deathCountry Pays du lieu de décès
   * @param deathAge Age du décès
   * @param lastSeenAliveDate Dernière fois que la personne était vue en vie
   * @param scroll Le temps durant lequel le contexte de la requête doit être garde
   * @param scrollId Identifiant technique du contexte
   * @param size Nombre d\'identités retourne par page
   * @param page Numéro de page
   * @param fuzzy Recherche floue ou exacte
   * @param sort Tri sur les colonnes (à préciser sur la structure du champs)
   */
  @Response<ErrorResponse>('400', 'Bad request')
  @Response<Result>('200', 'OK')
  @Tags('Simple')
  @Get('/search')
  public async search(
    @Query() q?: string,
    @Query() firstName?: string,
    @Query() lastName?: string,
    @Query() legalName?: string,
    @Query() sex?: 'M'|'F'|'H',
    @Query() birthDate?: StrAndNumber,
    @Query() birthCity?: string,
    @Query() birthLocationCode?: string,
    @Query() birthDepartment?: string,
    @Query() birthCountry?: string,
    @Query() deathDate?: StrAndNumber,
    @Query() deathCity?: string,
    @Query() deathLocationCode?: string,
    @Query() deathDepartment?: string,
    @Query() deathCountry?: string,
    @Query() deathAge?: StrAndNumber,
    @Query() lastSeenAliveDate?: string,
    @Query() scroll?: string,
    @Query() scrollId?: string,
    @Query() size?: number,
    @Query() page?: number,
    @Query() fuzzy?: 'true'|'false',
    @Query() sort?: string
  ): Promise<Result> {
    if (q || firstName || lastName || legalName || sex || birthDate || birthCity || birthLocationCode || birthDepartment || birthCountry || deathDate || deathCity || deathLocationCode || deathDepartment || deathCountry || deathAge || lastSeenAliveDate || scroll) {
      const requestInput = new RequestInput({q, firstName, lastName, legalName, sex, birthDate, birthCity, birthLocationCode, birthDepartment, birthCountry, deathDate, deathCity, deathLocationCode, deathDepartment, deathCountry, deathAge, lastSeenAliveDate, scroll, scrollId, size, page, fuzzy, sort});
      if (requestInput.errors.length) {
        this.setStatus(400);
        return  { msg: requestInput.errors };
      }
      if ((firstName || lastName || legalName || sex || birthDate || birthCity || birthLocationCode || birthDepartment || birthCountry || deathDate || deathCity || deathLocationCode || deathDepartment || deathCountry || deathAge) && q) {
        this.setStatus(400);
        return  { msg: "error - simple and complex request at the same time" };
      }
      const requestBuild = buildRequest(requestInput);
      const result = await runRequest(requestBuild, scroll);
      const builtResult = buildResult(result.data, requestInput)
      this.setStatus(200);
      return  builtResult;
    } else {
      this.setStatus(400);
      return  { msg: "error - empty request" };
    }
  }

  /**
   * Launch single request
   * @summary Rapprocher une seule identité
   * @param accept Format of the response text/csv for csv otherwise application/json
   */
  @Response<ErrorResponse>('400', 'Bad request')
  @Response<Result>('200', 'OK')
  @Tags('Simple')
  @Post('/search')
  public async searchpost(@Body() requestBody: RequestBody, @Request() request: express.Request, @Header('Accept') accept?: string): Promise<Result> {
    const response = (request).res;
    if (Object.keys(requestBody).length > 0) {
      const validFields = ['q', 'firstName', 'lastName', 'legalName', 'sex', 'birthDate', 'birthCity', 'birthLocationCode', 'birthDepartment', 'birthCountry', 'birthGeoPoint', 'deathDate', 'deathCity', 'deathLocationCode', 'deathDepartment', 'deathCountry', 'deathGeoPoint', 'deathAge', 'scroll', 'scrollId', 'size', 'page', 'fuzzy', 'sort', 'lastSeenAliveDate', 'headerLang']
      const notValidFields = Object.keys(requestBody).filter((item: string) => !validFields.includes(item))
      if (notValidFields.length > 0) {
        this.setStatus(400);
        return  { msg: "error - unknown field" };
      }
      if ((requestBody.firstName || requestBody.lastName || requestBody.legalName || requestBody.birthDate || requestBody.birthCity || requestBody.birthLocationCode || requestBody.birthDepartment || requestBody.birthCountry || requestBody.birthGeoPoint || requestBody.deathDate || requestBody.deathCity || requestBody.deathLocationCode || requestBody.deathDepartment || requestBody.deathCountry || requestBody.deathAge || requestBody.deathGeoPoint || requestBody.lastSeenAliveDate ) && requestBody.q) {
        this.setStatus(400);
        return  { msg: "error - simple and complex request at the same time" };
      }
      const requestInput = new RequestInput(requestBody);
      if (requestInput.errors.length) {
        this.setStatus(400);
        return  { msg: requestInput.errors };
      }
      if (accept === 'text/csv') {
        requestInput.scroll = '1m'
        requestInput.size = 1000
      }
      const requestBuild = buildRequest(requestInput);
      const result = await runRequest(requestBuild, requestInput.scroll);
      const builtResult = buildResult(result.data, requestInput)
      if (accept === 'text/csv') {
        if (builtResult.response.total < 500000) {
          await this.responseJson2Csv(response, builtResult, requestInput, requestBody.headerLang)
        } else {
          this.setStatus(402);
          return  { msg: "error - Too large request:  payment required" };
        }
      } else {
        return builtResult;
      }
    } else {
      this.setStatus(400);
      return  { msg: "error - empty request" };
    }
  }

  private async responseJson2Csv(response: express.Response, builtResult: Result, requestInput: RequestInput, headerLang: string): Promise<void> {
    let requestBuild;
    let result;
    response.setHeader('Content-disposition', 'attachment; filename=download.csv');
    response.setHeader('total-results', builtResult.response.total);
    response.setHeader('Content-Type', 'text/csv');

    const csvStream = format({
      headers: false,
      writeHeaders: true,
      delimiter: ',',
      transform: (row: any) => {
        // remove id, score and scores column
        row.splice(0, 2)
        row.splice(1, 1)
        // prettify date format
        if (row[4] !== 'date_naissance') {
          row.splice(4, 1, row[4].replace(/(\d{4})(\d{2})(\d{2})/,"$3/$2/$1"))
          row.splice(14, 1, row[14].replace(/(\d{4})(\d{2})(\d{2})/,"$3/$2/$1"))
        }
        return row
      }
    });

    // pipe csvstream write to response
    csvStream.pipe(response)

    if (headerLang === 'french') {
      csvStream.write([
        ...resultsHeader.map(h => h.labelFr.replace(/\.location/, '').replace(/\./,' '))
      ]
      );
    } else {
      csvStream.write([
        ...resultsHeader.map(h => h.label.replace(/\.location/, '').replace(/\./,' '))
      ]
      );
    }
    builtResult.response.persons.forEach((row: any) => {
      csvStream.write([
        ...resultsHeader.map(key => prettyString(jsonPath(row, key.label)))
      ])
    });
    while ( builtResult.response.persons.length > 0 ) {
      requestInput.scrollId = builtResult.response.scrollId
      requestBuild = buildRequest(requestInput);
      result = await runRequest(requestBuild, requestInput.scroll);
      builtResult = buildResult(result.data, requestInput)
      builtResult.response.persons.forEach((row: any) => {
        csvStream.write([
          ...resultsHeader.map(key => prettyString(jsonPath(row, key.label)))
        ])
      });
    }
  }

  /**
   * Search by ID
   * @summary Use unique identifier to search for people
   * @param id Person unique identifier
   */
  @Response<ErrorResponse>('400', 'Bad request')
  @Response<Result>('200', 'OK')
  @Tags('Simple')
  @Get('/id/{id}')
  public async searchId(
    @Path() id: string
  ): Promise<Result> {
    const requestInput = new RequestInput({id});
    const requestBuild = buildRequest(requestInput);
    const result = await runRequest(requestBuild, requestInput.scroll);
    const builtResult = buildResult(result.data, requestInput)
    return builtResult
  }

  @Tags('Simple')
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
    @Query() birthDepartment?: string,
    @Query() birthCountry?: string,
    @Query() deathDate?: StrAndNumber,
    @Query() deathCity?: string,
    @Query() deathDepartment?: string,
    @Query() deathCountry?: string,
    @Query() deathAge?: StrAndNumber,
    @Query() fuzzy?: 'true'|'false',
    @Query() aggs?: string,
    @Header('Accept') accept?: string
  ): Promise<ResultAgg> {
    if (q || firstName || lastName || legalName || sex || birthDate || birthCity || birthDepartment || birthCountry || deathDate || deathCity || deathDepartment || deathCountry || deathAge) {
      if (aggs === undefined) {
        this.setStatus(400);
        return  { msg: "error - missing aggs parameter" };
      }
      const requestInput = new RequestInput({q, firstName, lastName, legalName, sex, birthDate, birthCity, birthDepartment, birthCountry, deathDate, deathCity, deathDepartment, deathCountry, deathAge, fuzzy, size: 0, aggs});
      if (requestInput.errors.length) {
        this.setStatus(400);
        return  { msg: requestInput.errors };
      }
      if ((firstName || lastName || legalName || sex || birthDate || birthCity || birthDepartment || birthCountry || deathDate || deathCity || deathDepartment || deathCountry || deathAge) && q) {
        this.setStatus(400);
        return  { msg: "error - simple and complex request at the same time" };
      }
      await this.streamAggs((request).res, requestInput, accept)
    } else {
      this.setStatus(400);
      return  { msg: "error - empty request" };
    }
  }

  @Tags('Simple')
  @Post('/agg')
  public async aggregationPost(@Body() requestBody: RequestBody, @Request() request: express.Request, @Header('Accept') accept?: string): Promise<ResultAgg> {
    if (Object.keys(requestBody).length > 0) {
      const validFields = ['q', 'firstName', 'lastName', 'legalName', 'sex', 'birthDate', 'birthCity', 'birthDepartment', 'birthCountry', 'deathDate', 'deathCity', 'deathDepartment', 'deathCountry', 'deathAge', 'fuzzy', 'aggs']
      const notValidFields = Object.keys(requestBody).filter((item: string) => !validFields.includes(item))
      if (notValidFields.length > 0) {
        this.setStatus(400);
        return  { msg: "error - unknown field" };
      }
      if (requestBody.aggs === undefined) {
        this.setStatus(400);
        return  { msg: "error - missing aggs parameter" };
      }
      if ((requestBody.firstName || requestBody.lastName || requestBody.legalName || requestBody.birthDate || requestBody.birthCity || requestBody.birthDepartment || requestBody.birthCountry || requestBody.birthGeoPoint || requestBody.deathDate || requestBody.deathCity || requestBody.deathDepartment || requestBody.deathCountry || requestBody.deathAge || requestBody.deathGeoPoint ) && requestBody.q) {
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
    } else {
      this.setStatus(400);
      return  { msg: "error - empty request" };
    }
  }

  private async streamAggs(response: any, requestInput: any, accept: string) {
    let requestBuild = buildRequest(requestInput);
    let result = await runRequest(requestBuild, null);

    let afterKey
    let buckets
    const cardinality: any = {}
    let { took: delay } = result.data
    if (result.data.aggregations.myBuckets) {
      afterKey = result.data.aggregations.myBuckets.after_key
      requestInput.aggs.forEach((agg: string) => {
        cardinality[agg] = result.data.aggregations[`${agg}_count`].value
        response.setHeader(`total-results-${agg}`, result.data.aggregations[`${agg}_count`].value);
      });
      buckets = result.data.aggregations.myBuckets.buckets
    } else {
      requestInput.aggs.forEach((agg: string) => {
        cardinality[agg] = result.data.aggregations[agg].buckets.length
        response.setHeader(`total-results-${agg}`, result.data.aggregations[agg].buckets.length);
        buckets = result.data.aggregations[agg].buckets
      });
    }
    if (accept === 'text/csv') {
      response.setHeader('Content-Type', 'text/csv');
      const csvStream = format({
        headers: true,
        writeHeaders: true,
        delimiter: ',',
      });
      csvStream.pipe(response)

      if (buckets.length > 0) {
        buckets.forEach((bucketItem: any) => {
          const aggKeys: any = {}
          if (result.data.aggregations.myBuckets) {
            Object.entries(bucketItem.key).forEach(([key, value]) => {
              aggKeys[key] = value
            })
            aggKeys.value = bucketItem.doc_count
          } else {
            Object.entries(bucketItem).forEach(([key, value]) => {
              aggKeys[key] = value
            })
          }
          csvStream.write(aggKeys)
        })
      }
      while (result.data.aggregations.myBuckets && result.data.aggregations.myBuckets.buckets.length > 0 ) {
        requestInput.afterKey = afterKey
        requestBuild = buildRequest(requestInput);
        result = await runRequest(requestBuild, null);
        afterKey = result.data.aggregations.myBuckets.after_key
        delay += result.data.took
        const { buckets: afterBucket } = result.data.aggregations.myBuckets
        if (afterBucket.length > 0 ) {
          afterBucket.forEach((bucketItem: any) => {
            const aggKeys: any = {}
            Object.entries(bucketItem.key).forEach(([key, value]) => {
              aggKeys[key] = value
            })
            aggKeys.value = bucketItem.doc_count
            csvStream.write(aggKeys)
          })
        }
      }
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
          total: result.data.hits.total.value,
          cardinality
        }
      }
      response.write(JSON.stringify(composedResult).slice(0,-2) + ",\"aggregations\":[")
      if (buckets.length > 0) {
        const firstItem = buckets.splice(0,1)
        response.write(JSON.stringify(firstItem[0]))
        buckets.forEach((bucketItem: any) => response.write("," + JSON.stringify(bucketItem)))
      }
      while (result.data.aggregations.myBuckets && result.data.aggregations.myBuckets.buckets.length > 0 ) {
        requestInput.afterKey = afterKey
        requestBuild = buildRequest(requestInput);
        result = await runRequest(requestBuild, null);
        afterKey = result.data.aggregations.myBuckets.after_key
        delay += result.data.took
        const { buckets: afterBucket } = result.data.aggregations.myBuckets
        if (afterBucket.length > 0 ) {
          afterBucket.forEach((bucketItem: any) => response.write("," + JSON.stringify(bucketItem)))
        }
      }
      response.write(`],"delay": ${delay as string}}}`)
    }
  }

  @Response<HealthcheckResponse>('200', 'OK')
  @Tags('Check')
  @Get('/healthcheck')
  public msg(): HealthcheckResponse {
    return { msg: 'OK' };
  }

  @Tags('Check')
  @Get('/version')
  public version(): string {
    return process.env.APP_VERSION;
  }
}

type StrAndNumber = string | number;
