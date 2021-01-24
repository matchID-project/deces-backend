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
import { Controller, Hidden, Get, Post, Delete, Route, Query, Response, Tags, Header, Request, Path } from 'tsoa';
import { csvHandle, returnBulkResults, deleteThreadJob } from '../processStream';

const validFields: string[] = ['q', 'firstName', 'lastName', 'legalName', 'sex', 'birthDate', 'birthCity', 'birthDepartment', 'birthCountry',
'birthGeoPoint', 'deathDate', 'deathCity', 'deathDepartment', 'deathCountry', 'deathGeoPoint', 'deathAge', 'lastSeenAliveDate',
'size', 'fuzzy', 'block'];


@Hidden()
@Route('search')
export class BulkController extends Controller {

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

  /**
   * @swagger
   * tags:
   *   name: Bulk
   *   description: Rapprochement par lot
   */

  /**
   * @swagger
   * /search/csv/:jobId:
   *    get:
   *      description: Obtenir le statut et le résultat du job
   *      summary: Obtenir le statut et le résultat du traitement
   *      tags: [Bulk]
   *      parameters:
   *       - in: path
   *         name: jobId
   *         schema:
   *           type: string
   *           example: 'abc'
   *         required: true
   *         description: ID of the job
   *       - in: query
   *         name: order
   *         schema:
   *           type: string
   *           example: 'true'
   *         required: false
   *         description: Order matching result columns together
   *      responses:
   *        200:
   *          description: Success de request
   *          content:
   *            text/csv:
   *              schema:
   *                type: string
   *                description: CSV results
   *                example: Prenom,Nom,Date,score,source,id,name,firstName,lastName,sex,birthDate,birthCity,cityCode,departmentCode,country,countryCode,latitude,longitude,deathDate,certificateId,age,deathCity,cityCode,departmentCode,country,countryCode,latitude,longitude \r\n "DENISE","GERMAN","03/02/1952","142.26564","s3://fichier-des-personnes-decedees/deaths","83ad9a6737289a3abd6f35e3a16996c8a3b21fd2","Denise Josephine","German","F","19520203","Septfontaines","25541","25","France","FRA","46.9739924","6.1738194","19760729","1782","24","Septfontaines","25541","25","France","FRA","46.9739924","6.1738194"\r\n "JEAN PIERRE YANNICK","GOUETI","15/01/1953" \r\n "JOSE","PONSARD","30/12/1952","163.79218","s3://fichier-des-personnes-decedees/deaths","99f809265af83e7ea0d98adff4dace0f5c763d0b","Jose","Ponsard","M","19521230","Saulx","70478","70","France","FRA","47.6962074","6.2758008","20050615","7761","52","Saulx","70478","70","France","FRA","47.6962074","6.2758008" \r\n
   *
   * /search/json/:jobId:
   *    get:
   *      description: Obtenir le statut et le résultat du job
   *      summary: Obtenir le statut et le résultat du traitement
   *      tags: [Bulk]
   *      parameters:
   *       - in: path
   *         name: jobId
   *         schema:
   *           type: string
   *           example: 'abc'
   *         required: true
   *         description: ID of the job
   *       - in: query
   *         name: order
   *         schema:
   *           type: string
   *           example: 'true'
   *         required: false
   *         description: Order matching result columns together
   *      responses:
   *        200:
   *          description: Success de request
   *          content:
   *            application/json:
   *              schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/Result'
   */
  @Tags('Bulk')
  @Get('/:outputFormat(csv|json)/{id}')
  public async downloadResults(@Request() request: express.Request, @Path() outputFormat: 'csv'|'json', @Path() id: string, @Query() order?: string): Promise<any> {
    if (id) {
      await returnBulkResults((request).res, id, outputFormat, order)
    } else {
      return {msg: 'no job id'}
    }
  }

  /**
   * @swagger
   * /search/csv/{jobId}:
   *    delete:
   *      description: Annuler un traitement en cours
   *      summary: Annuler un traitement en cours
   *      tags: [Bulk]
   *      parameters:
   *       - in: path
   *         name: jobId
   *         schema:
   *           type: string
   *           example: 'abc'
   *         required: true
   *         description: ID of the job
   *      responses:
   *        200:
   *          description: Success de request
   *          content:
   *            application/json:
   *              schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/HealthcheckResponse'
   *                 - example:
   *                     msg: 'Job 1234 cancelled'
   */
  @Tags('Bulk')
  @Delete('/csv/{id}')
  public async deleteJob(@Request() request: express.Request, @Path() id: string): Promise<any> {
    if (id) {
      await deleteThreadJob((request).res, id)
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
