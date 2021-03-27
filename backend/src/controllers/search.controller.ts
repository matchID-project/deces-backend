import { Controller, Get, Post, Body, Route, Query, Response, Tags, Header, Request, Path, Security } from 'tsoa';
import multer from 'multer';
import forge from 'node-forge';
import express from 'express';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resultsHeader, jsonPath, prettyString } from '../processStream';
import { runRequest } from '../runRequest';
import { buildRequest } from '../buildRequest';
import { RequestInput, RequestBody } from '../models/requestInput';
import { StrAndNumber, UpdateFields } from '../models/entities';
import { buildResult, Result, ErrorResponse } from '../models/result';
import { format } from '@fast-csv/format';
import { updatedFields } from '../updatedIds';
// import getDataGouvCatalog from '../getDataGouvCatalog';

/**
 * @swagger
 * tags:
 *   name: Simple
 *   description: Recherche d'identité simple
 */
@Route('')
export class SearchController extends Controller {

  /**
   * Launch single request
   * @summary Rapprocher une seule identité
   * @param q Nom, prénom, date de naissance ou de décès (JJ/MM/AAAA)
   * @param firstName Prénom
   * @param lastName Nom de famille
   * @param legalName Nom d'usage
   * @param sex Sexe
   * @param birthDate Date de naissance au format\: JJ/MM/AAAA<br>  <li> Pour une date inconnue les valeurs sont 0000 pour AAAA; 00 pour MM et JJ</li><br> <li> Une recherche par tranche de date est également possible sous la forme: JJ/MM/AAAA - JJ/MM/AAAA</li>
   * @param birthCity Localité\: de naissance en claire (pour les personnes nées en France ou dans les DOM/TOM/COM)
   * @param birthLocationCode Code INSEE du lieu de naissance
   * @param birthDepartment Code département du lieu de naissance
   * @param birthCountry Libellé de pays de naissance en clair (pour les personnes nées à l'étranger)
   * @param deathDate Date de décès au format\: JJ/MM/AAAA. <br> <li> Pour une date inconnue les valeurs sont 0000 pour AAAA; 00 pour MM et JJ</li>.<br> <li> Une recherche par tranche de date est également possible sous la forme: JJ/MM/AAAA - JJ/MM/AAAA</li>
   * @param deathCity Localité de décès en claire** (pour les personnes nées en France ou dans les DOM/TOM/COM)
   * @param deathLocationCode Code INSEE du lieu de décès
   * @param deathDepartment Code département du lieu de décès
   * @param deathCountry Pays du lieu de décès
   * @param deathAge Age du décès
   * @param lastSeenAliveDate Dernière fois que la personne était vue en vie
   * @param source Nom du fichier INSEE source
   * @param scroll Le temps durant lequel le contexte de la requête doit être garde
   * @param scrollId Identifiant technique du contexte
   * @param size Nombre d\'identités retourne par page
   * @param page Numéro de page
   * @param fuzzy Recherche floue ou exacte
   * @param sort Tri sur les colonnes (à préciser sur la structure du champs)
   */
  @Response<ErrorResponse>('400', 'Bad request')
  @Response<Result>('200', 'OK')
  @Tags('Simple')
  @Get('/search')
  public async search(
    @Query() q?: string,
    @Query() firstName?: string,
    @Query() lastName?: string,
    @Query() legalName?: string,
    @Query() sex?: 'M'|'F'|'H',
    @Query() birthDate?: StrAndNumber,
    @Query() birthCity?: string,
    @Query() birthLocationCode?: string,
    @Query() birthDepartment?: StrAndNumber,
    @Query() birthCountry?: string,
    @Query() deathDate?: StrAndNumber,
    @Query() deathCity?: string,
    @Query() deathLocationCode?: string,
    @Query() deathDepartment?: StrAndNumber,
    @Query() deathCountry?: string,
    @Query() deathAge?: StrAndNumber,
    @Query() lastSeenAliveDate?: string,
    @Query() source?: string,
    @Query() scroll?: string,
    @Query() scrollId?: string,
    @Query() size?: number,
    @Query() page?: number,
    @Query() fuzzy?: 'true'|'false',
    @Query() sort?: string
  ): Promise<Result> {
    if (q || firstName || lastName || legalName || sex || birthDate || birthCity || birthLocationCode || birthDepartment || birthCountry || deathDate || deathCity || deathLocationCode || deathDepartment || deathCountry || deathAge || lastSeenAliveDate || source || scroll) {
      const requestInput = new RequestInput({q, firstName, lastName, legalName, sex, birthDate, birthCity, birthLocationCode, birthDepartment, birthCountry, deathDate, deathCity, deathLocationCode, deathDepartment, deathCountry, deathAge, lastSeenAliveDate, source, scroll, scrollId, size, page, fuzzy, sort});
      if (requestInput.errors.length) {
        this.setStatus(400);
        return  { msg: requestInput.errors };
      }
      if ((firstName || lastName || legalName || sex || birthDate || birthCity || birthLocationCode || birthDepartment || birthCountry || deathDate || deathCity || deathLocationCode || deathDepartment || deathCountry || deathAge) && q) {
        this.setStatus(400);
        return  { msg: "error - simple and complex request at the same time" };
      }
      const requestBuild = buildRequest(requestInput);
      const result = await runRequest(requestBuild, scroll);
      const builtResult = buildResult(result.data, requestInput)
      this.setStatus(200);
      return  builtResult;
    } else {
      this.setStatus(400);
      return  { msg: "error - empty request" };
    }
  }

