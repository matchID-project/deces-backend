import multer from 'multer';
import express from 'express';
import Queue from 'bee-queue';
import forge from 'node-forge';
import crypto from 'crypto';
import { loggerStream } from '../logger';
import { Readable, Transform, pipeline, finished } from 'stream';
import fs from 'fs';
import { createGzip, createGunzip } from 'zlib';
import { promisify } from 'util';
import { parse } from '@fast-csv/parse';
import { format } from '@fast-csv/format';
import { Router } from 'express';
import { RequestInput } from '../models/requestInput';
import { buildRequest } from '../buildRequest';
import { runBulkRequest } from '../runRequest';
import { buildResultSingle, ResultRawES } from '../models/result';
import { scoreResults } from '../score';

const encryptioniv = crypto.randomBytes(16);
const salt = crypto.randomBytes(128);

export const router = Router();
const multerSingle = multer().any();

const stopJob: any = [];
const stopJobError = 'job has been stopped';
const inputsArray: JobInput[]= []
const queue = new Queue('example',  {
  redis: {
    host: 'redis'
  }
});

const pipelineAsync:any = promisify(pipeline);
const finishedAsync:any = promisify(finished);

const log = (json:any) => {
  loggerStream.write(JSON.stringify({
    "backend": {
      "server-date": new Date(Date.now()).toISOString(),
      ...json
    }
  }));
}

const validFields: string[] = ['q', 'firstName', 'lastName', 'sex', 'birthDate', 'birthCity', 'birthDepartment', 'birthCountry',
'birthGeoPoint', 'deathDate', 'deathCity', 'deathDepartment', 'deathCountry', 'deathGeoPoint', 'deathAge',
'size', 'fuzzy', 'block'];

const jsonFields: string[] = ['birthGeoPoint','deathGeoPoint','block'];

class ProcessStream<I extends any, O extends any> extends Transform {
  job: any;
  inputHeaders: string[];
  outputHeaders: any;
  mapField: any;
  batch: any[];
  batchSize: number;
  batchNumber: number;
  processedRows: number;
  totalRows: number;
  dateFormat: string;

  constructor(job: any, mapField: any, options: any) {
    // init Transform
    if (!options) options = {}; // ensure object
    options.objectMode = true; // forcing object mode
    super({ objectMode: true, ...(options || {}) });
    this.job = job;
    this.mapField = mapField;
    this.batch = [];
    this.batchNumber = 0;
    this.batchSize = 50;
    this.processedRows = 0;
    this.totalRows = this.job.data.totalRows;
    this.dateFormat = this.job.data.dateFormat;
  }

  _transform(record: any, encoding: string, callback: any) {
    if (stopJob.includes(this.job.id)) {
      this.push(null);
      return;
    }
    if (! this.inputHeaders) {
      this.inputHeaders = Object.keys(record);
      this.outputHeaders = {
        metadata: {
          mapping: this.mapField,
          header: [...Array(this.inputHeaders.length).keys()].map(idx => this.inputHeaders[idx])
        }
      };
    }

    this.batch.push(record);
    if (this.shouldProcessBatch) {
        this.processRecords()
        .then(() => callback())
        .catch(err => callback(err));
        return;
    }
    callback();
}

  _flush(callback: any) {
      if (this.batch.length) {
          this.processRecords()
              .then(() => callback())
              .catch(err => callback(err));
          return;
      }
      callback();
  }

  pushRecords(records: any) {
      if (this.outputHeaders !== undefined) {
        // add header to stream
        this.push(this.outputHeaders);
        this.outputHeaders = undefined;
      }
      this.batchNumber++;
      records.forEach((r: any) => {
        this.processedRows++;
        this.push(r);
      });
      this.job.reportProgress({rows: this.processedRows, percentage: this.processedRows / this.totalRows * 100})
  }

  get shouldProcessBatch() {
      return this.batch.length >= this.batchSize;
  }

  async processRecords() {
      const records = await this.processBatch();
      this.pushRecords(records);
      return records;
  }

  async processBatch() {
      const records = await processChunk(this.batch.map((r: any) => this.toRequest(r)), this.dateFormat);
      this.batch = [];
      return records;
  }


  toRequest(record: any) {
    const request: any = {
      metadata: {
        source: {}
      }
    }
    Object.values(record).forEach((value: string, idx: number) => {
      if (this.mapField[this.inputHeaders[idx]]) {
        request[this.mapField[this.inputHeaders[idx]]] = jsonFields.includes(this.inputHeaders[idx]) ? JSON.parse(value) : value;
      }
      request.metadata.source[this.inputHeaders[idx]] = value;
    });
    request.block = request.block
      ? request.block
      : this.job.data.block
      ? JSON.parse(this.job.data.block)
      : {
        scope: ['name', 'birthDate'],
        minimum_match: 1,
        should: true
      };
    return request;
  }
}

