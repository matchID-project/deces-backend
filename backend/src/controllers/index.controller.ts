import { Controller, Get, Post, Body, Route, Query } from 'tsoa';
import axios from 'axios';
import runRequest from '../runRequest';
import buildRequest from '../buildRequest';
import RequestInput from '../types/requestInput';

interface RequestBody {
  [key: string]: any; // Index signature
  q?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  birthCity?: string;
  birthDepartment?: string;
  birthCountry?: string;
  deathDate?: string;
  deathCity?: string;
  deathDepartment?: string;
  deathCountry?: string;
  size?: number;
  page?: number;
  fuzzy?: boolean;
}


@Route('')
export class IndexController extends Controller {
  @Get('')
  public async index() {
    const result = await axios.get("http://elasticsearch:9200/deces")
    return { msg: result.data };
  }

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
    @Query() fuzzy: boolean = true
  ) {
    const requestInput = new RequestInput(size, page);
    if (q != null) {
      requestInput.fullText.value = q
      const requestBody = buildRequest(requestInput);
      const result = await runRequest(requestBody);
      return  { msg: result.data };
    } else if (firstName || lastName || birthDate || birthCity || birthDepartment || birthCountry || deathDate || deathCity || deathDepartment || deathCountry) {
      const inputParams: any = {
        firstName,
        lastName,
        birthDate,
        birthCity,
        birthDepartment,
        birthCountry,
        deathDate,
        deathCity,
        deathCountry,
        deathDepartment
      }
      Object.keys(inputParams).map((key: string) => {
        requestInput[key].value = inputParams[key];
        requestInput[key].fuzzy = fuzzy ? "auto" : false;
      });
      const requestBody = buildRequest(requestInput);
      const result = await runRequest(requestBody);
      return  { msg: result.data };
    } else {
      return { msg: 'Empty'};
    }
  }
  
  @Post('/search')
  public async searchpost(@Body() requestBody: RequestBody) {
    const requestInput = new RequestInput();
    requestInput['fullText'].value = requestBody['q'] ? requestBody['q'] : "";
    Object.keys(requestBody).map((key: string) => {
      if (key !== 'q') {
        requestInput[key].value = requestBody[key];
        requestInput[key].fuzzy = requestBody.fuzzy ? "auto" : false;
      }
    })
    const requestBuild = buildRequest(requestInput);
    const result = await runRequest(requestBuild);
    return  { msg: result.data };
  }

  @Get('/healthcheck')
  public msg() {
    return { msg: 'OK' };
  }
}
