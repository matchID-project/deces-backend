import { Request, Response } from 'express';
import { Readable, Transform, pipeline, finished } from 'stream';
import fs from 'fs';
import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { RequestInput } from './models/requestInput';
import { buildRequest } from './buildRequest';
import { runBulkRequest } from './runRequest';
import { sendJobUpdate } from './mail';
import { buildResultSingle, ResultRawES } from './models/result';
import { scoreResults } from './score';
import { ScoreParams } from './models/entities'
import { createGzip, createGunzip } from 'node:zlib';
import loggerStream from './logger';
import crypto from 'crypto';
import { promisify } from 'util';
import { parse } from '@fast-csv/parse';
import { format } from '@fast-csv/format';
import iconv from 'iconv-lite';

import timer from './timer';

const timerRunBulkRequest = timer(runBulkRequest, 'runBulkRequest', 1);

export const validFields: string[] = ['q', 'firstName', 'lastName', 'legalName', 'sex', 'birthDate', 'birthCity', 'birthLocationCode', 'birthPostalCode', 'birthDepartment', 'birthCountry',
'birthGeoPoint', 'deathDate', 'deathCity', 'deathLocationCode', 'deathPostalCode', 'deathDepartment', 'deathCountry', 'deathGeoPoint', 'deathAge', 'lastSeenAliveDate', 'source',
'size', 'fuzzy', 'block'];
const validFieldsForColumnsCount = ['firstName', 'lastName', 'legalName', 'sex', 'birthDate', 'birthCity', 'birthLocationCode', 'birthPostalCode', 'birthDepartment', 'birthCountry',
'birthGeoPoint', 'deathDate', 'deathCity', 'deathLocationCode', 'deathPostalCode', 'deathDepartment', 'deathCountry', 'deathGeoPoint', 'deathAge', 'lastSeenAliveDate']

const log = (json:any) => {
  loggerStream.write(JSON.stringify({
    "backend": {
      "server-date": new Date(Date.now()).toISOString(),
      ...json
    }
  }));
}

const formatJob = (job:any) => {
  const duration: number = job && job.processedOn && job.finishedOn && (job.finishedOn - job.processedOn) / 1000;
  return job && {
    id: job.id,
    rows: job.data && job.data.totalRows,
    columns: validFieldsForColumnsCount.filter(c => job.data && job.data[c]).length,
    waiting_time: job && job.processedOn && (job.processedOn - job.timestamp) / 1000,
    processing_rate : duration ? Math.floor((job.data && job.data.totalRows || 0) / duration) : undefined,
    processing_time: duration,
  }
}

const encryptioniv = crypto.randomBytes(16);

const finishedAsync:any = promisify(finished);
const pipelineAsync:any = promisify(pipeline);

const stopJob: string[] = [];
const stopJobReason: StopJobReason[] = [];
const stopJobError = 'job has been stopped';
const inputsArray: JobInput[]= []
const jobQueue = new Queue('jobs',  {
  connection: {
    host: 'redis'
  }
});

const chunkEvents = new QueueEvents('chunks', {
  connection: {
    host: 'redis'
  }
});

