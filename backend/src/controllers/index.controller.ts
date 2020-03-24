import { Controller, Get, Post, Body, Route, Query, SuccessResponse, Response } from 'tsoa';
import axios from 'axios';
import runRequest from '../runRequest';
import buildRequest from '../buildRequest';
import { RequestInput } from '../types/requestInput';
import { RequestInputPost, RequestBody } from '../types/requestInputPost';


@Route('')
export class IndexController extends Controller {

  @SuccessResponse('200', 'Created')
  @Response('400', 'Bad request')
  @Get('/search')
  public async search(
    @Query() q?: string,
    @Query() firstName?: string,
    @Query() lastName?: string,
    @Query() birthDate?: string,
    @Query() birthCity?: string,
    @Query() birthDepartment?: string,
    @Query() birthCountry?: string,
    @Query() deathDate?: string,
    @Query() deathCity?: string,
    @Query() deathDepartment?: string,
    @Query() deathCountry?: string,
    @Query() size?: number,
    @Query() page?: number,
    @Query() fuzzy?: string,
    @Query() sort?: string
  ) {
    if (q || firstName || lastName || birthDate || birthCity || birthDepartment || birthCountry || deathDate || deathCity || deathDepartment || deathCountry) {
      const requestInput = new RequestInput(q, firstName, lastName, birthDate, birthCity, birthDepartment, birthCountry, deathDate, deathCity, deathDepartment, deathCountry, size, page, fuzzy, sort);
      if (requestInput.error) {
        this.setStatus(400);
        return  { msg: "error - field content error" };
      }
      const requestBuild = buildRequest(requestInput);
      const result = await runRequest(requestBuild);
      this.setStatus(200);
      return  { msg: result.data };
    } else {
      this.setStatus(400);
      return  { msg: "error - empty request" };
    }
  }

  @SuccessResponse('200', 'Created')
  @Response('400', 'Bad request')
  @Post('/search')
  public async searchpost(@Body() requestBody: RequestBody) {
    if (Object.keys(requestBody).length > 0) {
      const validFields = ['q', 'firstName', 'lastName', 'birthDate', 'birthCity', 'birthDepartment', 'birthCountry', 'deathDate', 'deathCity', 'deathDepartment', 'deathCountry', 'size', 'page', 'fuzzy', 'sort']
      const notValidFields = Object.keys(requestBody).filter((item: string) => !validFields.includes(item) )
      if (notValidFields.length > 0) {
        this.setStatus(400);
        return  { msg: "error - unknown field" };
      }
      const requestInput = new RequestInputPost(requestBody);
      if (requestInput.error) {
        this.setStatus(400);
        return  { msg: "error - field content error" };
      }
      const requestBuild = buildRequest(requestInput);
      const result = await runRequest(requestBuild);
      this.setStatus(200);
      return  { msg: result.data };
    } else {
      this.setStatus(400);
      return  { msg: "error - empty request" };
    }
  }

  @Get('/healthcheck')
  public msg() {
    return { msg: 'OK' };
  }
}
