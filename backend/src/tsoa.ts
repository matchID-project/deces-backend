import { generateRoutes, generateSpec, ExtendedRoutesConfig, ExtendedSpecConfig } from "tsoa";


(async () => {
  const specOptions: ExtendedSpecConfig = {
    basePath: "/api",
    host: `${process.env.API_URL}`,
    entryFile: './src/index.ts',
    specVersion: 3,
    outputDirectory: './src/api',
    noImplicitAdditionalProperties: "silently-remove-extras",
    controllerPathGlobs: ['./src/controllers/**/*controller.ts'],
  };

  const routeOptions: ExtendedRoutesConfig = {
    basePath: '/deces/api/v1',
    entryFile: './src/index.ts',
    routesDir: './src/routes',
    middleware: 'express',
    noImplicitAdditionalProperties: "silently-remove-extras",
  };

  await generateSpec(specOptions);

  await generateRoutes(routeOptions);

})();
