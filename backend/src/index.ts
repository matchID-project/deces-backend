import express from "express";
import axios from 'axios';
const app = express();
const port = 8080; // default port to listen

// define a route handler for the default home page
app.get( "/", async ( req, res ) => {
  const result = await axios.get("http://elasticsearch:9200/deces")
  console.log(result.data);
  res.json(result.data);
});

// start the express server
app.listen( port, () => {
    // tslint:disable-next-line:no-console
    console.log( `server started at http://localhost:${ port }` );
} );
