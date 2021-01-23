import multer from 'multer';
import express from 'express';
import forge from 'node-forge';
import Queue from 'bee-queue';
import crypto from 'crypto';
import loggerStream from '../logger';
import { Readable, Transform, pipeline, finished } from 'stream';
import fs from 'fs';
import { createGzip, createGunzip } from 'zlib';
import { promisify } from 'util';
import { parse } from '@fast-csv/parse';
import { format } from '@fast-csv/format';
import { Controller, Get, Post, Delete, Route, Query, Response, Tags, Header, Request, Path } from 'tsoa';
import { csvHandle, returnBulkResults, deleteThreadJob } from '../processStream';

const salt = crypto.randomBytes(128);

// export const router = Router();
// const multerSingle = multer().any();


const validFields: string[] = ['q', 'firstName', 'lastName', 'legalName', 'sex', 'birthDate', 'birthCity', 'birthDepartment', 'birthCountry',
'birthGeoPoint', 'deathDate', 'deathCity', 'deathDepartment', 'deathCountry', 'deathGeoPoint', 'deathAge', 'lastSeenAliveDate',
'size', 'fuzzy', 'block'];



/**
 * @swagger
 *  /search/csv:
 *    post:
 *      summary: Rapprochement par lot
 *      description: Launch bulk matching using csv
 *      tags: [Bulk]
 *      requestBody:
 *        required: false
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                sep:
 *                  type: string
 *                  description: Caractère séparateur
 *                  example: ","
 *                firstName:
 *                  type: string
 *                  description: Prénom
 *                  example: "Prenom"
 *                lastName:
 *                  type: string
 *                  description: Nom de famille
 *                  example: "Nom"
 *                birthDate:
 *                  type: string
 *                  description: Date de naissance au format JJ/MM/AAAA<br>  <li> Pour une date inconnue les valeurs sont 0000 pour AAAA; 00 pour MM et JJ</li><br>
 *                  example: "dateColumn"
 *                chunkSize:
 *                  type: number
 *                  description: Taille du lot pour le  traitement
 *                  example: 20
 *                dateFormat:
 *                  type: string
 *                  description: Format to parse birthdate
 *                  example: YYYY-MM-DD
 *                candidateNumber:
 *                  type: number
 *                  description: Maximum number of matchs candidates to return per identity
 *                  example: 1
 *                fileName:
 *                  type: string
 *                  description: Fichier CSV contenant le noms des identités à comparer
 *                  format: binary
 *      responses:
 *        200:
 *          description: Success de request
 *          content:
 *            application/json:
 *              schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/HealthcheckResponse'
 *                 - example:
 *                     id: 'abc'
 *                     msg: 'started'
 */


@Route('search')
export class BulkController extends Controller {

  @Tags('Bulk')
  @Post('/csv')
  public async uploadCsv(@Request() request: express.Request): Promise<any> {
    await this.handleFile(request);
    // file will be in request.randomFileIsHere, it is a buffer
    if (request.files && request.files.length > 0) {
      // Use random number as enctyption key
      const bytes = forge.random.getBytesSync(32);
      const randomKey = forge.util.bytesToHex(bytes);

      // Get parameters
      const options = {...request.body};
      options.chunkSize =  options.chunkSize || 50;
      options.sep = options.sep || ',';
      options.size = options.size || 10;
      options.encoding = options.encoding || 'utf8';
      options.escape = options.escape || '"';
      options.quote = options.quote === "null" ? null : (options.quote || '"');
      options.randomKey = randomKey;
      options.totalRows = 0;
      options.inputHeaders = [];
      options.outputHeaders = {};
      options.candidateNumber = options.candidateNumber || 1;
      options.pruneScore = options.pruneScore !== undefined ? parseFloat(options.pruneScore) : undefined;
      options.mapField = {};
      validFields.forEach(key => options.mapField[options[key] || key] = key );
      return await csvHandle(request, options)
    } else {
      // res.send({msg: 'no files attached'});
      return {msg: 'no files attached'};
    }
  }


  @Tags('Bulk')
  @Get('/:outputFormat(csv|json)/{id}')
  public async downloadResults(@Request() request: express.Request, @Path() outputFormat: 'csv'|'json', @Path() id: string, @Query() order?: string): Promise<any> {
    if (id) {
      const response = (request).res;
      await returnBulkResults(response, id, outputFormat, order)
    } else {
      return {msg: 'no job id'}
    }
  }

  @Tags('Bulk')
  @Delete('/csv/{id}')
  public async deleteJob(@Request() request: express.Request, @Path() id: string): Promise<any> {
    if (id) {
      const response = (request).res;
      await deleteThreadJob(response, id)
    } else {
      return {msg: 'no job id'}
    }
  }


  private handleFile(request: express.Request): Promise<any> {
    // const multerSingle = multer().single("randomFileIsHere");
    const multerSingle = multer().any();
    return new Promise((resolve, reject) => {
      multerSingle(request, undefined, (error: any) => {
        if (error) {
          reject(error);
        }
        resolve(true);
      });
    });
  }

}
