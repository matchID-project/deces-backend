import multer from 'multer';
import express from 'express';
import Queue from 'bee-queue';
import forge from 'node-forge';
import { Router } from 'express';
import { RequestInput } from '../models/requestInput';
import { buildRequest } from '../buildRequest';
import { runBulkRequest } from '../runRequest';
import { buildResultSingle, ResultRawES } from '../models/result';
import { scoreResults } from '../score';

const encryptionIv = forge.random.getBytesSync(16);
const salt = forge.random.getBytesSync(128);

export const router = Router();
const multerSingle = multer().any();

let stopJob = false;
const inputsArray: JobInput[]= []
const resultsArray: JobResult[]= []
const queue = new Queue('example',  {
  redis: {
    host: 'redis'
  }
});
queue.process(async (job: Queue.Job) => {
  const jobIndex = inputsArray.findIndex(x => x.id === job.id)
  const jobFile = inputsArray.splice(jobIndex, 1).pop()
  const rows: any = jobFile.file.split(/\s*\r?\n\r?\s*/).map((str: string) => str.split(job.data.sep)); // TODO: parse all the attachements
  const validFields: string[] = ['q', 'firstName', 'lastName', 'sex', 'birthDate', 'birthCity', 'birthDepartment', 'birthCountry',
  'birthGeoPoint', 'deathDate', 'deathCity', 'deathDepartment', 'deathCountry', 'deathGeoPoint', 'deathAge',
  'size', 'fuzzy', 'block'];
  const jsonFields: string[] = ['birthGeoPoint','deathGeoPoint','block']
  const mapField: any = {};
  validFields.map(key => mapField[job.data[key] || key] = key );
  const header: any = {};
  let nFields:any = 0;
  rows.shift().forEach((key: string, idx: number) => {
    header[idx] =  key;
    nFields++;
  });
  let json = [{
    metadata: {
      mapping: mapField,
      header: [...Array(nFields).keys()].map(idx => header[idx])
    }
  }];
  json = json.concat(rows
    .filter((row: string[]) => row.length === nFields)
    .map((row: string[]) => {
      const request: any = {
        metadata: {
          source: {}
        }
      }
      row.forEach((value: string, idx: number) => {
        if (mapField[header[idx]]) {
          request[mapField[header[idx]]] = jsonFields.includes(header[idx]) ? JSON.parse(value) : value;
        }
        request.metadata.source[header[idx]] = value;
      });
      request.block = request.block
                      ? request.block
                      : job.data.block
                        ? JSON.parse(job.data.block)
                        : {
                          scope: ['name', 'birthDate'],
                          minimum_match: 1,
                          should: true
                        };
      return request;
    }))
  return processSequential(json, job)
});

const processSequential = async (rows: any, job: any): Promise<any> => { // partial fix until the next release of bee-queue
  const resultsSeq = []
  const chunk = Number(job.data.chunkSize);
  let temparray: any;
  let i;
  let j;
  for (i=0, j=rows.length; i<j; i+=chunk) {
    temparray = rows.slice(i,i+chunk);
    const bulkRequest = temparray.map((row: any) => { // TODO: type
      const requestInput = new RequestInput(row.q, row.firstName, row.lastName, row.sex, row.birthDate, row.birthCity, row.birthDepartment, row.birthCountry, row.birthGeoPoint, row.deathDate, row.deathCity, row.deathDepartment, row.deathCountry, row.deathGeoPoint, row.deathAge, row.scroll, row.scrollId, row.size, row.page, row.fuzzy, row.sort, row.block);
      return [JSON.stringify({index: "deces"}), JSON.stringify(buildRequest(requestInput))];
    })
    const msearchRequest = bulkRequest.map((x: any) => x.join('\n\r')).join('\n\r') + '\n';
    const result = await runBulkRequest(msearchRequest);
    if (result.data.responses.length > 0) {
      result.data.responses.forEach((item: ResultRawES, idx: number) => {
        if (item.hits.hits.length > 0) {
          const scoredResults = scoreResults(temparray[idx], item.hits.hits.map(hit => buildResultSingle(hit)))
          if (scoredResults && scoredResults.length > 0) {
            resultsSeq.push({...temparray[idx], ...scoredResults[0]})
          } else {
            resultsSeq.push(temparray[idx])
          }
        } else {
          resultsSeq.push(temparray[idx])
        }
      })
    } else {
      resultsSeq.push(temparray)
    }
    job.reportProgress({rows: resultsSeq.length, percentage: resultsSeq.length / rows.length * 100})
    if (stopJob) break;
  }
  stopJob = false;
  return resultsSeq
};

