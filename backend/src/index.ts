import express from "express";
import { RegisterRoutes } from './routes/routes';  // here
import swaggerUi from 'swagger-ui-express'
import * as swaggerDocument from './api/swagger.json'

const app = express();
const port = 8080; // default port to listen

RegisterRoutes(app);  // and here

app.use(`${process.env.BACKEND_PROXY_PATH}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// start the express server
app.listen( port, () => {
    // tslint:disable-next-line:no-console
    console.log( `server started at http://localhost:${ port }` );
} );
