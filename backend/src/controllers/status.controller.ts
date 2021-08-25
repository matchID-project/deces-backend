import { Controller, Get, Route, Response, Tags  } from 'tsoa';
import { HealthcheckResponse } from '../models/result';
import { processChunk } from '../processStream';

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
  public async msg(): Promise<HealthcheckResponse> {
    const result = await processChunk(
      [{firstName: 'jean', lastName: 'pierre', birthDate: '04/08/1933'}],
      5,
      {
        dateFormat: 'dd/MM/yyyy',
      }
    )
    if (result.length > 0 && result[0].length > 0 && result[0][0].sex ) {
      return { msg: 'OK' };
    } else {
      return { msg: 'KO' };
    }
  }

  /**
   * Backend version endpoint
   * @summary Obtenir la version du backend
   */
  @Tags('Check')
  @Get('/version')
  public version(): string {
    return process.env.APP_VERSION;
  }
}
