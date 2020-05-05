import { Controller, Get, Post, Body, Route, Query, Response } from 'tsoa';
import runRequest from '../runRequest';
import buildRequest from '../buildRequest';
import { RequestInput } from '../types/requestInput';
import { RequestInputPost, RequestBody } from '../types/requestInputPost';
import { buildResult, buildResultPost } from '../types/result';
import { Result, ErrorResponse, HealthcheckResponse } from '../types/result';
// import getDataGouvCatalog from '../getDataGouvCatalog';

@Route('')
export class IndexController extends Controller {

  @Response<ErrorResponse>('400', 'Bad request')
  @Response<Result>('200', 'OK')
  @Get('/search')
  public async search(
    @Query() q?: string,
    @Query() firstName?: string,
    @Query() lastName?: string,
    @Query() sex?: string,
    @Query() birthDate?: StrAndNumber,
    @Query() birthCity?: string,
    @Query() birthDepartment?: string,
    @Query() birthCountry?: string,
    @Query() deathDate?: StrAndNumber,
    @Query() deathCity?: string,
    @Query() deathDepartment?: string,
    @Query() deathCountry?: string,
    @Query() deathAge?: StrAndNumber,
    @Query() scroll?: string,
    @Query() scrollId?: string,
    @Query() size?: number,
    @Query() page?: number,
    @Query() fuzzy?: string,
    @Query() sort?: string
  ): Promise<Result> {
    if (q || firstName || lastName || sex || birthDate || birthCity || birthDepartment || birthCountry || deathDate || deathCity || deathDepartment || deathCountry || deathAge || scroll) {
      const requestInput = new RequestInput(q, firstName, lastName, sex, birthDate, birthCity, birthDepartment, birthCountry, deathDate, deathCity, deathDepartment, deathCountry, deathAge, scroll, scrollId, size, page, fuzzy, sort);
      if (requestInput.errors.length) {
        this.setStatus(400);
        return  { msg: requestInput.errors };
      }
      if ((firstName || lastName || sex || birthDate || birthCity || birthDepartment || birthCountry || deathDate || deathCity || deathDepartment || deathCountry || deathAge) && q) {
        this.setStatus(400);
        return  { msg: "error - simple and complex request at the same time" };
      }
      const searchKeys = {q, firstName, lastName, sex, birthDate, birthCity, birthDepartment, birthCountry, deathDate, deathCity, deathDepartment, deathCountry, deathAge, size, page, fuzzy, sort}

      const requestBuild = buildRequest(requestInput);
      const result = await runRequest(requestBuild, scroll);
      const builtResult = buildResult(result.data, requestInput.page, requestInput.size, searchKeys)
      this.setStatus(200);
      return  builtResult;
    } else {
      this.setStatus(400);
      return  { msg: "error - empty request" };
    }
  }

  @Response<ErrorResponse>('400', 'Bad request')
  @Response<Result>('200', 'OK')
  @Post('/search')
  public async searchpost(@Body() requestBody: RequestBody): Promise<Result> {
    if (Object.keys(requestBody).length > 0) {
      const validFields = ['q', 'firstName', 'lastName', 'sex', 'birthDate', 'birthCity', 'birthDepartment', 'birthCountry', 'birthGeoPoint', 'deathDate', 'deathCity', 'deathDepartment', 'deathCountry', 'deathGeoPoint', 'deathAge', 'scroll', 'scrollId', 'size', 'page', 'fuzzy', 'sort']
      const notValidFields = Object.keys(requestBody).filter((item: string) => validFields.indexOf(item) === -1)
      if (notValidFields.length > 0) {
        this.setStatus(400);
        return  { msg: "error - unknown field" };
      }
      if ((requestBody.firstName || requestBody.lastName || requestBody.birthDate || requestBody.birthCity || requestBody.birthDepartment || requestBody.birthCountry || requestBody.birthGeoPoint || requestBody.deathDate || requestBody.deathCity || requestBody.deathDepartment || requestBody.deathCountry || requestBody.deathAge || requestBody.deathGeoPoint ) && requestBody.q) {
        this.setStatus(400);
        return  { msg: "error - simple and complex request at the same time" };
      }
      const requestInput = new RequestInputPost(requestBody);
      if (requestInput.errors.length) {
        this.setStatus(400);
        return  { msg: requestInput.errors };
      }
      const requestBuild = buildRequest(requestInput);
      const result = await runRequest(requestBuild, requestInput.scroll);
      const builtResult = buildResultPost(result.data, requestInput)
      this.setStatus(200);
      return builtResult;
    } else {
      this.setStatus(400);
      return  { msg: "error - empty request" };
    }
  }

  @Response<HealthcheckResponse>('200', 'OK')
  @Get('/healthcheck')
  public msg(): HealthcheckResponse {
    return { msg: 'OK' };
  }

  @Get('/version')
  public version(): string {
    return process.env.APP_VERSION;
  }
}

type StrAndNumber = string | number;

export const flatJson = (item: object|string) => {
  if (Array.isArray(item)) {
    return `"${item.join(' ')}"`
  } else if (typeof(item) === 'object') {
    return Object.values(item)
      .map(x => {
        if (x == null) {
          return ""
        } else {
          return `"${x}"`
        }
      })
      .join(',')
  } else {
    return `"${item}"`
  }
}

export const nameHeader = 'score,source,id,name,firstName,lastName,sex,birthDate,birthCity,cityCode,departmentCode,country,countryCode,latitude,longitude,deathDate,certificateId,age,deathCity,cityCode,departmentCode,country,countryCode,latitude,longitude\r\n'
