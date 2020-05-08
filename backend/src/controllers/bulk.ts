import multer from 'multer';
import express from 'express';
import Queue from 'bee-queue';
import { Router } from 'express';
import { RequestInput } from '../models/requestInput';
import buildRequest from '../buildRequest';
import runRequest from '../runRequest';
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
        firstName: readRow.firstName,
        lastName: readRow.lastName,
        birthDate: readRow.birthDate
      }
    })
  return processSequential(json, job)
});

async function processSequential(rows: any, job: Queue.Job) {
  const resultsSeq = []
  for(const row of rows) {
    const requestInput = new RequestInput(null, row.firstName, row.lastName, null, row.birthDate);
    const requestBuild = buildRequest(requestInput);
    const result = await runRequest(requestBuild, null);
    job.reportProgress(resultsSeq.length)
    if (result.data && result.data.hits.hits.length > 0) {
      resultsSeq.push(buildResultSingle(result.data.hits.hits[0]))
    } else {
      resultsSeq.push({})
    }
  }
  return resultsSeq
};

const multerSingle = multer().any();
router.post('/:format', multerSingle, async (req: any, res: express.Response) => {
  if (req.files && req.files.length > 0) {
    const sep = req.body && req.body.sep ? req.body.sep : ','
    const job = await queue.createJob({file: req.files[0].buffer.toString(), sep}).save()
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
  if (job.status === 'succeeded') {
    const jobResult  = resultsArray.find(x => x.id === req.params.id)
    if (jobResult == null) {
      res.send('No results')
    } else if (req.params.format === 'json') {
      res.send(jobResult);
    } else if (req.params.format === 'csv') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/csv');
      res.write(nameHeader)
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
  } else {
    res.send({status: job.status, id: req.params.id, progress: job.progress});
  }
});

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

const nameHeader = 'score,source,id,name,firstName,lastName,sex,birthDate,birthCity,cityCode,departmentCode,country,countryCode,latitude,longitude,deathDate,certificateId,age,deathCity,cityCode,departmentCode,country,countryCode,latitude,longitude\r\n'
