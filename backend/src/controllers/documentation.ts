import express from 'express';
import { Router } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import * as swaggerDocument from '../api/swagger.json';
import { getCwd } from 'swagger-ui-svelte';

export const router = Router();

// Swagger set up
const swaggerDefinitionTemplate: any = {
  info: {
    title: "API personnes décédées",
    version: process.env.APP_VERSION,
    description:
    `API pour faciliter le rapprochement des personnes decedees\n \n Swagger File: [${process.env.API_URL}/deces/api/v1/docs/swagger.json](http${process.env.API_SSL && process.env.API_SSL === "1" ? 's' : ''}://${process.env.API_URL}/deces/api/v1/docs/swagger.json)`,
    license: {
      name: "lgpl-3.0",
      url: "https://choosealicense.com/licenses/lgpl-3.0/"
    },
    contact: {
      name: "MatchID",
      url: `http${process.env.API_SSL && process.env.API_SSL === "1" ? 's' : ''}://${process.env.API_URL}`,
      email: `${process.env.API_EMAIL}`
    }
  },
  servers: [
    {
      url: `http${process.env.API_SSL && process.env.API_SSL === "1" ? 's' : ''}://${process.env.API_URL}/deces/api/v1`,
      description: "Backend API URL"
    }
  ]
}

const options = {
  swaggerDefinition: {...swaggerDefinitionTemplate},
  apis: ["**/*.controller.{ts,js}"]
}
options.swaggerDefinition.openapi = '3.0.0'
const specs: any = swaggerJsdoc(options);

// publish swagger json (optional)
router.get(`/swagger.json`, (_, res: any) => res.send(specs));
router.get(`/tsoa.json`, (_, res: any) => res.send(swaggerDocument));

specs.paths = {...specs.paths, ...swaggerDocument.paths}
specs.components = {...specs.components, ...swaggerDocument.components}
// specs.default = swaggerDocument.default;

// deafult swagger-example.json replaced by local swagger file
// this could also be done using a res.redirect('/path/to/swagger`)
router.get(`/svelte/swagger-example.json`, (_, res: any) => res.send(specs));
router.use(`/svelte`, express.static(getCwd(), { 'index': ['index.html'] }));
router.use(`/`, swaggerUi.serve, swaggerUi.setup(specs));
