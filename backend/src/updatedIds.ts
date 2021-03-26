import { readFileSync, readdirSync, statSync } from 'fs';
import path from "path";

const walk = (directory: string) => {
  const fileList: string[] = [];

  const files = readdirSync(directory);
  for (const file of files) {
    const p = path.join(directory, file);
    if ((statSync(p)).isDirectory()) {
      const subFiles: string[] = readdirSync(p);
      fileList.push(path.join(p, subFiles
        .sort((a, b) => {
          const dateA:any = new Date(a.split('_')[0])
          const dateB:any = new Date(b.split('_')[0])
          return dateB - dateA
        })
        .filter(x => x.includes('json'))[0]
      ));
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
export const updatedFields = Object.keys(rawData).length ? rawData : {};
