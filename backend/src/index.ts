import express from 'express';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import bodyParser from 'body-parser';
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

app.use(`${process.env.BACKEND_PROXY_PATH}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen( port, () => {
    // tslint:disable-next-line:no-console
    console.log( `server started at http://localhost:${ port }` );
} );
