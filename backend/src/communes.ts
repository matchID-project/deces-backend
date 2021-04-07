import { readFileSync } from 'fs';

export const normalize = (token: string|string[]): string|string[] => {
  if ((token === undefined) || (token === null)) {
      return '';
  }
  if (typeof(token) === 'string') {
      return token.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g,' ').replace(/^\s*/,'').replace(/\s*$/,'');
  } else {
      return token.map(t => normalize(t) as string);
  }
}

export const applyRegex = (a: string|string[], reTable: (string|RegExp)[][] ): string|string[] => {
  if (typeof(a) === 'string') {
      let b = normalize(a) as string;
      reTable.map((r:any) => b = b.replace(r[0], r[1]));
      return b;
  } else if (Array.isArray(a)) {
      return a.map(c => applyRegex(c, reTable) as string);
  } else {
      return a
  }
}

const cityRegExp = [
  [ /^\s*(lyon|marseille|paris)(\s.*|\s*\d\d*.*|.*art.*|.*arr.*)$/, '$1'],
  [ /(^|\s)ste(\s|$)/, '$1sainte$2'],
  [ /(^|\s)st(\s|$)/, '$1saint$2'],
  [ /^aix pce$/, 'aix provence'],
  [ /(^|\s)(de|en|les|le|la|a|aux|au|du|de la|sous|ss?|sur|l|d|des)\s/g, ' '],
  [ /(^|\s)(de|en|les|le|la|a|aux|au|du|de la|sous|ss?|sur|l|d|des)\s/g, ' '],
  [ /^x$:/, ''],
  [ /\s+/, ' '],
  [ /œ/, 'oe'],
  [ /æ/, 'ae'],
  [ /^.*inconnu.*$/, ''],
  [ /sainte clotilde/, 'saint denis'],
  [ /berck mer/, 'berck'],
  [ /montreuil s.* bois/, 'montreuil'],
  [ /asnieres s.* seine/, 'asnieres'],
  [ /clichy garenne.*/, 'clichy'],
  [ /belleville saone/, 'belleville'],
  [ /^levallois$/, 'levallois perret'],
  [ /'\s$/, ''],
  [ /^\s*/, '']
];

export const cityNorm = (city: string|string[]): string|string[] => {
  return applyRegex(city, cityRegExp);
}

const getLatLon = (array: any) => {
  let lat = 0;
  let totalLat = 0;
  let long = 0;
  let totalLong = 0;
  array.forEach((val: number, ind: number) => {
    if (ind%2 === 0) {
      lat += val;
      totalLat += 1;
    } else {
      long += val;
      totalLong += 1;
    }
  })
  return [long/totalLong, lat/totalLat]
}

const dic: any = {};
try {
  const rawdata = JSON.parse(readFileSync('data/communes.json','utf8'));

  rawdata.features.filter((feature : any) => feature.geometry && feature.geometry.coordinates)
    .forEach((feature: any) => {
      const [ lat, lon ] = getLatLon(feature.geometry.coordinates.flat(3))
      dic[cityNorm(feature.properties.nom) as string] = {
        lat,
        lon,
        code: feature.properties.code
      }});
} catch(e) {
    // eslint-disable-next-line no-console
    console.log('Failed loading communes data',e);
}

export const communesDict = dic as {
    [key: string]: {
      lat: number;
      lon: number;
      code: string;
    };
};