const ToLinesStream = () => {
  let soFar: string;
  return new Transform({
    transform(chunk, encoding, next) {
      const lines = ((soFar != null ? soFar: '') + chunk.toString()).split(/\r?\n/);
      soFar = lines.pop();
      for (const line of lines) { this.push(line); }
      next();
    },
    flush(done) {
      this.push(soFar != null ? soFar:'');
      done();
    }
  });
}

const JsonStringifyStream = () => {
  return new Transform({
    objectMode: true,
    transform(row: any, encoding: string, callback: any) {
        try {
          this.push(JSON.stringify(row) + '\n');
          callback();
        } catch(e) {
          callback(e);
        }
      }
    });
  }

const JsonParseStream = () => {
  return new Transform({
    objectMode: true,
    transform(row: any, encoding: string, callback: any) {
        try {
          // loggerStream.write(`jsonParse ${row}\n`);
          this.push(JSON.parse(row));
          callback();
        } catch(e) {
          callback(e)
        }
    }
  });
}


const pbkdf2 = (key: string) => {
  return crypto.createHash('sha256').update(key).digest('base64').substr(0, 32);
  // WIP : pbkdf2
  // return crypto.pbkdf2Sync(key, salt, 16, 16, 'sha256');
};

export const processCsv =  async (job: any, jobFile: any): Promise<any> => {
  try {
    const inputHeaders: string[] = [];
    let outputHeaders: any;
    const mapField:any = {};
    const md = forge.md.sha256.create();
    md.update(job.data.randomKey);
    const jobId = md.digest().toHex();

    validFields.forEach(key => mapField[job.data[key] || key] = key );

    const csvOptions: any = {
      objectMode: true,
      delimiter: job.data.sep,
      headers: true,
      ignoreEmpty: true,
      encoding: job.data.encoding,
      escape: job.data.escape,
      quote: job.data.quote
    }
    const writeStream: any = fs.createWriteStream(`${jobId}.out.enc`);
    const gzipStream =  createGzip();
    const encryptStream = crypto.createCipheriv('aes-256-cbc', pbkdf2(job.data.randomKey), encryptioniv);
    const jsonStringStream: any = JsonStringifyStream();
    const processStream: any = new ProcessStream(job, mapField, {});
    const csvStream: any = parse(csvOptions);
    const gunzipStream: any = createGunzip();
    const decryptStream: any = crypto.createDecipheriv('aes-256-cbc', pbkdf2(job.data.randomKey), encryptioniv);
    const readStream: any = fs.createReadStream(jobFile.file)
      .pipe(decryptStream)
      .on('error', (e: any) => log({decryptProcessingError: e, jobId}))
      .pipe(gunzipStream)
      .on('error', (e: any) => log({gunzipProcessingError: e, jobId}))
      .pipe(csvStream)
      .on('error', (e: any) => log({csvProcessingError: e, jobId}))
      .pipe(processStream)
      .on('error', (e: any) => log({matchingProcessingError: e, jobId}))
      .pipe(jsonStringStream)
      .on('error', (e: any) => log({stringifyProcessingError: e, jobId}))
      .pipe(gzipStream)
      .on('error', (e: any) => log({gzipProcessingError: e, jobId}))
      .pipe(encryptStream)
      .on('error', (e: any) => log({encryptProcessingError: e, jobId}))
      .pipe(writeStream)
      .on('error', (e: any) => log({writeProcessingError: e, jobId}));
    setTimeout(() => {
        // lazily removes inputfile index as soon as pipline begins
        fs.unlink(jobFile.file, (e: any) => { if (e) log({unlinkInputProcessingError: e, jobId}) });
    }, 1000);
    await finishedAsync(writeStream);
  } catch(e) {
    throw(e);
  }
  if (stopJob === job.id) {
    return stopJobError;
  } else {
    return;
  }
}

