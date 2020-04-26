import { Controller, Get, Post, Body, Route, Query, SuccessResponse, Response, Example } from 'tsoa';
import runRequest from '../runRequest';
import buildRequest from '../buildRequest';
import { RequestInput } from '../types/requestInput';
import { RequestInputPost, RequestBody } from '../types/requestInputPost';
import { buildResult, buildResultPost } from '../types/result';
import { Result } from '../types/result';
// import getDataGouvCatalog from '../getDataGouvCatalog';


@Route('')
export class IndexController extends Controller {

  @SuccessResponse('200', 'Return Result')
  @Example<Result>({
    request:{
      firstName:"Jean Pierre",
      deathDate:"1970",
      fuzzy:"false"
    },
    response: {
      total: 1,
      maxScore: 10.54,
      size: 20,
      page: 1,
      delay: 2,
      persons: [{
        score:10.542101,
        source:"2020-m01",
        id:"ba7582a6344757e67351bf42096c952a12108e06",
        name:{"first":["Jean","Pierre"],"last":"Dupont"},
        sex: "M",
        birth:{
          date:"19691111",
          location:{
            city:"Clermont-Ferrand",
            cityCode:"63113",
            departmentCode:"63",
            country:"France",
            countryCode:"FRA",
            latitude: 45.7833,
            longitude: 3.0833
          }
        },
        death:{
          date:"20200604",
          certificateId: "69 N",
          age: 50,
          location:{
            "city":"Clermont-Ferrand",
            "cityCode":"63113",
            "departmentCode":"63",
            "country":"France",
            "countryCode":"FRA",
            latitude: 45.7833,
            longitude: 3.0833
          }
        }
      }]
    }
  })
  @Response('400', 'Bad request')
  @Get('/search')
  public async search(
    @Query() q?: string,
    @Query() firstName?: string,
    @Query() lastName?: string,
    @Query() sex?: string,
    @Query() birthDate?: string,
    @Query() birthCity?: string,
    @Query() birthDepartment?: string,
    @Query() birthCountry?: string,
    @Query() deathDate?: string,
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
  ) {
    if (q || firstName || lastName || sex || birthDate || birthCity || birthDepartment || birthCountry || deathDate || deathCity || deathDepartment || deathCountry || deathAge || scroll) {
      const requestInput = new RequestInput(q, firstName, lastName, sex, birthDate, birthCity, birthDepartment, birthCountry, deathDate, deathCity, deathDepartment, deathCountry, deathAge, scroll, scrollId, size, page, fuzzy, sort);
      if (requestInput.error) {
        this.setStatus(400);
        return  { msg: "error - field content error" };
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

  @SuccessResponse('200', 'Return Result')
  @Example<Result>({
    request:{
      firstName:"Jean Pierre",
      deathDate:"1970",
      fuzzy:"false"
    },
    response: {
      total: 1,
      maxScore: 10.54,
      size: 20,
      page: 1,
      delay: 2,
      persons: [{
        score:10.542101,
        source:"2020-m01",
        id:"ba7582a6344757e67351bf42096c952a12108e06",
        name:{"first":["Jean","Pierre"],"last":"Dupont"},
        sex: "M",
        birth:{
          date:"19691111",
          location:{
            city:"Clermont-Ferrand",
            cityCode:"63113",
            departmentCode:"63",
            country:"France",
            countryCode:"FRA",
            latitude: 45.7833,
            longitude: 3.0833
          }
        },
        death:{
          date:"20200604",
          certificateId: "69 N",
          age: 50,
          location:{
            "city":"Clermont-Ferrand",
            "cityCode":"63113",
            "departmentCode":"63",
            "country":"France",
            "countryCode":"FRA",
            latitude: 45.7833,
            longitude: 3.0833
          }
        }
      }]
    }
  })
  @Response('400', 'Bad request')
  @Post('/search')
  public async searchpost(@Body() requestBody: RequestBody) {
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
      if (requestInput.error) {
        this.setStatus(400);
        return  { msg: "error - field content error" };
      }
      const requestBuild = buildRequest(requestInput);
      const result = await runRequest(requestBuild, requestInput.scroll);
      const builtResult = buildResultPost(result.data, requestInput)
      this.setStatus(200);
      return  builtResult;
    } else {
      this.setStatus(400);
      return  { msg: "error - empty request" };
    }
  }

  @Get('/healthcheck')
  public msg() {
    return { msg: 'OK' };
  }

  @Get('/version')
  public version() {
    return process.env.APP_VERSION;
  }
}

type StrAndNumber = string | number;
