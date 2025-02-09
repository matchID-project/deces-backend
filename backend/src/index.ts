import { app } from './server';
import { initUpdateIndex, updateFieldsToIndex, getAllUpdates } from './updatedIds';

const port = 8080;

(async () => {
  await initUpdateIndex();
  const updates = getAllUpdates();
  await updateFieldsToIndex(updates);

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`server started at http://localhost:${port}`);
  });
})();
