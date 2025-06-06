import { Controller, Get, Post, Body, Route, Query, Response, Tags, Header, Request, Path, Security } from 'tsoa';
import multer from 'multer';
import forge from 'node-forge';
import express from 'express';
import { writeFile, access, mkdir, createReadStream } from 'fs';
import { promisify } from 'util';
import { resultsHeader, jsonPath, prettyString } from '../processStream';
import { runRequest, runBulkRequest } from '../runRequest';
import { buildRequest } from '../buildRequest';
import { RequestInput, RequestBody } from '../models/requestInput';
import { StrAndNumber, Modification, UpdateRequest, UpdateUserRequest, Review, ReviewsStringified, statusAuthMap, PersonCompare } from '../models/entities';
import { buildResult, buildResultSingle, Result, ErrorResponse } from '../models/result';
import { format } from '@fast-csv/format';
import { ScoreResult, personFromRequest } from '../score';
import { updatedFields } from '../updatedIds';
import { sendUpdateConfirmation } from '../mail';
// import getDataGouvCatalog from '../getDataGouvCatalog';

const writeFileAsync = promisify(writeFile);
const mkdirAsync = promisify(mkdir);
const accessAsync = promisify(access);

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
   * @param birthPostalCode Code postal du lieu de naissance
   * @param birthLocationCode Code INSEE du lieu de naissance
   * @param birthDepartment Code département du lieu de naissance
   * @param birthCountry Libellé de pays de naissance en clair (pour les personnes nées à l'étranger)
   * @param birthGeoPoint Coordonnées GPS du point de naissance
   * @param deathDate Date de décès au format\: JJ/MM/AAAA. <br> <li> Pour une date inconnue les valeurs sont 0000 pour AAAA; 00 pour MM et JJ</li>.<br> <li> Une recherche par tranche de date est également possible sous la forme: JJ/MM/AAAA - JJ/MM/AAAA</li>
   * @param deathCity Localité de décès en claire** (pour les personnes nées en France ou dans les DOM/TOM/COM)
   * @param deathPostalCode Code postal du lieu de décès
   * @param deathLocationCode Code INSEE du lieu de décès
   * @param deathDepartment Code département du lieu de décès
   * @param deathCountry Pays du lieu de décès
   * @param deathGeoPoint Coordonnées GPS du point de décès
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
  @Security("tmp", ["user"])
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
    @Query() birthPostalCode?: string,
    @Query() birthDepartment?: StrAndNumber,
    @Query() birthCountry?: string,
    @Query() birthGeoPoint?: string,
    @Query() deathDate?: StrAndNumber,
    @Query() deathCity?: string,
    @Query() deathLocationCode?: string,
    @Query() deathPostalCode?: string,
    @Query() deathDepartment?: StrAndNumber,
    @Query() deathCountry?: string,
    @Query() deathGeoPoint?: string,
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
    if (q || firstName || lastName || legalName || sex || birthDate || birthCity || birthLocationCode || birthPostalCode || birthDepartment || birthCountry || birthGeoPoint || deathDate || deathCity || deathLocationCode || deathPostalCode || deathDepartment || deathCountry || deathGeoPoint || deathAge || lastSeenAliveDate || source || scroll) {
      const requestInput = new RequestInput({q, firstName, lastName, legalName, sex, birthDate, birthCity, birthPostalCode, birthLocationCode, birthDepartment, birthCountry, birthGeoPoint, deathDate, deathCity, deathPostalCode, deathLocationCode, deathDepartment, deathCountry, deathGeoPoint, deathAge, lastSeenAliveDate, source, scroll, scrollId, size, page, fuzzy, sort});
      if (requestInput.errors.length) {
        this.setStatus(400);
        return  { msg: requestInput.errors };
      }
      if ((firstName || lastName || legalName || sex || birthDate || birthCity || birthLocationCode || birthDepartment || birthCountry || birthGeoPoint || deathDate || deathCity || deathLocationCode || deathDepartment || deathCountry || deathGeoPoint || deathAge) && q) {
        this.setStatus(400);
        return  { msg: "error - simple and complex request at the same time" };
      }
      const requestBuild = buildRequest(requestInput);
      const result = await runRequest(requestBuild, scroll);
      const builtResult = buildResult(result, requestInput)
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
  @Security("tmp", ["user"])
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
      const builtResult = buildResult(result, requestInput)

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
      builtResult = buildResult(result, requestInput)
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
    const builtResult = buildResult(result, requestInput)
    return builtResult
  }



  /**
   * Update by ID
   * @summary Use unique identifier to search for people
   * @param id Person unique identifier
   * must be authentified (user or admin)
   */
  @Security("jwt", ["user"])
  @Response<ErrorResponse>('400', 'Bad request')
  @Tags('Simple')
  @Post('/id/{id}')
  public async updateId(
    @Path() id: string,
    @Body() updateRequest: UpdateRequest,
    @Request() request: express.Request
  ): Promise<any> {
    // get user & rights from Security
    await this.handleFile(request);
    const author = (request as any).user && (request as any).user.user
    const isAdmin = (request as any).user && (request as any).user.scopes && (request as any).user.scopes.includes('admin');
    const requestInput = new RequestInput({id});
    const requestBuild = buildRequest(requestInput);
    const result = await runRequest(requestBuild, requestInput.scroll);
    const builtResult = buildResult(result, requestInput)
    if (builtResult.response.persons.length > 0) {
      const date = new Date(Date.now()).toISOString()
      const bytes = forge.random.getBytesSync(24);
      const randomId = forge.util.bytesToHex(bytes);
      if (!isAdmin) {
        updateRequest = {...await request.body} as UpdateUserRequest;
        let proof;
        const message = updateRequest.message;
        delete updateRequest.message;
        if (request.files && request.files.length as number > 0) {
          const [ file ]: any = request.files
          proof = file.path
        } else if (updateRequest.proof) {
          ({ proof } = updateRequest);
          if (Object.keys(updateRequest).length === 0) {
            this.setStatus(400);
            return { msg: 'A field at least must be provided' }
          }
        } else {
          this.setStatus(400);
          return { msg: 'Proof must be provided' }
        }
        delete updateRequest.proof;
        const correctionData: Modification = {
          id: randomId,
          date,
          proof,
          auth: 0,
          author,
          fields: updateRequest
        };
        if (message) {
          correctionData.message = message;
        }
        try {
          await accessAsync(`${process.env.PROOFS}/${id}`);
        } catch(err) {
          await mkdirAsync(`${process.env.PROOFS}/${id}`, { recursive: true });
        }
        await writeFileAsync(`${process.env.PROOFS}/${id}/${date}_${id}.json`, JSON.stringify(correctionData));
        if (!updatedFields[id]) { updatedFields[id] = [] }
        updatedFields[id].push(correctionData);
        return { msg: "Update stored" };
      } else {
        if (!updatedFields[id]) {
          this.setStatus(406);
          return { msg: "Id exists but no update to validate" }
        } else {
          const checkedIds = {...await request.body} as ReviewsStringified;
          const checks = Object.keys(checkedIds).length;
          const count:any = {
            rejected: 0,
            validated: 0,
            closed: 0,
            noChange: 0
          };
          await Promise.all(updatedFields[id].map(async (update: any) => {
            const review: Review = JSON.parse(checkedIds[update.id]);
            review.date = date;
            if (review.status) {
              const auth = statusAuthMap[review.status];
              const reviewChange = update.review &&
                ['proofQuality','proofScript','proofType','silent','message'].some(k => (review as any)[k] !== update.review[k])
              if ((update.auth !== auth) || reviewChange) {
                update.auth = auth;
                count[review.status]++;
                update.review = review;
                await writeFileAsync(`${process.env.PROOFS}/${id}/${update.date as string}_${id}.json`, JSON.stringify(update));
                if (!review.silent) {
                  await sendUpdateConfirmation(update.author, review.status, review.message, id);
                }
              } else {
                count.noChange++;
              }
              delete checkedIds[update.id];
            }
          }));
          if (Object.keys(checkedIds).length === checks) {
            this.setStatus(406)
            return { msg: "Update ids are all invalid"}
          } else if (Object.keys(checkedIds).length > 0) {
            return {
              msg: "Partial validation could be achieved",
              ...count,
              invalidIds: Object.keys(checkedIds)
            }
          } else {
            return {
              msg: "All validations processed",
              ...count
            }
          }
        }
      }
    } else {
      this.setStatus(404)
      return { msg: "Id not found" }
    }
  }


  /**
   * Get updates list by ID
   * @summary Use unique identifier to search for people
   * @param id Person unique identifier
   * must be authentified (user or admin)
   */
  @Security('jwt',['user'])
  @Tags('Simple')
  @Get('/updated')
  public async updateList(@Request() request: express.Request): Promise<any>  {
    const author = (request as any).user && (request as any).user.user
    const isAdmin = (request as any).user && (request as any).user.scopes && (request as any).user.scopes.includes('admin');
    let updates:any = {};
    if (isAdmin) {
      updates = {...updatedFields};
    } else {
      Object.keys(updatedFields).forEach((id:any) => {
        let filter = false;
        const modifications = updatedFields[id].map((m:any) => {
          const modif:any = {...m}
          if (modif.author !== author) {
            modif.author = modif.author.substring(0,2)
              + '...' + modif.author.replace(/@.*/,'').substring(modif.author.replace(/@.*/,'').length-2)
              + '@' + modif.author.replace(/.*@/,'');
            modif.message = undefined;
            modif.review = undefined;
          } else {
            filter=true
          }
          return modif;
        });
        if (filter) {
          updates[id] = modifications;
        }
      })
    }
    const bulkRequest = {
      searches: Object.keys(updates).map((id: any) => [
        { index: "deces" },
        buildRequest(new RequestInput({id}))
      ]).flat()
    };
    const result = await runBulkRequest(bulkRequest);
    return result.responses.map((r:any) => buildResultSingle(r.hits.hits[0]))
      .map((r:any) => {
        delete r.score;
        delete r.scores;
        r.modifications = updates[r.id];
        return r;
      });
  }

  private async handleFile(request: express.Request): Promise<any> {
    const storage = multer.diskStorage({
      destination: void(async (req: any, file: any, cb: any) => {
        if (file.mimetype !== 'application/pdf') {
          cb(new Error('Only PDF upload is allowed'), null)
        }
        const { id } = req.params;
        const dir = `${process.env.PROOFS}/${id as string}`;
        try {
          await accessAsync(dir);
        } catch(err) {
          await mkdirAsync(dir, { recursive: true });
        }
        cb(null, dir)
      }),
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


  /**
   * Get update proof by ID
   * @summary Use unique identifier to search for people
   * @param id Person unique identifier
   * @param updateId updateId identifier
   */
  @Response<ErrorResponse>('400', 'Bad request')
  @Tags('Proof')
  @Get('/updates/proof/{id}')
  public async getProof(
    @Request() request: express.Request,
    @Path() id: string,
  ): Promise<any> {
    const [, personId, updateId] = /^(.*)-([a-f0-9]+)$/.exec(id);
    if (!updatedFields[personId]) {
      this.setStatus(404);
      return { msg: "No such person id" }
    }
    let proof;
    updatedFields[personId].forEach((update: any) => {
      if (update.id === updateId) {
        proof = update.proof
      }
    })
    if (!proof) {
      this.setStatus(404);
      return { msg: "No such update id" }
    }
    if (/^https?:/.test(proof)) {
      this.setStatus(406);
      return { msg: "Proof is not a file, but a web reference" }
    }
    let start; let end;
    const stream = createReadStream(proof, {
      start,
      end
    });
    stream.pipe(request.res);
    await new Promise((resolve) => {
        stream.on('end', () => {
            request.res.end();
            resolve(true);
        })
    })
  }

  /**
   * Compare identities
   * @summary Compare identities
   */
  @Response<ErrorResponse>('400', 'Bad request')
  @Response<ScoreResult>('200', 'OK')
  @Tags('Simple')
  @Post('/compare')
  public compareIdentitiesPost(@Body() requestBody: PersonCompare): ScoreResult {
    const result = new ScoreResult(personFromRequest(requestBody.personA), personFromRequest(requestBody.personB), requestBody.params)
    return  result;
  }

}
