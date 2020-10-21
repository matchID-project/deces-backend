import { app } from './server';

const port = 8080;

app.listen( port, () => {
  // eslint-disable-next-line no-console
  console.log( `server started at http://localhost:${ port }` );
} );