const encryptFile = (nodeBuffer: Buffer, password: string): forge.util.ByteStringBuffer => {
  const encryptionKey = forge.pkcs5.pbkdf2(password, salt, 16, 16);
  const cipher = forge.cipher.createCipher('AES-CBC', encryptionKey);
  cipher.start({iv: encryptionIv});
  const forgeBuffer = forge.util.createBuffer(nodeBuffer.toString('binary'))
  cipher.update(forgeBuffer);
  cipher.finish();
  return cipher.output;
}

const decryptFile = (encryptedData: forge.util.ByteStringBuffer, password: string): string => {
  const encryptionKey = forge.pkcs5.pbkdf2(password, salt, 16, 16);
  const decipher = forge.cipher.createDecipher('AES-CBC', encryptionKey);
  decipher.start({iv: encryptionIv});
  decipher.update(encryptedData);
  const result = decipher.finish(); // check 'result' for true/false
  if (result) {
    return decipher.output.toString();
  } else {
    return "error decrypting"
  }
}

/**
 * @swagger
 * path:
 *  /search/csv:
 *    post:
 *      summary: Bulk match
 *      description: Launch bulk matching using csv
 *      tags: [Bulk]
 *      requestBody:
 *        description: Information pour réserver une place d'examen
 *        required: false
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                sep:
 *                  type: string
 *                  description: Separator delimiter
 *                  example: ","
 *                firstName:
 *                  type: string
 *                  description: Column name for first name
 *                  example: "Prenom"
 *                lastName:
 *                  type: string
 *                  description: Column name for last name
 *                  example: "Nom"
 *                birthDate:
 *                  type: string
 *                  description: Column name for birthdate
 *                  example: "dateColumn"
 *                chunkSize:
 *                  type: number
 *                  description: Chunk size for processing
 *                  example: 20
 *                fileName:
 *                  type: string
 *                  description: CSV file with identities to match
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
router.post('/csv', multerSingle, async (req: any, res: express.Response) => {
  if (req.files && req.files.length > 0) {
    // Get parameters
    const options = {...req.body};
    options.chunkSize =  options.chunkSize || 20;
    options.sep = options.sep || ',';
    options.size = options.size || 10;

    // Use random number as enctyption key
    const bytes = forge.random.getBytesSync(32);
    const randomKey = forge.util.bytesToHex(bytes);

    // Use hash key index
    const md = forge.md.sha256.create();
    md.update(randomKey);
    inputsArray.push({id: md.digest().toHex(), file: req.files[0].buffer.toString()}) // Use key hash as job identifier
    const job = await queue
      .createJob({...options})
      .setId(md.digest().toHex())
      // .reportProgress({rows: 0, percentage: 0}) TODO: add for bee-queue version 1.2.4
      .save()
    job.on('succeeded', (result: any) => {
      const encryptedResult = encryptFile(Buffer.from(JSON.stringify(result)), randomKey)
      resultsArray.push({id: job.id, result: encryptedResult})
      setTimeout(() => {
        const jobIndex = resultsArray.findIndex(x => x.id === job.id)
        resultsArray.splice(jobIndex, 1)
      }, 3600000) // Delete results after 1 hour
    });
    res.send({msg: 'started', id: randomKey});
  } else {
    res.send({msg: 'no files attached'});
  }
});

/**
 * @swagger
 * tags:
 *   name: Bulk
 *   description: Matching par lot
 */

