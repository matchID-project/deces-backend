import { Controller, Get, Route, Response, Tags  } from 'tsoa';
import { HealthcheckResponse } from '../models/result';
import { getClient } from '../elasticsearch';
import loggerStream from '../logger';

interface DecesRecord {
  DATE_DECES: string;
  SOURCE: string;
}

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
    try {
      const client = getClient();

      if (!uniqRecordsCount) {
        const response = await client.count({
          index: 'deces'
        });
        uniqRecordsCount = response.count;
      }

      if (!lastRecordDate || !lastDataset) {
        const response = await client.search({
          index: 'deces',
          body: {
            sort: [
              { SOURCE: 'desc' },
              { 'DATE_DECES.raw': 'desc' }
            ],
            size: 1
          } as any
        });

        if (response.hits.hits.length > 0) {
          const source = response.hits.hits[0]._source as DecesRecord;
          lastRecordDate = source.DATE_DECES.replace(/(\d{4})(\d{2})(\d{2})/,"$3/$2/$1");
          lastDataset = source.SOURCE;
        }
      }

      if (!updateDate) {
        const response = await client.cat.indices({
          index: 'deces',
          format: 'json',
          h: 'creation.date.string'
        });

        if (response.length > 0) {
          updateDate = response[0]['creation.date.string']
            .trim()
            .replace(/T.*/,'')
            .replaceAll('-','')
            .replace(/(\d{4})(\d{2})(\d{2})/,"$3/$2/$1");
        }
      }

      return {
        backend: process.env.APP_VERSION,
        uniqRecordsCount,
        lastRecordDate,
        lastDataset,
        updateDate
      };
    } catch (error) {
      loggerStream.write(JSON.stringify({
        "backend": {
          "server-date": new Date(Date.now()).toISOString(),
          "error": error.toString(),
          "msg": "Error fetching version info"
        }
      }));
      return {
        backend: process.env.APP_VERSION,
        error: 'Failed to fetch Elasticsearch data'
      };
    }
  }
}
