import express from 'express';
import multer from 'multer';
import morgan from 'morgan';
import Queue from 'bee-queue';
import swaggerUi from 'swagger-ui-express';
import bodyParser from 'body-parser';
import { RequestInput } from './models/requestInput';
import buildRequest from './buildRequest';
import { flatJson, nameHeader } from './controllers/index.controller';
import runRequest from './runRequest';
import { buildResultSingle } from './models/result';
import * as swaggerDocument from './api/swagger.json';
import { RegisterRoutes } from './routes/routes';
import { loggerStream } from './logger';

const app = express();
const port = 8080;

morgan.token('fwd-addr', (req: any) => {
  return req.headers['x-forwarded-for']
})

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

function formatAsJson (tokens: any, req: any, res: any) {
  return JSON.stringify({
    backend: {
      'remote-address': tokens['remote-addr'](req, res),
      'forwarded-address': tokens['fwd-addr'](req, res),
      'remote-user': tokens['remote-user'](req, res),
      'server-date': tokens.date(req, res, 'iso'),
      'response-time': +tokens['response-time'](req, res, 'iso'),
      method: tokens.method(req, res),
      url: tokens.url(req, res),
      'http-version': tokens['http-version'](req, res),
      'status-code': +tokens.status(req, res),
      'content-length': +tokens.res(req, res, 'content-length'),
      referrer: tokens.referrer(req, res),
      'user-agent': tokens['user-agent'](req, res)
    },
  })
}

app.use(morgan(formatAsJson, { stream: loggerStream }))

function addRawBody(req: any, res: any, buf: any, encoding: any) {
    req.rawBody = buf.toString();
}

app.use((req, res, next) => {
    bodyParser.json({
        verify: addRawBody,
    })(req, res, (err) => {
        if (err) {
            res.status(400).send('error - bad JSON formating');
            return;
        }
        next();
    });
});

app.use(bodyParser.urlencoded({ extended: false }));
RegisterRoutes(app);

const multerSingle = multer().any();
app.post(`${process.env.BACKEND_PROXY_PATH}/search/:format`, multerSingle, async (req: any, res: express.Response) => {
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

app.get(`${process.env.BACKEND_PROXY_PATH}/search/:format/:id`, async (req: any, res: express.Response) => {
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

app.use(`${process.env.BACKEND_PROXY_PATH}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen( port, () => {
    // tslint:disable-next-line:no-console
    console.log( `server started at http://localhost:${ port }` );
} );
