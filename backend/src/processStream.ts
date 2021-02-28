import { Readable, Transform, pipeline, finished } from 'stream';
import fs from 'fs';
import forge from 'node-forge';
import Queue from 'bee-queue';
import { RequestInput } from './models/requestInput';
import { buildRequest } from './buildRequest';
import { runBulkRequest } from './runRequest';
import { buildResultSingle, ResultRawES } from './models/result';
import { scoreResults } from './score';
import { ScoreParams } from './models/entities'
import { createGzip, createGunzip } from 'zlib';
import loggerStream from './logger';
import crypto from 'crypto';
import { promisify } from 'util';
import { parse } from '@fast-csv/parse';
import { format } from '@fast-csv/format';

import timer from './timer';

const timerRunBulkRequest = timer(runBulkRequest, 'runBulkRequest', 1);

export const validFields: string[] = ['q', 'firstName', 'lastName', 'legalName', 'sex', 'birthDate', 'birthCity', 'birthLocationCode', 'birthDepartment', 'birthCountry',
'birthGeoPoint', 'deathDate', 'deathCity', 'deathLocationCode', 'deathDepartment', 'deathCountry', 'deathGeoPoint', 'deathAge', 'lastSeenAliveDate', 'source',
'size', 'fuzzy', 'block'];

const log = (json:any) => {
  loggerStream.write(JSON.stringify({
    "backend": {
      "server-date": new Date(Date.now()).toISOString(),
      ...json
    }
  }));
}


const encryptioniv = crypto.randomBytes(16);

const finishedAsync:any = promisify(finished);
const pipelineAsync:any = promisify(pipeline);

const stopJob: string[] = [];
const stopJobReason: StopJobReason[] = [];
const stopJobError = 'job has been stopped';
const inputsArray: JobInput[]= []
const jobQueue = new Queue('jobs',  {
  redis: {
    host: 'redis'
  }
});

const chunkQueue = new Queue('chunks',  {
  redis: {
    host: 'redis'
  }
});


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

