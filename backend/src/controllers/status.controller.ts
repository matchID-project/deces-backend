import { Controller, Get, Route, Response, Tags  } from 'tsoa';
import { HealthcheckResponse } from '../models/result';
import axios from 'axios';

let uniqRecordsCount: number;
let lastDataset: string;
let lastRecordDate: string;
let updateDate: string;

/**
 * @swagger
 * tags:
 *   name: Check
 *   description: Vérification status du backend
 */
@Route('')
export class StatusController extends Controller {

  /**
   * Health check endpoint
   * @summary Requête utilise pour vérifier le bon fonctionnement du backend
   */
  @Response<HealthcheckResponse>('200', 'OK')
  @Tags('Check')
  @Get('/healthcheck')
  public msg(): HealthcheckResponse {
    return { msg: 'OK' };
  }

  /**
   * Backend version endpoint
   * @summary Obtenir la version du backend
   */
  @Tags('Info')
  @Get('/version')
  public async version(): Promise<any> {
    if (! uniqRecordsCount) {
      const response = await axios(`http://elasticsearch:9200/deces/_count`);
      if (response.status === 200) {
        uniqRecordsCount = response.data.count
      }
    }
    if (! lastRecordDate || ! lastDataset) {
      const response = await axios(`http://elasticsearch:9200/deces/_search?sort=SOURCE:desc,DATE_DECES.raw:desc&size=1`);
      if (response.status === 200) {
        lastRecordDate = response.data.hits.hits[0]._source.DATE_DECES.replace(/(\d{4})(\d{2})(\d{2})/,"$3/$2/$1")
        lastDataset = response.data.hits.hits[0]._source.SOURCE
      }
    }
    if (! updateDate) {
      const response = await axios(`http://elasticsearch:9200/_cat/indices/deces?h=creation.date.string`);
      if (response.status === 200) {
        updateDate = response.data.trim().replace(/T.*/,'').replaceAll('-','').replace(/(\d{4})(\d{2})(\d{2})/,"$3/$2/$1")
      }
    }


    return {
      backend: process.env.APP_VERSION,
      uniqRecordsCount: uniqRecordsCount,
      lastRecordDate: lastRecordDate,
      lastDataset: lastDataset,
      updateDate: updateDate
    }
  }
}
