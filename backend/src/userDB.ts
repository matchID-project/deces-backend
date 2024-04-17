import { readFileSync } from 'fs';
let rawData: any = [];
try {
    rawData = JSON.parse(readFileSync(`${process.env.DB_JSON}`,'utf8'));
} catch(e) {
    // eslint-disable-next-line no-console
    console.log('Failed loading wikidata',e);
}
export const userDB = Object.keys(rawData).length ? rawData : {};
