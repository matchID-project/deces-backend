import multer from 'multer';
import express from 'express';
import Queue from 'bee-queue';
import forge from 'node-forge';
import { Router } from 'express';
import { RequestInput } from '../models/requestInput';
import { buildRequest } from '../buildRequest';
import { runBulkRequest } from '../runRequest';
import { buildResultSingle } from '../models/result';

const encryptionIv = forge.random.getBytesSync(16);
const salt = forge.random.getBytesSync(128);

export const router = Router();
const multerSingle = multer().any();

const inputsArray: any[]= []
const resultsArray: any[]= []
const queue = new Queue('example',  {
  redis: {
    host: 'redis'
  }
});
queue.process(async (job: Queue.Job) => {
  const jobFile = inputsArray.find(x => x.id === job.id)
  const rows = jobFile.file.split('\n').map((str: string) => str.split(job.data.sep)) // TODO: parse all the attachements
  const headers = rows.shift();
  const json = rows
    .filter((row: string[]) => row.length === headers.length)
    .map((row: string[]) => {
      const readRow: any = {} // TODO
      headers.forEach((key: string, idx: number) => readRow[key] = row[idx])
      return {
        firstName: readRow[job.data.firstName] ? readRow[job.data.firstName] : '',
        lastName: readRow[job.data.lastName] ? readRow[job.data.lastName] : '',
        birthDate: readRow[job.data.birthDate] ? readRow[job.data.birthDate] : ''
      }
    })
  return processSequential(json, job)
});

const processSequential = async (rows: any, job: Queue.Job) => {
  const resultsSeq = []
  const chunk = Number(job.data.chunkSize);
  let temparray: any;
  let i;
  let j;
  for (i=0, j=rows.length; i<j; i+=chunk) {
    temparray = rows.slice(i,i+chunk);
    const bulkRequest = temparray.map((row: any) => { // TODO: type
      const requestInput = new RequestInput(null, row.firstName, row.lastName, null, row.birthDate);
      return [JSON.stringify({index: "deces"}), JSON.stringify(buildRequest(requestInput))];
    })
    const msearchRequest = bulkRequest.map((x: any) => x.join('\n\r')).join('\n\r') + '\n';
    const result = await runBulkRequest(msearchRequest);
    if (result.data.responses.length > 0) {
      result.data.responses.forEach((item: any, idx: number) => {
        if (item.hits.hits.length > 0) {
          resultsSeq.push({...temparray[idx], ...buildResultSingle(item.hits.hits[0])})
        } else {
          resultsSeq.push(temparray[idx])
        }
      })
    } else {
      resultsSeq.push(temparray)
    }
    job.reportProgress(resultsSeq.length)
  }
  return resultsSeq
};

const encryptFile = (buffer: string, password: string) => {
  const encryptionKey = forge.pkcs5.pbkdf2(password, salt, 16, 16);
  const cipher = forge.cipher.createCipher('AES-CBC', encryptionKey);
  cipher.start({iv: encryptionIv});
  const mybuf = forge.util.createBuffer(buffer)
  cipher.update(mybuf);
  cipher.finish();
  return cipher.output;
}

const decryptFile = (encryptedData: any, password: string) => { // input: BytesStringBuffer
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
    const sep = req.body && req.body.sep ? req.body.sep : ','
    const firstName = req.body && req.body.firstName ? req.body.firstName : 'firstName'
    const lastName = req.body && req.body.lastName ? req.body.lastName : 'lastName'
    const birthDate = req.body && req.body.birthDate ? req.body.birthDate : 'birthDate'
    const chunkSize = req.body && req.body.chunkSize ? req.body.chunkSize : 20

    // Use timeStamp as encryption key
    const timeStamp = new Date().getTime().toString()

    // Use hash key index
    const md = forge.md.sha256.create();
    md.update(timeStamp);
    inputsArray.push({id: md.digest().toHex(), file: req.files[0].buffer.toString()})
    const job = await queue
      .createJob({sep, firstName, lastName, birthDate, chunkSize})
      .setId(md.digest().toHex())
      .save()
    job.on('succeeded', (result: any) => {
      // TODO: debug results encryption
      // const encryptedResult = encryptFile(result, timeStamp)
      const encryptedResult = result
      resultsArray.push({id: job.id, result: encryptedResult})
    });
    res.send({msg: 'started', id: timeStamp});
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
  const md = forge.md.sha256.create();
  md.update(req.params.id);
  const job: Queue.Job|any = await queue.getJob(md.digest().toHex())
  if (job && job.status === 'succeeded') {
    const jobResult  = resultsArray.find(x => x.id === md.digest().toHex())
    // TODO: debug result encryption
    // const decryptedResult = decryptFile(jobResult.result, req.params.id)
    const decryptedResult = jobResult.result
    if (decryptedResult == null || decryptedResult.length === 0) {
      res.send('No results')
    } else if (req.params.format === 'json') {
      res.send(decryptedResult);
    } else if (req.params.format === 'csv') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/csv');
      let updatedHeader = nameHeader;
      if (job.data.birthDate) updatedHeader = [job.data.birthDate, ...updatedHeader]
      if (job.data.lastName) updatedHeader = [job.data.lastName, ...updatedHeader]
      if (job.data.firstName) updatedHeader = [job.data.firstName, ...updatedHeader]
      res.write(updatedHeader.join(',') + '\r\n')
      decryptedResult.forEach((result: any) => {
        res.write(Object.values(result)
          .map((item: any) => {
            if (typeof(item) === 'object') {
              return Object.values(item).map(flatJson).join(',')
            } else {
              return `"${item}"`
            }
          })
          .join(',') + '\r\n'
        )})
      res.end();
    } else {
      res.send('Not available format')
    }
  } else if (job) {
    res.send({status: job.status, id: req.params.id, progress: job.progress});
  } else {
    res.send({msg: 'job doesn\'t exists'});
  }
});

const flatJson = (item: object|string): string => {
  if (Array.isArray(item)) {
    return `"${item.join(' ')}"`
  } else if (typeof(item) === 'object') {
    return Object.values(item)
      .map(x => {
        if (x == null) {
          return ""
        } else {
          return `"${x}"`
        }
      })
      .join(',')
  } else {
    return `"${item}"`
  }
}

const nameHeader = [
  'score', 'source', 'id',
  'name', 'firstName', 'lastName',
  'sex', 'birthDate', 'birthCity',
  'cityCode', 'departmentCode', 'country',
  'countryCode', 'latitude', 'longitude',
  'deathDate', 'certificateId', 'age',
  'deathCity', 'cityCode', 'departmentCode',
  'country', 'countryCode', 'latitude', 'longitude']