const processChunk = async (chunk: any, dateFormat: string) => {
  const bulkRequest = chunk.map((row: any) => { // TODO: type
    const requestInput = new RequestInput(row.q, row.firstName, row.lastName, row.sex, row.birthDate, row.birthCity, row.birthDepartment, row.birthCountry, row.birthGeoPoint, row.deathDate, row.deathCity, row.deathDepartment, row.deathCountry, row.deathGeoPoint, row.deathAge, row.scroll, row.scrollId, row.size, row.page, row.fuzzy, row.sort, row.block, dateFormat);
    return [JSON.stringify({index: "deces"}), JSON.stringify(buildRequest(requestInput))];
  })
  const msearchRequest = bulkRequest.map((x: any) => x.join('\n\r')).join('\n\r') + '\n';
  const result =  await runBulkRequest(msearchRequest);
  if (result.data.responses.length > 0) {
    return result.data.responses.map((item: ResultRawES, idx: number) => {
      if (item.hits.hits.length > 0) {
        const scoredResults = scoreResults(chunk[idx], item.hits.hits.map(hit => buildResultSingle(hit)), dateFormat)
        if (scoredResults && scoredResults.length > 0) {
          return {...chunk[idx], ...scoredResults[0]}
        } else {
          return {...chunk[idx]}
        }
      } else {
        return {...chunk[idx]}
      }
    })
  } else {
    return chunk
  }
}

queue.process(Number(process.env.BACKEND_CONCURRENCY), async (job: Queue.Job) => {
  const jobIndex = inputsArray.findIndex(x => x.id === job.id);
  const jobFile = inputsArray.splice(jobIndex, 1).pop();
  return processCsv(job, jobFile);
})

/**
 * @swagger
 * path:
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
router.post('/csv', multerSingle, async (req: any, res: express.Response) => {
  if (req.files && req.files.length > 0) {
    // Use random number as enctyption key
    const bytes = forge.random.getBytesSync(32);
    const randomKey = forge.util.bytesToHex(bytes);

    // Get parameters
    const options = {...req.body};
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
    options.mapField = {};
    validFields.forEach(key => options.mapField[options[key] || key] = key );

    // Use hash key index
    const md = forge.md.sha256.create();
    md.update(randomKey);
    const gzipStream =  createGzip();
    const encryptStream =  crypto.createCipheriv('aes-256-cbc', pbkdf2(randomKey), encryptioniv);
    const writeStream: any = fs.createWriteStream(`${md.digest().toHex()}.in.enc`)
    const readStream = new Readable().on('data', function(buffer: any) {
      // count lines from buffer without duplicating it
      let idx = -1;
      options.totalRows--; // Because the loop will run once for idx=-1
      do {
        idx = buffer.indexOf(10, idx+1);
        options.totalRows++;
      } while (idx !== -1);
    });
    const pipelineStream = pipelineAsync(readStream, gzipStream, encryptStream, writeStream);
    readStream.push(req.files[0].buffer);
    readStream.push(null);
    await finishedAsync(writeStream);
    inputsArray.push({id: md.digest().toHex(), file: `${md.digest().toHex()}.in.enc`, size: options.totalRows}) // Use key hash as job identifier
    const job = await queue
      .createJob({...options})
      .setId(md.digest().toHex())
      // .reportProgress({rows: 0, percentage: 0}) TODO: add for bee-queue version 1.2.4
      .save()
    job.on('succeeded', (result: any) => {
      if (!stopJob.includes(job.id)) {
        setTimeout(() => {
          fs.unlink(`${job.id}.out.enc`, (err: any) => {if (err) log({unlinkOutputDeleteError: err, id: randomKey});});
        }, 3600000) // Delete results after 1 hour
      }
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
 *   description: Rapprochement par lot
 */