  /**
   * Launch single request
   * @summary Rapprocher une seule identité
   * @param accept Format of the response text/csv for csv otherwise application/json
   */
  @Response<ErrorResponse>('400', 'Bad request')
  @Response<Result>('200', 'OK')
  @Tags('Simple')
  @Post('/search')
  public async searchpost(@Body() requestBody: RequestBody, @Request() request: express.Request, @Header('Accept') accept?: string): Promise<Result> {
    const response = (request).res;
    if (Object.keys(requestBody).length > 0) {
      const validFields = ['q', 'firstName', 'lastName', 'legalName', 'sex', 'birthDate', 'birthCity', 'birthLocationCode', 'birthDepartment', 'birthCountry', 'birthGeoPoint', 'deathDate', 'deathCity', 'deathLocationCode', 'deathDepartment', 'deathCountry', 'deathGeoPoint', 'deathAge', 'scroll', 'scrollId', 'size', 'page', 'fuzzy', 'sort', 'lastSeenAliveDate', 'source', 'headerLang']
      const notValidFields = Object.keys(requestBody).filter((item: string) => !validFields.includes(item))
      if (notValidFields.length > 0) {
        this.setStatus(400);
        return  { msg: "error - unknown field" };
      }
      if ((requestBody.firstName || requestBody.lastName || requestBody.legalName || requestBody.birthDate || requestBody.birthCity || requestBody.birthLocationCode || requestBody.birthDepartment || requestBody.birthCountry || requestBody.birthGeoPoint || requestBody.deathDate || requestBody.deathCity || requestBody.deathLocationCode || requestBody.deathDepartment || requestBody.deathCountry || requestBody.deathAge || requestBody.deathGeoPoint || requestBody.lastSeenAliveDate || requestBody.source ) && requestBody.q) {
        this.setStatus(400);
        return  { msg: "error - simple and complex request at the same time" };
      }
      const requestInput = new RequestInput(requestBody);
      if (requestInput.errors.length) {
        this.setStatus(400);
        return  { msg: requestInput.errors };
      }
      if (accept === 'text/csv') {
        requestInput.scroll = '1m'
        requestInput.size = 1000
      }
      const requestBuild = buildRequest(requestInput);
      const result = await runRequest(requestBuild, requestInput.scroll);
      const builtResult = buildResult(result.data, requestInput)

      if (accept === 'text/csv') {
        if (builtResult.response.total < 500000) {
          await this.responseJson2Csv(response, builtResult, requestInput, requestBody.headerLang)
        } else {
          this.setStatus(402);
          return  { msg: "error - Too large request:  payment required" };
        }
      } else {
        return builtResult;
      }
    } else {
      this.setStatus(400);
      return  { msg: "error - empty request" };
    }
  }

  private async responseJson2Csv(response: express.Response, builtResult: Result, requestInput: RequestInput, headerLang: string): Promise<void> {
    let requestBuild;
    let result;
    response.setHeader('Content-disposition', 'attachment; filename=download.csv');
    response.setHeader('total-results', builtResult.response.total);
    response.setHeader('Content-Type', 'text/csv');

    const csvStream = format({
      headers: false,
      writeHeaders: true,
      delimiter: ',',
      transform: (row: any) => {
        // remove id, score and scores column
        row.splice(0, 2)
        row.splice(1, 1)
        // prettify date format
        if (row[4] !== 'date_naissance') {
          row.splice(4, 1, row[4].replace(/(\d{4})(\d{2})(\d{2})/,"$3/$2/$1"))
          row.splice(14, 1, row[14].replace(/(\d{4})(\d{2})(\d{2})/,"$3/$2/$1"))
        }
        return row
      }
    });

    // pipe csvstream write to response
    csvStream.pipe(response)

    if (headerLang === 'french') {
      csvStream.write([
        ...resultsHeader.map(h => h.labelFr.replace(/\.location/, '').replace(/\./,' '))
      ]
      );
    } else {
      csvStream.write([
        ...resultsHeader.map(h => h.label.replace(/\.location/, '').replace(/\./,' '))
      ]
      );
    }
    builtResult.response.persons.forEach((row: any) => {
      csvStream.write([
        ...resultsHeader.map(key => prettyString(jsonPath(row, key.label)))
      ])
    });
    while ( builtResult.response.persons.length > 0 ) {
      requestInput.scrollId = builtResult.response.scrollId
      requestBuild = buildRequest(requestInput);
      result = await runRequest(requestBuild, requestInput.scroll);
      builtResult = buildResult(result.data, requestInput)
      builtResult.response.persons.forEach((row: any) => {
        csvStream.write([
          ...resultsHeader.map(key => prettyString(jsonPath(row, key.label)))
        ])
      });
    }
    csvStream.end()
  }

