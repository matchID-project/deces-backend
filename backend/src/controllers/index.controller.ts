import { Controller, Get, Route, Query } from 'tsoa';
import axios from 'axios';
import runRequest from '../runRequest';
import buildRequest from '../buildRequest';
import RequestInput from '../types/requestInput';


@Route('')
export class IndexController extends Controller {
  @Get('')
  public async index() {
    const result = await axios.get("http://elasticsearch:9200/deces")
    return { msg: result.data };
  }

  @Get('/search')
  public async search(@Query() q?: string, @Query() firstName?: string, @Query() birthDate?: string, @Query() birthYear?: string) {
    const requestInput = new RequestInput();
    if (q != null) {
      requestInput.fullText.value = q
      const requestBody = buildRequest(requestInput);
      const result = await runRequest(requestBody);
      return  { msg: result.data };
    } else if (firstName || birthDate || birthYear) {
      if (firstName) {
        requestInput.firstName.value = firstName
      }
      if (birthDate) {
        requestInput.birthDate.value = birthDate
      }
      if (birthYear) {
        requestInput.birthYear.value = birthYear
      }
      const requestBody = buildRequest(requestInput);
      const result = await runRequest(requestBody);
      return  { msg: result.data };
    } else {
      return { msg: 'Empty'};
    }
  }

  @Get('/healthcheck')
  public msg() {
    return { msg: 'OK' };
  }
}
