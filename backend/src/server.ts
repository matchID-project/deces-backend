import express, {
  Response as ExResponse,
  Request as ExRequest,
  NextFunction,
} from "express";
import { ValidateError } from 'tsoa';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import { RegisterRoutes } from './routes/routes';
import loggerStream from './logger';
// import { router as bulk } from './controllers/bulk';
import { router as documentation } from './controllers/documentation';
// Manually telling tsoa which controllers to use in the app entry file, route generation faster
import "./controllers/search.controller";
import "./controllers/bulk.controller";
import "./controllers/aggregation.controller";
import "./controllers/status.controller";

const log = (json:any) => {
  loggerStream.write(JSON.stringify({
    "backend": {
      "server-date": new Date(Date.now()).toISOString(),
      ...json
    }
  }));
}

export const app = express();

morgan.token('fwd-addr', (req: any) => {
  return req.headers['x-forwarded-for']
})

const formatAsJson = (tokens: any, req: any, res: any) => {
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

const addRawBody = (req: any, res: any, buf: any, encoding: any) => {
    req.rawBody = buf.toString();
}

app.use((req: ExRequest, res: ExResponse, next: NextFunction) => {
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
app.use((_req, res: ExResponse, next: NextFunction) => {
  if (_req.path.includes(`${process.env.BACKEND_PROXY_PATH}/docs`)) {
    next();
  } else {
    res.status(404).send({
      message: "Route not found",
    });
  }
});
app.use((
  err: unknown,
  req: ExRequest,
  res: ExResponse,
  next: NextFunction
): ExResponse | void => {
  if (err instanceof ValidateError) {
    log({
        error: "Validation Failed",
        path: req.path,
        details: err?.fields,
    });
    return res.status(422).json({
      message: "Validation Failed",
      details: err?.fields,
    });
  }
  if (err instanceof Error && res.statusCode !== 200) {
    log({
      error: "Internal Server Error"
    });
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
  next();
});

// app.use(`${process.env.BACKEND_PROXY_PATH}/search`, bulk);
app.use(`${process.env.BACKEND_PROXY_PATH}/docs`, documentation);
