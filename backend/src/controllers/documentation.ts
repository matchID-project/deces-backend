import express from 'express';
import { Router } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import * as swaggerDocument from '../api/swagger.json';

export const router = Router();

// Swagger set up
const options = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "API personnes décédées",
      version: process.env.APP_VERSION,
      description:
        "API pour faciliter le rapprochement des personnes decedees",
      license: {
        name: "lgpl-3.0",
        url: "https://choosealicense.com/licenses/lgpl-3.0/"
      },
      contact: {
        name: "MatchID",
        url: "https://deces.matchid.io",
        email: "matchid-project@gmail.com"
      }
    },
    servers: [
      {
        url: `http://${process.env.BACKEND_HOSTNAME}/api/v1`
      }
    ]
  },
  apis: ["**/*.ts"]
};
const specs:any = swaggerJsdoc(options);

// publish swagger json (optional)
router.get(`/bulk.json`, (_, res) => res.send(specs));
router.use(`/swagger.json`, express.static(__dirname + '/api/swagger.json'));

specs.paths = {...specs.paths, ...swaggerDocument.paths}
router.use(`/`, swaggerUi.serve, swaggerUi.setup(specs));

