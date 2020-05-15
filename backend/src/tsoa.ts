import { generateRoutes, generateSwaggerSpec, RoutesConfig, SwaggerConfig } from 'tsoa';

(async () => {
  const swaggerOptions: SwaggerConfig = {
    basePath: '/deces/api/v1',
    host: `${process.env.API_URL}`,
    entryFile: './src/index.ts',
    specVersion: 3,
    outputDirectory: './src/api',
    noImplicitAdditionalProperties: "silently-remove-extras",
    controllerPathGlobs: ['./src/controllers/**/*controller.ts'],
  };

  const routeOptions: RoutesConfig = {
    basePath: '/deces/api/v1',
    entryFile: './src/index.ts',
    routesDir: './src/routes',
    middleware: 'express'
  };

  await generateSwaggerSpec(swaggerOptions, routeOptions);

  await generateRoutes(routeOptions, swaggerOptions);
})();