/**
 * @swagger
 * /search/csv/{jobId}:
 *    get:
 *      description: Get job status and result
 *      summary: Get job status and result
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
 *            text/csv:
 *              schema:
 *                type: string
 *                description: CSV results
 *                example: Prenom,Nom,Date,score,source,id,name,firstName,lastName,sex,birthDate,birthCity,cityCode,departmentCode,country,countryCode,latitude,longitude,deathDate,certificateId,age,deathCity,cityCode,departmentCode,country,countryCode,latitude,longitude \r\n "DENISE","GERMAN","03/02/1952","142.26564","s3://fichier-des-personnes-decedees/deaths","83ad9a6737289a3abd6f35e3a16996c8a3b21fd2","Denise Josephine","German","F","19520203","Septfontaines","25541","25","France","FRA","46.9739924","6.1738194","19760729","1782","24","Septfontaines","25541","25","France","FRA","46.9739924","6.1738194"\r\n "JEAN PIERRE YANNICK","GOUETI","15/01/1953" \r\n "JOSE","PONSARD","30/12/1952","163.79218","s3://fichier-des-personnes-decedees/deaths","99f809265af83e7ea0d98adff4dace0f5c763d0b","Jose","Ponsard","M","19521230","Saulx","70478","70","France","FRA","47.6962074","6.2758008","20050615","7761","52","Saulx","70478","70","France","FRA","47.6962074","6.2758008" \r\n
 *
 * /search/json/{jobId}:
 *    get:
 *      description: Get job status and result
 *      summary: Get job status and result
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
 *                 - $ref: '#/components/schemas/Result'
 */
router.get('/:format(csv|json)/:id?', async (req: any, res: express.Response) => {
  if (req.params.id) {
    const md = forge.md.sha256.create();
    md.update(req.params.id);
    const job: Queue.Job|any = await queue.getJob(md.digest().toHex())
    if (job && job.status === 'succeeded') {
      const jobResult = resultsArray.find(x => x.id === md.digest().toHex())
      if (jobResult == null) {
        res.send({msg: 'No results'})
      } else {
        const clone = Object.assign( Object.create( Object.getPrototypeOf(jobResult.result)), jobResult.result) // Clone to avoid problems with shift and original object
        const initialCopy =  decryptFile(clone, req.params.id)
        const decryptedResult = JSON.parse(initialCopy)
        if (decryptedResult == null || decryptedResult.length === 0) {
          res.send({msg: 'Empty results'})
        } else if (req.params.format === 'json') {
          decryptedResult.shift() // TODO: discuss if the metadata firs line (mapping & header) shall be kepts or not
          res.send(decryptedResult);
        } else if (req.params.format === 'csv') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/csv');
          const sourceHeader = decryptedResult.shift().metadata.header;
          res.write([
            ...sourceHeader,
            ...resultsHeader.map(h => h.replace(/\.location/, '').replace(/\./,' '))
          ].join(job.data.sep) + '\r\n'
          );
          decryptedResult.forEach((result: any) => {
            // console.log(resultsHeader.map(key => jsonPath(result,key)));
            res.write([
              ...sourceHeader.map((key: string) => result.metadata.source[key]),
              ...resultsHeader.map(key => jsonPath(result, key))
            ].join(job.data.sep) + '\r\n')
          });
          res.end();
        } else {
          res.send({msg: 'Not available format'})
        }
      }
    } else if (job) {
      res.send({status: job.status, id: req.params.id, progress: job.progress});
    } else {
      res.send({msg: 'job doesn\'t exists'});
    }
  } else {
    res.send({msg: 'no job id'})
  }
});

router.delete('/:format(csv|json)/:id?', async (req: any, res: express.Response) => {
  if (req.params.id) {
    const md = forge.md.sha256.create();
    md.update(req.params.id);
    const job: Queue.Job|any= await queue.getJob(md.digest().toHex())
    if (job && job.status === 'created') {
      stopJob = true;
      res.send({msg: `Job ${req.params.id} cancelled`})
    } else if (job) {
      res.send({msg: `job is ${job.status}`})
    } else {
      res.send({msg: 'no job found'})
    }
  } else {
    res.send({msg: 'no job id'})
  }
});

export const jsonPath = (json: any, path: string): any => {
  if (!json) { return undefined }
  if (!path.includes('.')) {
    return json[path];
  } else {
    return jsonPath(
      json[path.replace(/\..*$/,'')],
      path.replace(/^.*?\./,'')
    );
  }
}

export const resultsHeader = [
  'score', 'source', 'id', 'name.last', 'name.first', 'sex',
  'birth.date', 'birth.location.city', 'birth.location.departmentCode',
  'birth.location.country', 'birth.location.countryCode', 'birth.location.latitude',
  'birth.location.longitude',
  'death.date', 'death.certificateId', 'death.age', 'death.location.city',
  'death.location.cityCode', 'death.location.departmentCode', 'death.location.country',
  'death.location.countryCode', 'death.location.latitude', 'death.location.longitude']

interface JobInput {
  id: string;
  file: string;
}

interface JobResult {
  id: string;
  result: forge.util.ByteStringBuffer;
}
