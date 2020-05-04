import express from 'express';
import multer from 'multer';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import bodyParser from 'body-parser';
import { RequestInputPost } from './types/requestInputPost';
import buildRequest from './buildRequest';
import { flatJson, nameHeader } from './controllers/index.controller';
import runRequest from './runRequest';
import { buildResultSingle } from './types/result';
import * as swaggerDocument from './api/swagger.json';
import { RegisterRoutes } from './routes/routes';
import { loggerStream } from './logger';

const app = express();
const port = 8080;

morgan.token('fwd-addr', (req: any) => {
  return req.headers['x-forwarded-for']
})

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

const multiRowProcess = async (file: any) => { // TODO
  const rows = file.buffer.toString().split('\n').map((str: any) => str.split(',')) // TODO: parse all the attachements
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
  return Promise.all(json.map(async (row: any) => {
    const requestInput = new RequestInputPost(row);
    const requestBuild = buildRequest(requestInput);
    const result = await runRequest(requestBuild, null);
    if (result.data && result.data.hits.hits.length > 0) {
      return buildResultSingle(result.data.hits.hits[0])
    } else {
      return {}
    }
  }))
}

const multerSingle = multer().any();

app.post(`${process.env.BACKEND_PROXY_PATH}/search/csv`, multerSingle, async (req: any, res: express.Response) => {
  if (req.files && req.files.length > 0) {
    const results = await multiRowProcess(req.files[0])
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv');
    res.write(nameHeader)
    results.forEach((result: any) => {
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
    res.send("Empty")
  }
});

app.post(`${process.env.BACKEND_PROXY_PATH}/search/json`, multerSingle, async (req: any, res: express.Response) => {
  if (req.files && req.files.length > 0) {
    const results = await multiRowProcess(req.files[0])
    res.send(results); // TODO stream a json
  } else {
    res.send("Empty");
  }
});

app.use(`${process.env.BACKEND_PROXY_PATH}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen( port, () => {
    // tslint:disable-next-line:no-console
    console.log( `server started at http://localhost:${ port }` );
} );
