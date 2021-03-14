import { readFileSync } from 'fs';

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
      dic[feature.properties.nom.toLowerCase()] = {
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