const ToJsonStream = () => {
  let soFar: string;
  let sourceHeader: boolean;
  return new Transform({
    objectMode: true,
    transform(row: any, encoding: string, cb: any) {
      if (sourceHeader === undefined) {
        sourceHeader = true;
        this.push('[' + row)
      } else {
        this.push(',' + row);
      }
      cb();
    },
    flush(done: any) {
      this.push(soFar != null ? soFar:']');
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

export const processCsv =  async (job: Queue.Job<any>, jobFile: any): Promise<any> => {
  try {
    // const inputHeaders: string[] = [];
    // let outputHeaders: any;
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
      quote: job.data.quote,
      skipLines: job.data.skipLines
    };
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
      .on('error', (e: any) => log({decryptProcessingError: e.toString(), jobId}))
      .pipe(gunzipStream)
      .on('error', (e: any) => log({gunzipProcessingError: e.toString(), jobId}))
      .pipe(csvStream)
      .on('error', (e: any) => {
        log({csvProcessingError: e.toString(), jobId})
        readStream.close()
        stopJob.push(job.id);
        stopJobReason.push({id: job.id, msg: e.toString()})
      })
      .pipe(processStream)
      .on('error', (e: any) => log({matchingProcessingError: e.toString(), jobId}))
      .pipe(jsonStringStream)
      .on('error', (e: any) => log({stringifyProcessingError: e.toString(), jobId}))
      .pipe(gzipStream)
      .on('error', (e: any) => log({gzipProcessingError: e.toString(), jobId}))
      .pipe(encryptStream)
      .on('error', (e: any) => log({encryptProcessingError: e.toString(), jobId}))
      .pipe(writeStream)
      .on('error', (e: any) => log({writeProcessingError: e.toString(), jobId}));
    setTimeout(() => {
        // lazily removes inputfile index as soon as pipline begins
        fs.unlink(jobFile.file, (e: any) => { if (e) log({unlinkInputProcessingError: e, jobId}) });
    }, 1000);
    await finishedAsync(writeStream);
  } catch(e) {
    throw(e);
  }
  if (stopJob.includes(job.id)) {
    return stopJobError;
  }  else {
    return;
  }
}

export const processChunk = async (chunk: any, candidateNumber: number, params: ScoreParams) => {
  const bulkRequest = chunk.map((row: any) => { // TODO: type
    const requestInput = new RequestInput({...row, dateFormat: params.dateFormat});
    return [JSON.stringify({index: "deces"}), JSON.stringify(buildRequest(requestInput))];
  })
  const msearchRequest = bulkRequest.map((x: any) => x.join('\n\r')).join('\n\r') + '\n';
  const result =  await timerRunBulkRequest(msearchRequest);
  if (result.data.responses.length > 0) {
    return result.data.responses.map((item: ResultRawES, idx: number) => {
      if (item.hits.hits.length > 0) {
        const scoredResults = scoreResults(chunk[idx], item.hits.hits.map(buildResultSingle), {...params})
        if (scoredResults && scoredResults.length > 0) {
          const selectedCanditates = scoredResults.slice(0, candidateNumber)
          return selectedCanditates.map((selectedCanditate: any) => {
            return {...chunk[idx], ...selectedCanditate}
          })
        } else {
          return [{...chunk[idx]}]
        }
      } else {
        return [{...chunk[idx]}]
      }
    })
  } else {
    return chunk
  }
}

chunkQueue.process(Number(process.env.BACKEND_CHUNK_CONCURRENCY), async (chunkJob: Queue.Job<any>) => {
  return await processChunk(chunkJob.data.chunk, chunkJob.data.candidateNumber, {dateFormat: chunkJob.data.dateFormat, pruneScore: chunkJob.data.pruneScore, candidateNumber: chunkJob.data.candidateNumber});
})

jobQueue.process(Number(process.env.BACKEND_JOB_CONCURRENCY), (job: Queue.Job<any>) => {
  const jobIndex = inputsArray.findIndex(x => x.id === job.id);
  const jobFile = inputsArray.splice(jobIndex, 1).pop();
  return processCsv(job, jobFile);
})


const jsonFields: string[] = ['birthGeoPoint','deathGeoPoint','block'];


export class ProcessStream<I extends any, O extends any> extends Transform {
  job: any;
  inputHeaders: string[];
  outputHeaders: any;
  mapField: any;
  batch: any[];
  batchSize: number;
  batchNumber: number;
  processedRows: number;
  sourceLineNumber: number;
  jobs: any[];
  totalRows: number;
  dateFormat: string;
  candidateNumber: number;
  pruneScore: number;

  constructor(job: any, mapField: any, options: any = {}) {
    // init Transform
    options.objectMode = true; // forcing object mode
    super({ objectMode: true, ...(options || {}) });
    this.job = job;
    this.mapField = mapField;
    this.batch = [];
    this.batchNumber = 0;
    this.batchSize = 50;
    this.processedRows = 0;
    this.sourceLineNumber = 1;
    this.totalRows = this.job.data.totalRows;
    this.dateFormat = this.job.data.dateFormat;
    this.pruneScore = this.job.data.pruneScore;
    this.candidateNumber = this.job.data.candidateNumber;
    this.jobs = [];
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

    this.batch.push({source: record, sourceLineNumber: this.sourceLineNumber++});
    if (this.shouldProcessBatch) {
      this.processRecords(this.batchNumber - Number(process.env.BACKEND_CHUNK_CONCURRENCY))
        .then(() => callback())
        .catch(err => callback(err));
      return;
    }
    callback();
  }

  _flush(callback: any) {
      if (this.batch.length) {
          this.processRecords(this.batchNumber)
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
    records.flat(1).forEach((r: any) => {
      this.processedRows = r && r.metadata && r.metadata.sourceLineNumber || this.processedRows;
      this.push(r);
    });
    this.job.reportProgress({rows: this.processedRows, percentage: this.processedRows / this.totalRows * 100})
  }

  get shouldProcessBatch() {
      return this.batch.length >= this.batchSize;
  }

  async processRecords(batchNumber: number) {
    await this.processBatch();
    await this.flushRecords(batchNumber);
  }

  async flushRecords(batchNumber: number) {
    while((this.jobs.length > 0) && (Number(this.jobs[0].id) <= batchNumber)) {
      const job = this.jobs.shift();
      const records = await job.result;
      this.pushRecords(records);
    }
  }

  async processBatch() {
    const jobId = `${this.batchNumber++}`;
    const job = await chunkQueue
      .createJob({
        chunk: this.batch.map((r: any) => this.toRequest(r)),
        dateFormat: this.dateFormat,
        pruneScore: this.pruneScore,
        candidateNumber: this.candidateNumber
      })
      .timeout(30000)
      .retries(2)
      .save();
    const jobResult = new Promise((resolve, reject) => {
      job.on('succeeded', (result: any) => { resolve(result) });
    });
    this.jobs.push({id: jobId, result: jobResult})
    this.batch = [];
  }

  toRequest(record: any) {
    const request: any = {
      metadata: {
        source: {},
        sourceLineNumber: record.sourceLineNumber
      }
    }
    Object.values(record.source).forEach((value: string, idx: number) => {
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

export const csvHandle = async (request: any, options: any) => {
  // Use hash key index
  const md = forge.md.sha256.create();
  md.update(options.randomKey);
  const gzipStream =  createGzip();
  const encryptStream =  crypto.createCipheriv('aes-256-cbc', pbkdf2(options.randomKey), encryptioniv);
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
  readStream.push(request.files[0].buffer);
  readStream.push(null);
  await finishedAsync(writeStream);
  inputsArray.push({id: md.digest().toHex(), file: `${md.digest().toHex()}.in.enc`, size: options.totalRows}) // Use key hash as job identifier
  const job = await jobQueue
    .createJob({...options})
    .setId(md.digest().toHex())
    .save()
  job.on('succeeded', (result: any) => {
    if (!stopJob.includes(job.id)) {
      setTimeout(() => {
        fs.unlink(`${job.id}.out.enc`, (err: any) => {if (err) log({unlinkOutputDeleteError: err, id: options.randomKey});});
      }, 3600000) // Delete results after 1 hour
    }
  });
  // res.send({msg: 'started', id: randomKey});
  return {msg: 'started', id: options.randomKey};
}

export const returnBulkResults = async (response: any, id: string, outputFormat: string, order: string) => {
  const md = forge.md.sha256.create();
  md.update(id);
  const jobId = md.digest().toHex();
  const job: Queue.Job<any>|any = await jobQueue.getJob(jobId);
  const jobsActive = await jobQueue.getJobs('active', {start: 0, end: 25})
  if (job && job.status === 'succeeded') {
    try {
      if (stopJob.includes(job.id)) {
        if (stopJobReason.map(reason => reason.id).includes(job.id)) {
          response.status(400).send({msg: stopJobReason.find(reason => reason.id === job.id).msg});
          return
          // return {msg: stopJobReason.find(reason => reason.id === job.id).msg}
        } else {
          response.status(400).send({msg: `Job ${id} was cancelled`});
          return
          // return {msg: `Job ${id} was cancelled`};
        }
      }
      const size = fs.statSync(`${jobId}.out.enc`).size;
      let sourceHeader: any;
      let mapping: any;
      const decryptStream = crypto.createDecipheriv('aes-256-cbc', pbkdf2(id), encryptioniv);
      const dataStream = fs.createReadStream(`${jobId}.out.enc`)
        .pipe(decryptStream)
        .on('error', (e: any) => log({decryptGetResultsError: e, jobId}))
        .pipe(createGunzip())
        .on('error', (e: any) => log({gunzipGetResultsError: e, jobId}))
      if (size === 0) {
        // return {msg: 'Empty results'}
        response.send({msg: 'Empty results'})
      } else if (outputFormat === 'json') {
        response.setHeader('Content-Type', 'application/json');
        dataStream
          .pipe(ToLinesStream())
          .on('error', (e: any) => log({toLinesStream: e.toString(), jobId}))
          .pipe(ToJsonStream())
          .on('error', (e: any) => log({toJsonStream: e.toString(), jobId}))
          .pipe(response)
        await finishedAsync(dataStream);
      } else if (outputFormat === 'csv') {
        response.setHeader('Content-Type', 'text/csv');
        // pipe csvstream write to res
        dataStream
          .pipe(ToLinesStream())
          .on('error', (e: any) => log({toLinesGetResultsError: e, jobId}))
          .pipe(JsonParseStream())
          .on('error', (e: any) => log({jsonParseGetResultsError: e.toString(), jobId}))
          .pipe(new Transform({
            objectMode: true,
            transform(row: any, encoding: string, cb: any) {
              if (sourceHeader === undefined) {
                sourceHeader = row.metadata.header;
                // write header, bypassing fast-csv methods
                const mapped = [...sourceHeader, 'sourceLineNumber', ...resultsHeader.map(h => h.label.replace(/\.location/, ''))]
                if (order) {
                  mapping = resultsHeader.map((el, start) => {
                    if (el.id && row.metadata.header.some((x:any) => (row.metadata.mapping[x] && row.metadata.mapping[x] === el.id))) {
                      return { start, end: row.metadata.header.findIndex((x:any) => (row.metadata.mapping[x] && row.metadata.mapping[x] === el.id)) }
                    }
                  }).filter((x:any) => x)
                  mapping.forEach((item: any, initial: number) => {
                    mapped.splice(item.end + initial - (initial%2), 0, mapped[sourceHeader.length + item.start + 1])
                    mapped.splice(sourceHeader.length + item.start + 2, 1)
                  })
                }
                this.push(mapped)
              } else {
                if (!row.score) row.sex = '';
                const mapped = [...sourceHeader.map((key: string) => row.metadata.source[key]),
                  row.metadata.sourceLineNumber,
                  ...resultsHeader.map(key => prettyString(jsonPath(row, key.label)))];
                if (order) {
                  mapping.forEach((item: any, initial: number) => {
                    mapped.splice(item.end + initial - (initial%2), 0, mapped[sourceHeader.length + item.start + 1])
                    mapped.splice(sourceHeader.length + item.start + 2, 1)
                  })
                }
                this.push(mapped);
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
          .pipe(response)
          .on('error', (e: any) => log({httpGetResultsError: e, jobId}));
        await finishedAsync(dataStream);
      } else {
        // return {msg: 'Not available format'}
        response.send({msg: 'Not available format'})
      }
    } catch(e) {
      // return {msg: 'Job succeeded but results expired'}
      response.send({msg: 'Job succeeded but results expired'})
    }
  } else if (job && job.status === 'failed') {
    response.status(400).send({status: job.status, msg: job.options.stacktraces.join(' ')});
    // self.setStatus(400)
    // return {status: job.status, msg: job.options.stacktraces.join(' ')};
  } else if (job && jobsActive.some((j: any) => j.id === jobId)) {
    // return {status: 'active', id, progress: job.progress};
    response.send({status: 'active', id, progress: job.progress});
  } else if (job) {
    const jobsWaiting = await jobQueue.getJobs('waiting', {start: 0, end: 25})
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
    // return {status: 'waiting', id, remainingRowsActive, remainingRowsWaiting, activeJobs: jobsActive.length, waitingJobs: jobsWaitingBefore};
    response.send({status: 'waiting', id, remainingRowsActive, remainingRowsWaiting, activeJobs: jobsActive.length, waitingJobs: jobsWaitingBefore});
  } else {
    response.send({msg: 'job doesn\'t exists'});
  }
}

export const deleteThreadJob = async (response: any, id: string) => {
  const md = forge.md.sha256.create();
  md.update(id);
  const jobId = md.digest().toHex()
  const job: Queue.Job<any>|any= await jobQueue.getJob(jobId)
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
    response.send({msg: `Job ${id } cancelled`})
  } else if (job) {
    if (stopJob.includes(job.id)) {
      response.send({msg: `Job ${id } already cancelled`})
    } else {
      response.send({msg: `job is ${job.status as string}`})
    }
  } else {
    response.send({msg: 'no job found'})
  }
}

interface JobInput {
  id: string;
  file: string;
  size: number;
}

interface StopJobReason {
  id: string;
  msg: string;
}

export const jsonPath = (json: any, path: string): any => {
  if (!json || !path) { return undefined }
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
  {label: 'score', labelFr: 'score'},
  {label: 'scores', labelFr: 'scores'},
  {label: 'source', labelFr: 'source_INSEE'},
  {label: 'id', labelFr: 'id'},
  {label: 'name.last', labelFr: 'nom', id: 'lastName'},
  {label: 'name.first', labelFr: 'prénoms', id: 'firstName'},
  {label: 'sex', labelFr: 'sexe', id: 'sex'},
  {label: 'birth.date', labelFr: 'date_naissance', id: 'birthDate'},
  {label: 'birth.location.city', labelFr: 'commune_naissance', id: 'birthCity'},
  {label: 'birth.location.code', labelFr: 'code_INSEE_naissance', id: 'birthLocationCode'},
  {label: 'birth.location.departmentCode', labelFr: 'département_naissance', id: 'birthDepartment'},
  {label: 'birth.location.country', labelFr: 'pays_naissance', id: 'birthCountry'},
  {label: 'birth.location.countryCode', labelFr: 'pays_ISO_naissance'},
  {label: 'birth.location.latitude', labelFr: 'latitude_naissance'},
  {label: 'birth.location.longitude', labelFr: 'longitude_naissance'},
  {label: 'death.certificateId', labelFr: 'id_certificat'},
  {label: 'death.age', id: 'deathAge', labelFr: 'age_décès'},
  {label: 'death.date', id: 'deathDate', labelFr: 'date_décès'},
  {label: 'death.location.city', id: 'deathCity', labelFr: 'commune_décès'},
  {label: 'death.location.code', labelFr: 'code_INSEE_décès', id: 'deathLocationCode'},
  {label: 'death.location.departmentCode', id: 'deathDepartment', labelFr: 'département_décès'},
  {label: 'death.location.country', labelFr: 'pays_décès', id: 'deathCountry'},
  {label: 'death.location.countryCode', labelFr: 'pays_ISO_décès'},
  {label: 'death.location.latitude', labelFr: 'latitude_décès'},
  {label: 'death.location.longitude', labelFr: 'longitude_décès'}
]

