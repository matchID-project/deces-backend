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
  const requestBody = buildRequest("Jacques Chirac");
  const result = await runRequest(requestBody);
  console.log(result.data);
  res.json(result.data);
});


// start the express server
app.listen( port, () => {
    // tslint:disable-next-line:no-console
    console.log( `server started at http://localhost:${ port }` );
} );
