import { readFileSync } from 'fs';
const dic: any = {};
try {
    const rawdata = JSON.parse(readFileSync('data/wikidata.json','utf8'));
    rawdata.forEach((item: any) => {dic[item.id] = {...item}; delete dic[item.id].id})
} catch(e) {
    // eslint-disable-next-line no-console
    console.log('Failed loading wikidata',e);
}
export const wikidata = Object.keys(dic).length ? dic : undefined;
