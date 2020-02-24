import express from "express";
import axios from 'axios';
import runRequest from './runRequest';
import buildRequest from './buildRequest';
const app = express();
const port = 8080; // default port to listen

// define a route handler for the default home page
app.get( "/", async ( req, res ) => {
  const result = await axios.get("http://elasticsearch:9200/deces")
  console.log(result.data);
  res.json(result.data);
});

app.get( "/search", async ( req, res ) => {
  for (const key in req.query) {
    console.log(key, req.query[key])
  }
  let params: any = {} // TODO: set template
  if (req.query.q) {
    params['query'] = req.query.q
  }
  const requestBody = buildRequest(params);
  const result = await runRequest(requestBody);
  console.log(result.data);
  res.json(result.data);
});


// start the express server
app.listen( port, () => {
    // tslint:disable-next-line:no-console
    console.log( `server started at http://localhost:${ port }` );
} );
