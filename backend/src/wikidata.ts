import { readFileSync } from 'fs';
import { Wikidict } from './models/entities';

const dic: any = {};
try {
    const rawdata = JSON.parse(readFileSync(`${process.env.WIKIDATA_LINKS}`,'utf8'));
    rawdata.forEach((item: Wikidict) => {dic[item.id] = {...item}; delete dic[item.id].id})
} catch(e) {
    // eslint-disable-next-line no-console
    console.log('Failed loading wikidata',e);
}
export const wikidata = Object.keys(dic).length ? dic : undefined;
