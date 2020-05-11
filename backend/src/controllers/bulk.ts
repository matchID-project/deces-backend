import multer from 'multer';
import express from 'express';
import Queue from 'bee-queue';
import { Router } from 'express';
import { RequestInput } from '../models/requestInput';
import buildRequest from '../buildRequest';
import { runBulkRequest } from '../runRequest';
import { buildResultSingle } from '../models/result';

export const router = Router();

const resultsArray: any[]= []
const queue = new Queue('example',  {
  redis: {
    host: 'redis'
  }
});
queue.process(async (job: Queue.Job) => {
  const rows = job.data.file.split('\n').map((str: string) => str.split(job.data.sep)) // TODO: parse all the attachements
  const headers = rows.shift();
  const json = rows
    .filter((row: string[]) => row.length === headers.length)
    .map((row: string[]) => {
      const readRow: any = {} // TODO
      headers.forEach((key: string, idx: number) => readRow[key] = row[idx])
      return {
        firstName: readRow[job.data.firstName],
        lastName: readRow[job.data.lastName],
        birthDate: readRow[job.data.birthDate]
      }
    })
  return processSequential(json, job)
});

async function processSequential(rows: any, job: Queue.Job) {
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

const multerSingle = multer().any();
router.post('/:format', multerSingle, async (req: any, res: express.Response) => {
  if (req.files && req.files.length > 0) {
    const sep = req.body && req.body.sep ? req.body.sep : ','
    const firstName = req.body && req.body.firstName ? req.body.firstName : 'firstName'
    const lastName = req.body && req.body.lastName ? req.body.lastName : 'lastName'
    const birthDate = req.body && req.body.birthDate ? req.body.birthDate : 'birthDate'
    const chunkSize = req.body && req.body.chunkSize ? req.body.chunkSize : 20
    const job = await queue.createJob({file: req.files[0].buffer.toString(), sep, firstName, lastName, birthDate, chunkSize}).save()
    job.on('succeeded', (result) => {
      resultsArray.push({id: job.id, result})
    });
    res.send({msg: 'started', id: job.id});
  } else {
    res.send({msg: 'no files attached'});
  }
});

router.get('/:format/:id', async (req: any, res: express.Response) => {
  const job: Queue.Job|any = await queue.getJob(req.params.id)
  if (job && job.status === 'succeeded') {
    const jobResult  = resultsArray.find(x => x.id === req.params.id)
    if (jobResult == null) {
      res.send('No results')
    } else if (req.params.format === 'json') {
      res.send(jobResult);
    } else if (req.params.format === 'csv') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/csv');
      if (job.data.birthDate) nameHeader.unshift(job.data.birthDate)
      if (job.data.lastName) nameHeader.unshift(job.data.lastName)
      if (job.data.firstName) nameHeader.unshift(job.data.firstName)
      res.write(nameHeader.join(',') + '\r\n')
      jobResult.result.forEach((result: any) => {
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

router.get('/:format/', async (req: any, res: express.Response) => {
  res.send('Job ID missing')
})

const flatJson = (item: object|string) => {
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