/**
 * @swagger
 * /search/csv/{jobId}:
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
    const jobId = md.digest().toHex();
    const job: Queue.Job|any = await queue.getJob(jobId);
    const jobsActive = await queue.getJobs('active', {start: 0, end: 25})
    if (job && job.status === 'succeeded') {
      try {
        if (stopJob.includes(job.id)) {
          res.send({msg: `Job ${req.params.id} was cancelled`});
          return;
        }
        const size = fs.statSync(`${jobId}.out.enc`).size;
        let sourceHeader: any;
        const decryptStream = crypto.createDecipheriv('aes-256-cbc', pbkdf2(req.params.id), encryptioniv);
        const dataStream = fs.createReadStream(`${jobId}.out.enc`)
          .pipe(decryptStream)
          .on('error', (e: any) => log({decryptGetResultsError: e, jobId}))
          .pipe(createGunzip())
          .on('error', (e: any) => log({gunzipGetResultsError: e, jobId}))
        if (size === 0) {
          res.send({msg: 'Empty results'})
        } else if (req.params.format === 'json') {
          res.setHeader('Content-Type', 'application/json');
          dataStream.pipe(res)
            .on('error', (e: any) => log({httpGetResultsError: e, jobId}));
          await finishedAsync(dataStream);
        } else if (req.params.format === 'csv') {
          res.setHeader('Content-Type', 'text/csv');
          // pipe csvstream write to res
          dataStream
            .pipe(ToLinesStream())
            .on('error', (e: any) => log({toLinesGetResultsError: e, jobId}))
            .pipe(JsonParseStream())
            .on('error', (e: any) => log({jsonParseGetResultsError: e, jobId}))
            .pipe(new Transform({
              objectMode: true,
              transform(row: any, encoding: string, cb: any) {
                if (sourceHeader === undefined) {
                  sourceHeader = row.metadata.header;
                  // write header, bypassing fast-csv methods
                  this.push([...sourceHeader,...resultsHeader.map(h => h.replace(/\.location/, ''))])
                } else {
                  this.push([...sourceHeader.map((key: string) => row.metadata.source[key]),
                    ...resultsHeader.map(key => prettyString(jsonPath(row, key)))]);
                }
                cb();
              }
            }))
            .on('error', (e: any) => log({addHeaderGetResultsError: e, jobId}))
            .pipe(format({
              headers: false,
              writeHeaders: false,
              delimiter: job.data.sep
            }))
            .on('error', (e: any) => log({formatCsvGetResultsError: e, jobId}))
            .pipe(res)
            .on('error', (e: any) => log({httpGetResultsError: e, jobId}));
          await finishedAsync(dataStream);
        } else {
          res.send({msg: 'Not available format'})
        }
      } catch(e) {
        res.send({msg: 'Job succeeded but results expired'})
      }
    } else if (job && job.status === 'failed') {
      res.status(400).send({status: job.status, msg: job.options.stacktraces.join(' ')});
    } else if (job && jobsActive.some((j: any) => j.id === jobId)) {
      res.send({status: 'active', id: req.params.id, progress: job.progress});
    } else if (job) {
      const jobsWaiting = await queue.getJobs('waiting', {start: 0, end: 25})
      const remainingRowsActive = jobsActive.reduce((acc: number, val: any) => {
        return Math.round(acc + ((100.0 - val.progress.percentage) * val.progress.rows) / val.progress.percentage)
      }, 0)
      const jobsWaitingBefore = jobsWaiting.reduce((acc: number, val: any) => {
        if (val.options.timestamp < job.options.timestamp) {
          return acc + 1
        } else {
          return acc
        }
      }, 0)
      const remainingRowsWaiting = jobsWaiting.reduce((acc: number, val: any) => {
        if (val.options.timestamp < job.options.timestamp) {
          const jobIndex = inputsArray.findIndex(x => x.id === val.id)
          return acc + (inputsArray[jobIndex] ? (inputsArray[jobIndex].size || 0) : 0)
        } else {
          return acc
        }
      }, 0)
      res.send({status: 'waiting', id: req.params.id, remainingRowsActive, remainingRowsWaiting, activeJobs: jobsActive.length, waitingJobs: jobsWaitingBefore});
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
    const jobId = md.digest().toHex()
    const job: Queue.Job|any= await queue.getJob(jobId)
    if (job && job.status === 'created') {
      stopJob.push(job.id);
      setTimeout(() => {
        // lazily remove encrypted files
        fs.unlink(`${jobId}.out.enc`, (e) => {
          if (e) {
            log({unlinkOutputDeleteError: e, jobId})
          }
        });
        fs.unlink(`${jobId}.in.enc`, (e) => {
          if (e) {
            log({unlinkInputDeleteError: e, jobId})
          }
        });
      }, 2000);
      res.send({msg: `Job ${req.params.id} cancelled`})
    } else if (job) {
      if (stopJob.includes(job.id)) {
        res.send({msg: `Job ${req.params.id} already cancelled`})
      } else {
        res.send({msg: `job is ${job.status}`})
      }
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

export const prettyString = (json: any): string => {
  if ((json === undefined) || (json === null)) {
    return '';
  }
  if (typeof(json) === 'object') {
    if (Array.isArray(json)) {
      return json.join(', ');
    }
    return JSON.stringify(json);
  } else {
    return json.toString();
  }
}

export const resultsHeader = [
  'score', 'scores', 'source', 'id', 'name.last', 'name.first', 'sex',
  'birth.date', 'birth.location.city', 'birth.location.cityCode',
  'birth.location.departmentCode', 'birth.location.country', 'birth.location.countryCode',
  'birth.location.latitude', 'birth.location.longitude',
  'death.certificateId', 'death.age',
  'death.date', 'death.location.city', 'death.location.cityCode',
  'death.location.departmentCode', 'death.location.country', 'death.location.countryCode',
  'death.location.latitude', 'death.location.longitude']

interface JobInput {
  id: string;
  file: string;
  size: number;
}

interface JobResult {
  id: string;
  result: forge.util.ByteStringBuffer;
}
