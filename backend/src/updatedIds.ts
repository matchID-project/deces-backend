import { readFileSync, readdirSync, statSync } from 'fs';
import path from "path";
import axios from 'axios';
import { log } from './server';
import { runBulkRequest } from './runRequest';
import { buildRequest } from './buildRequest';
import { buildResultSingle, Result } from './models/result';
import { RequestInput } from './models/requestInput';

const updateIndex = 'deces-updates';
const modelIndex = 'deces';
let updateIndexCreated = false;

export const initUpdateIndex =  async (): Promise<boolean> => {
  if (updateIndexCreated) { return true }
  try {
    const test = await axios(`http://elasticsearch:9200/${updateIndex}/_settings`);
    if (test.status === 200) {
      updateIndexCreated = true;
      return true;
    }
  } catch(e) {
    // create index
    const settingsResponse = await axios(`http://elasticsearch:9200/${modelIndex}/_settings`);
    if (settingsResponse.status !== 200) {
      log({msg: 'failed initiating missing update index', error: "coudn't retrive settings from model index"});
      return false;
    }
    const analysis = settingsResponse.data && settingsResponse.data[modelIndex] &&
      settingsResponse.data[modelIndex].settings.index && settingsResponse.data[modelIndex].settings.index.analysis;
    if (!analysis) {
      log({msg: 'failed initiating missing update index', error: "coudn't retrive settings from model index"});
      return false
    };
    const mappingsResponse = await axios(`http://elasticsearch:9200/${modelIndex}/_mappings`);
    if (mappingsResponse.status !== 200) {
      log({msg: 'failed initiating missing update index', error: "coudn't retrive mappings from model index"});
      return false;
    }
    const mappings = mappingsResponse.data && mappingsResponse.data[modelIndex] &&
      mappingsResponse.data[modelIndex].mappings;
    if (!mappings) {
      log({msg: 'failed initiating missing update index', error: "coudn't retrive mappings from model index"});
      return false;
    };
    try {
      const createIndexResponse = await axios(`http://elasticsearch:9200/${updateIndex}/`, {
        method: 'PUT',
        data: {
          settings: { index: { analysis}},
          mappings
        },
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-cache'
        }
      });
      updateIndexCreated = true;
      log({msg: "initiated update index as didn't exists"});
      return true;
    } catch(err) {
      log({msg: 'failed initiating missing update index', error: err.message});
      return false;
    }
  }
}

const walk = (directory: string): string[]=> {
  const fileList: string[] = [];

  const files = readdirSync(directory);
  for (const file of files) {
    const p = path.join(directory, file);
    if ((statSync(p)).isDirectory()) {
      const subFiles: string[] = readdirSync(p);
      subFiles
        .sort((a, b) => {
          const dateA:any = new Date(a.split('_')[0])
          const dateB:any = new Date(b.split('_')[0])
          return dateA - dateB
        })
        .filter(x => x.includes('json'))
        .map(f => path.join(p, f))
        .forEach(f => fileList.push(f));
    }
  }
  return fileList;
}

const rawData: any = {};
try {
    const jsonFiles = walk('./data/proofs')
    jsonFiles.forEach((jsonFile: string) => {
      // data/proof/{id} => id=2
      const id = jsonFile.split("/")[2];
      if (!rawData[id]) { rawData[id] = []}
      rawData[id].push(JSON.parse(readFileSync(jsonFile,'utf8')));
    })
} catch(e) {
    // eslint-disable-next-line no-console
    console.log('Failed loading updatedFields',e);
}

export const updatedFields: any = Object.keys(rawData).length ? rawData : {};

export const getAllUpdates = (): any => {
  return {...updatedFields};
}

export const getAuthorUpdates = (author: string):any => {
  const updates:any = {};
  Object.keys(updatedFields).forEach((id:any) => {
    let keep = false;
    const modifications = updatedFields[id].map((m:any) => {
      const modif:any = {...m}
      if (modif.author !== author) {
        modif.author = modif.author.substring(0,2)
          + '...' + modif.author.replace(/@.*/,'').substring(modif.author.replace(/@.*/,'').length-2)
          + '@' + modif.author.replace(/.*@/,'');
        modif.message = undefined;
        modif.review = undefined;
      } else {
        keep = true
      }
      return modif;
    });
    if (keep) {
      updates[id] = modifications;
    }
  });
  return updates;
}

export const resultsFromUpdates = async (updates: any): Promise<Result> => {
  const bulkRequest = Object.keys(updates).map((id: any) =>
    [JSON.stringify({index: "deces"}), JSON.stringify(buildRequest(new RequestInput({id})))]
  );
  const msearchRequest = bulkRequest.map((x: any) => x.join('\n\r')).join('\n\r') + '\n';
  const result =  await runBulkRequest(msearchRequest);
  return result.data.responses.map((r:any) => buildResultSingle(r.hits.hits[0]))
    .map((r:any) => {
      delete r.score;
      delete r.scores;
      r.modifications = updates[r.id];
      return r;
    });
}