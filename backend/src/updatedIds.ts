import { readFileSync, readdirSync, statSync } from 'fs';
import path from "path";
import { runBulkRequest } from './runRequest';
import { buildRequest } from './buildRequest';
import { buildResultSingle, Result } from './models/result';
import { RequestInput } from './models/requestInput';
import { estypes } from '@elastic/elasticsearch';

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
    const jsonFiles = walk(`${process.env.PROOFS}`)
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
        modif.author = modif.author ? modif.author.substring(0,2)
          + '...' + modif.author.replace(/@.*/,'').substring(modif.author.replace(/@.*/,'').length-2)
          + '@' + modif.author.replace(/.*@/,'') : '';
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

export const resultsFromUpdates = async (updates: any): Promise<estypes.MsearchResponse['responses']> => {
  const bulkRequest = {searches: Object.keys(updates).map((id: any) => {
    const requestInput = new RequestInput({id});
    return [{index: "deces"}, buildRequest(requestInput)];
  }).flat()}
  const result =  await runBulkRequest(bulkRequest);
  return result.responses
}

export const cleanRawUpdates = (rawUpdates: any, updates: any): Promise<Result> => {
  return rawUpdates.map((r:any) => buildResultSingle(r.hits.hits[0]))
    .filter((r:any) => Object.keys(r).length > 0)
    .map((r:any) => {
      delete r.score;
      delete r.scores;
      r.modifications = updates[r.id];
      return r;
    });
}