const chunkQueue = new Queue('chunks',  {
  connection: {
    host: 'redis'
  },
  defaultJobOptions: {
    removeOnFail: true
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
    transform(row: any, encoding: string, callback: (e?: any) => void) {
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
    transform(row: any, encoding: string, callback: (e?: any) => void) {
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
  return crypto.createHash('sha256').update(key).digest('base64').substring(0, 32);
  // WIP : pbkdf2
  // return crypto.pbkdf2Sync(key, salt, 16, 16, 'sha256');
};

interface MapField {
  [Key: string]: string;
}

export const processCsv =  async (job: Job<any>, jobFile: JobInput): Promise<any> => {
  // const inputHeaders: string[] = [];
  // let outputHeaders: any;
  const mapField:MapField = {};
  const jobId = crypto.createHash('sha256').update(job.data.randomKey).digest('hex');

  validFields.forEach(key => mapField[job.data[key] || key] = key );

  const csvOptions: any = {
    objectMode: true,
    delimiter: job.data.sep,
    headers: true,
    ignoreEmpty: true,
    encoding: 'utf8',
    escape: job.data.escape,
    quote: job.data.quote,
    skipLines: job.data.skipLines
  };
  const writeStream: any = fs.createWriteStream(`${process.env.JOBS}/${jobId}.out.enc`);
  const gzipStream =  createGzip();
  const encryptStream = crypto.createCipheriv('aes-256-cbc', pbkdf2(job.data.randomKey), encryptioniv);
  const jsonStringStream: any = JsonStringifyStream();
  const converterStream = iconv.decodeStream(job.data.encoding.replace('windows-','win'));
  const processStream: any = new ProcessStream(job, mapField, {});
  const csvStream: any = parse(csvOptions);
  const gunzipStream: any = createGunzip();
  const decryptStream: any = crypto.createDecipheriv('aes-256-cbc', pbkdf2(job.data.randomKey), encryptioniv);
  const readStream: any = fs.createReadStream(jobFile.file)
    .pipe(decryptStream)
    .on('error', (e: any) => log({decryptProcessingError: e.toString(), jobId}))
    .pipe(gunzipStream)
    .on('error', (e: any) => log({gunzipProcessingError: e.toString(), jobId}))
    .pipe(converterStream)
    .on('error', (e: any) => log({decodingProcessingError: e.toString(), jobId}))
    .pipe(csvStream)
    .on('error', (e: any) => {
      log({csvProcessingError: e.toString(), jobId})
      readStream.close()
      stopJob.push(job.id);
      stopJobReason.push({id: job.id, msg: e.toString()})
    })
    .pipe(processStream)
    .on('error', (e: any) => {
      log({matchingProcessingError: e.toString(), jobId})
      readStream.close()
      stopJob.push(job.id);
      stopJobReason.push({id: job.id, msg: e.toString()})
    })
    .pipe(jsonStringStream)
    .on('error', (e: any) => log({stringifyProcessingError: e.toString(), jobId}))
    .pipe(gzipStream)
    .on('error', (e: any) => log({gzipProcessingError: e.toString(), jobId}))
    .pipe(encryptStream)
    .on('error', (e: any) => log({encryptProcessingError: e.toString(), jobId}))
    .pipe(writeStream)
    .on('error', (e: any) => log({writeProcessingError: e.toString(), jobId}));
  setTimeout(() => {
    // lazily removes inputfile index as soon as pipeline begins
    fs.unlink(jobFile.file, (e: any) => { if (e) log({unlinkInputProcessingError: e, jobId}) });
  }, 1000);
  await finishedAsync(writeStream);
  if (stopJob.includes(job.id)) {
    return stopJobError;
  }  else {
    return;
  }
}

export const processChunk = async (chunk: any[], candidateNumber: number, params: ScoreParams): Promise<any[]> => {
  const bulkRequest = chunk.map((row: any) => { // TODO: type
    const requestInput = new RequestInput({...row, dateFormat: params.dateFormatA});
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

new Worker('chunks', async (chunkJob: Job) => {
  return await processChunk(chunkJob.data.chunk, chunkJob.data.candidateNumber, {dateFormatA: chunkJob.data.dateFormatA, pruneScore: chunkJob.data.pruneScore, candidateNumber: chunkJob.data.candidateNumber});
}, {
  connection: {
    host: 'redis'
  },
  concurrency: Number(process.env.BACKEND_CHUNK_CONCURRENCY)
})

const workerJobs = new Worker('jobs', async (job: Job) => {
  const jobIndex = inputsArray.findIndex(x => x.id === job.id);
  const jobFile = inputsArray.splice(jobIndex, 1).pop();
  return await processCsv(job, jobFile);
}, {
  connection: {
    host: 'redis'
  },
  concurrency: Number(process.env.BACKEND_JOB_CONCURRENCY)
})


const jsonFields: string[] = ['birthGeoPoint','deathGeoPoint','block'];

interface Record {
  [Key: string]: any
}

export class ProcessStream extends Transform {
  job: Job;
  inputHeaders: string[];
  outputHeaders: any;
  mapField: MapField;
  batch: any[];
  batchSize: number;
  batchNumber: number;
  processedRows: number;
  sourceLineNumber: number;
  jobs: any[];
  totalRows: number;
  dateFormatA: string;
  candidateNumber: number;
  pruneScore: number;

  constructor(job: Job<any>, mapField: MapField, options: any = {}) {
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
    this.dateFormatA = this.job.data.dateFormatA;
    this.pruneScore = this.job.data.pruneScore;
    this.candidateNumber = this.job.data.candidateNumber;
    this.jobs = [];
  }

  _transform(record: Record, encoding: string, callback: (e?: any) => void): void {
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

  _flush(callback: (e?: any) => void): void {
      if (this.batch.length) {
          this.processRecords(this.batchNumber)
              .then(() => callback())
              .catch(err => callback(err));
          return;
      }
      callback();
  }

  pushRecords(records: Record[]): void {
    if (this.outputHeaders !== undefined) {
      // add header to stream
      this.push(this.outputHeaders);
      this.outputHeaders = undefined;
    }
    (records as any).flat(1).forEach((r: any) => {
      this.processedRows = r && r.metadata && r.metadata.sourceLineNumber || this.processedRows;
      this.push(r);
    });
    this.job.updateProgress({rows: this.processedRows, percentage: this.processedRows / this.totalRows * 100})
  }

  get shouldProcessBatch(): boolean {
      return this.batch.length >= this.batchSize;
  }

  async processRecords(batchNumber: number): Promise<void> {
    await this.processBatch();
    await this.flushRecords(batchNumber);
  }

  async flushRecords(batchNumber: number): Promise<void> {
    while((this.jobs.length > 0) && (Number(this.jobs[0].id.split("-")[1]) <= batchNumber)) {
      const job = this.jobs.shift();
      const records = await job.result;
      this.pushRecords(records);
    }
  }

  async processBatch(): Promise<void> {
    const jobId = `${this.job.id}-${this.batchNumber++}`;
    const job = await chunkQueue
      .add(jobId, {
        chunk: this.batch.map((r: any) => this.toRequest(r)),
        dateFormatA: this.dateFormatA,
        pruneScore: this.pruneScore,
        candidateNumber: this.candidateNumber
      }, {
        attempts: 2,
        jobId
      })
    await job.waitUntilFinished(chunkEvents)
    const jobResult = await Job.fromId(chunkQueue, job.id)
    this.jobs.push({id: jobId, result: jobResult.returnvalue})
    await job.remove();
    this.batch = [];
  }

  toRequest(record: Record): any {
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
        'minimum_match': 1,
        should: true
      };
    return request;
  }
}

interface Options {
  [Key: string]: any;
}

workerJobs.on('completed', async (job: Job) => {
    await sendJobUpdate(job.data.user, "L'appariement est terminé", job.data.randomKey);
    if (!stopJob.includes(job.id)) {
      setTimeout(async () => {
        fs.unlink(`${process.env.JOBS}/${job.id}.out.enc`, (err: Error) => {if (err) log({unlinkOutputDeleteError: err});});
        await sendJobUpdate(job.data.user, "Le fichier a été supprimé", job.data.randomKey);
      }, Number(job.data.tmpfilePersistence || "28800000")) // Delete results after 8 hour
    }
});

export const csvHandle = async (request: Request, options: Options): Promise<any> => {
  // Use hash key index
  const jobId = crypto.createHash('sha256').update(options.randomKey).digest('hex');
  const gzipStream =  createGzip();
  const encryptStream =  crypto.createCipheriv('aes-256-cbc', pbkdf2(options.randomKey), encryptioniv);
  const writeStream: any = fs.createWriteStream(`${process.env.JOBS}/${jobId}.in.enc`)
  const jobsActive = await jobQueue.getJobs(['active', 'prioritized', 'wait'], 0, 100, true);
  const jobsUser = jobsActive.filter((job: any) => job.data.user === options.user);
  if ((jobsUser && jobsUser.length === 0) || (options.user === process.env.BACKEND_TOKEN_USER)) {
    const readStream = new Readable().on('data', (buffer: any) => {
      // count lines from buffer without duplicating it
      let idx = -1;
      options.totalRows--; // Because the loop will run once for idx=-1
      do {
        const idxR = buffer.indexOf("\r", idx+1);
        const idxN = buffer.indexOf("\n", idx+1);
        options.totalRows++;
        if (idxR !== -1 && idxN !== -1) {
          idx = idxR < idxN ? idxR : idxN
        } else if (idxR !== -1) {
          idx = idxR
        } else if (idxN !== -1) {
          idx = idxN
        } else {
          idx = -1
        }
      } while (idx !== -1);
    });
    pipelineAsync(readStream, gzipStream, encryptStream, writeStream);
    readStream.push((request.files as any)[0].buffer);
    readStream.push(null);
    await finishedAsync(writeStream);
    inputsArray.push({
      id: jobId,
      file: `${process.env.JOBS}/${jobId}.in.enc`,
      size: options.totalRows,
      priority: Math.round(options.totalRows/1000)+1
    }) // Use key hash as job identifier
    await jobQueue.add(jobId,
      {...options},
      {jobId, priority: Math.round(options.totalRows/1000)+1}
    )
    await sendJobUpdate(options.user, "L'appariement a bien commencé", options.randomKey);
    return {msg: 'started', id: options.randomKey};
  } else {
    request.res.status(429).send({msg: `There is already ${jobsUser.length} running or waiting jobs`});
    return;
  }
}

export const returnBulkResults = async (response: Response, id: string, outputFormat: string, order: string): Promise<void> => {
  const jobId = crypto.createHash('sha256').update(id).digest('hex');
  const job: any = await jobQueue.getJob(jobId);
  const jobsActive = await jobQueue.getJobs(['active'], 0, 100, true);
  const jobStatus = await job.getState();
  if (job && jobStatus === 'completed') {
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
      const size = fs.statSync(`${process.env.JOBS}/${jobId}.out.enc`).size;
      let sourceHeader: any;
      let mapping: any;
      const decryptStream = crypto.createDecipheriv('aes-256-cbc', pbkdf2(id), encryptioniv);
      const dataStream = fs.createReadStream(`${process.env.JOBS}/${jobId}.out.enc`)
        .pipe(decryptStream)
        .on('error', (e: any) => log({decryptGetResultsError: e, jobId}))
        .pipe(createGunzip())
        .on('error', (e: any) => log({gunzipGetResultsError: e, jobId}))
      if (size === 0) {
        // return {msg: 'Empty results'}
        response.send({msg: 'Empty results'})
      } else if (outputFormat === 'json') {
        response.setHeader('Content-Type', 'application/json');
        response.setHeader('Job', JSON.stringify(formatJob(job)));
        dataStream
          .pipe(ToLinesStream())
          .on('error', (e: any) => log({toLinesStream: e.toString(), jobId}))
          .pipe(ToJsonStream())
          .on('error', (e: any) => log({toJsonStream: e.toString(), jobId}))
          .pipe(response)
        await finishedAsync(dataStream);
      } else if (outputFormat === 'csv') {
        response.setHeader('Content-Type', 'text/csv');
        response.setHeader('Job', JSON.stringify(formatJob(job)));
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
        response.send({msg: 'Not available format'})
      }
    } catch(e) {
      response.send({msg: 'Job succeeded but results expired'})
    }
  } else if (job && jobStatus === 'failed') {
    response.status(400).send({status: jobStatus, msg: job.stacktrace.join(' ')});
    return
  } else if (job && jobStatus === 'active') {
    response.send({status: 'active', id, progress: job.progress});
  } else if (job && ['wait', 'prioritized'].includes(jobStatus)) {
    const jobsWaiting = await jobQueue.getJobs(['wait', 'prioritized'], 0, 100, true);
    const remainingRowsActive = jobsActive.map((val: any) => {
      const remainingRows = ((100.0 - val.progress.percentage) * val.progress.rows) / val.progress.percentage
      return {priority: val.opts.priority, progress: val.progress.percentage, remainingRows, rows: val.progress.rows}
    })
    const jobsWaitingBefore = jobsWaiting.reduce((acc: number, val: any) => {
      if (val.timestamp < job.timestamp) {
        return acc + 1
      } else {
        return acc
      }
    }, 0)
    const remainingRowsWaiting = jobsWaiting.reduce((acc: number, val: any) => {
      if (val.timestamp < job.timestamp) {
        const jobIndex = inputsArray.findIndex(x => x.id === val.id)
        return acc + (inputsArray[jobIndex] ? (inputsArray[jobIndex].size || 0) : 0)
      } else {
        return acc
      }
    }, 0)
    response.send({status: 'wait', id, remainingRowsActive, remainingRowsWaiting, activeJobs: jobsActive.length, waitingJobs: jobsWaitingBefore, priority: job.opts.priority});
  } else {
    response.send({msg: 'job doesn\'t exists'});
  }
}

export const deleteThreadJob = async (response: Response, id: string): Promise<void> => {
  const jobId = crypto.createHash('sha256').update(id).digest('hex');
  let job: any= await jobQueue.getJob(jobId)
  if (!job) {
    job = await jobQueue.getJob(id)
  }
  const jobStatus = await job.getState();
  if (job && jobStatus === 'active') {
    stopJob.push(job.id);
    setTimeout(() => {
      job.remove()
      // lazily remove encrypted files
      fs.unlink(`${process.env.JOBS}/${jobId}.out.enc`, (e) => {
        if (e) {
          log({unlinkOutputDeleteError: e, jobId})
        }
      });
      fs.unlink(`${process.env.JOBS}/${jobId}.in.enc`, (e) => {
        if (e) {
          log({unlinkInputDeleteError: e, jobId})
        }
      });
    }, 2000);
    response.send({msg: `Job ${id} cancelled`})
  } else if (job) {
    if (stopJob.includes(job.id)) {
      response.send({msg: `Job ${id} already cancelled`})
    } else {
      response.send({msg: `job is ${jobStatus as string}`})
    }
  } else {
    response.send({msg: 'no job found'})
  }
}

interface JobInput {
  id: string;
  file: string;
  size: number;
  priority: number
}

interface StopJobReason {
  id: string;
  msg: string;
}

interface Json {
  [Key: string]: any;
}

export const jsonPath = (json: Json, path: string): any => {
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

export const prettyString = (json: Json|Json[]|number|string): string => {
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
  {label: 'birth.location.codePostal', labelFr: 'code_postal_naissance', id: 'birthPostalCode'},
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
  {label: 'death.location.codePostal', labelFr: 'code_postal_décès', id: 'deathPostalCode'},
  {label: 'death.location.departmentCode', id: 'deathDepartment', labelFr: 'département_décès'},
  {label: 'death.location.country', labelFr: 'pays_décès', id: 'deathCountry'},
  {label: 'death.location.countryCode', labelFr: 'pays_ISO_décès'},
  {label: 'death.location.latitude', labelFr: 'latitude_décès'},
  {label: 'death.location.longitude', labelFr: 'longitude_décès'}
]

