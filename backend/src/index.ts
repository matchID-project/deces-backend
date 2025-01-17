import { app } from './server';
import { initUpdateIndex, updateFieldsToIndex, getAllUpdates } from './updatedIds';


initUpdateIndex();
const updates = getAllUpdates();
updateFieldsToIndex(updates);

const port = 8080;

app.listen( port, () => {
  // eslint-disable-next-line no-console
  console.log( `server started at http://localhost:${ port }` );
} );
