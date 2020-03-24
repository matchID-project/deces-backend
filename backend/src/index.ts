import express from "express";
import { RegisterRoutes } from './routes/routes';  // here
import swaggerUi from 'swagger-ui-express'
import * as swaggerDocument from './api/swagger.json'
import bodyParser from "body-parser";

const app = express();
const port = 8080; // default port to listen

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

RegisterRoutes(app);  // and here

app.use(`${process.env.BACKEND_PROXY_PATH}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// start the express server
app.listen( port, () => {
    // tslint:disable-next-line:no-console
    console.log( `server started at http://localhost:${ port }` );
} );