  /**
   * Search by ID
   * @summary Use unique identifier to search for people
   * @param id Person unique identifier
   */
  @Response<ErrorResponse>('400', 'Bad request')
  @Response<Result>('200', 'OK')
  @Tags('Simple')
  @Get('/id/{id}')
  public async searchId(
    @Path() id: string
  ): Promise<Result> {
    const requestInput = new RequestInput({id});
    const requestBuild = buildRequest(requestInput);
    const result = await runRequest(requestBuild, requestInput.scroll);
    const builtResult = buildResult(result.data, requestInput)
    return builtResult
  }

  /**
   * Update by ID
   * @summary Use unique identifier to search for people
   * @param id Person unique identifier
   * must be authentified (simple, user or admin)
   */
  @Security("jwt", ["user"])
  @Response<ErrorResponse>('400', 'Bad request')
  @Tags('Simple')
  @Post('/id/{id}')
  public async updateId(
    @Path() id: string,
    @Body() updateFields: UpdateFields,
    @Request() request: express.Request
  ): Promise<any> {
    await this.handleFile(request);
    // get user & rights from Security
    const author = (request as any).user && (request as any).user.user
    const isAdmin = (request as any).user && (request as any).user.scopes && (request as any).user.scopes.includes('admin');
    const requestInput = new RequestInput({id});
    const requestBuild = buildRequest(requestInput);
    const result = await runRequest(requestBuild, requestInput.scroll);
    const builtResult = buildResult(result.data, requestInput)
    if (builtResult.response.persons.length > 0) {
      let proof
      const date = new Date(Date.now()).toISOString()
      const bytes = forge.random.getBytesSync(24);
      const randomId = forge.util.bytesToHex(bytes);
      if (!isAdmin) {
        if (request.files && request.files.length > 0) {
          const [ file ]: any = request.files
          proof = file.path
          updateFields = {...await request.body};
        } else if (updateFields.proof) {
          ({ proof } = updateFields);
          delete updateFields.proof
          if (Object.keys(updateFields).length === 0) {
            this.setStatus(400);
            return { msg: 'A field at least must be provided' }
          }
        } else {
          this.setStatus(400);
          return { msg: 'Proof must be provided' }
        }
        const correctionData = {
          id: randomId,
          date,
          proof,
          auth: 0,
          author,
          fields: updateFields
        }
        if (!existsSync(`./data/proofs/${id}`)){
          mkdirSync(`./data/proofs/${id}`, { recursive: true });
        }
        writeFileSync(`./data/proofs/${id}/${date}_${id}.json`, JSON.stringify(correctionData));
        if (!updatedFields[id]) { updatedFields[id] = [] }
        updatedFields[id].push(correctionData);
        return { msg: "Updated stored" };
      } else {
        if (!updatedFields[id]) {
          this.setStatus(406);
          return { msg: "Id exists but no update to validate" }
        } else {
          const checkedIds = {...await request.body};
          const checks = Object.keys(checkedIds).length;
          let validated = 0;
          let rejected = 0;
          (updatedFields as any)[id].forEach((update: any) => {
            if (checkedIds[update.id] === 'true') {
              update.auth = 1;
              validated++;
              writeFileSync(`./data/proofs/${id}/${update.date as string}_${id}.json`, JSON.stringify(update));
              delete checkedIds[update.id];
            } else if (checkedIds[update.id] === 'false') {
              update.auth = -1;
              rejected++;
              writeFileSync(`./data/proofs/${id}/${update.date as string}_${id}.json`, JSON.stringify(update));
              delete checkedIds[update.id];
            }
          })
          if (Object.keys(checkedIds).length === checks) {
            this.setStatus(406)
            return { msg: "Update ids are all invalid"}
          } else if (Object.keys(checkedIds).length > 0) {
            return {
              msg: "Partial validation could be achieved",
              validated,
              rejected,
              invalidIds: Object.keys(checkedIds)
            }
          } else {
            return {
              msg: "All validations processed",
              validated,
              rejected
            }
          }
        }
      }
    } else {
      this.setStatus(404)
      return { msg: "Id not found" }
    }
  }

  @Tags('Simple')
  @Get('/updated')
  public updateList(): any {
    return updatedFields
  }

  private handleFile(request: express.Request): Promise<any> {
    const storage = multer.diskStorage({
      destination: (req, _, cb) => {
        const { id } = req.params
        const dir = `./data/proofs/${id}`
        if (!existsSync(dir)){
          mkdirSync(dir, { recursive: true });
        }
        cb(null, dir)
      },
      filename: (_, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
        cb(null, `${uniqueSuffix}_${file.originalname}`)
      }
    })
    const multerSingle = multer({storage}).any();
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
