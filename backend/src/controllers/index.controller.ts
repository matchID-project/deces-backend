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
    @Query() deathCountry?: string
  ) {
    const requestInput = new RequestInput();
    if (q != null) {
      requestInput.fullText.value = q
      const requestBody = buildRequest(requestInput);
      const result = await runRequest(requestBody);
      return  { msg: result.data };
    } else if (firstName || lastName || birthDate || birthCity || birthDepartment || birthCountry || deathDate || deathCity || deathDepartment || deathCountry) {
      // TODO: This could be better
     requestInput['firstName'].value = firstName
     requestInput['birthDate'].value = birthDate
     requestInput['birthCity'].value = birthCity
     requestInput['birthDepartment'].value = birthDepartment
     requestInput['birthCountry'].value = birthCountry
     requestInput['deathDate'].value = deathDate
     requestInput['deathCity'].value = deathCity
     requestInput['deathDepartment'].value = deathDepartment
     requestInput['deathCountry'].value = deathCountry
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
