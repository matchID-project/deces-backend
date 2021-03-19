import { SearchController } from './search.controller';
import express from 'express';
import { writeToBuffer } from '@fast-csv/format';
import { expect } from 'chai';
import 'mocha';

describe('search.controller.ts - GET request', () => {
  const controller = new SearchController()
  it('Single request - should return more than 0 results', async () => {
    const result = await controller.search("Georges")
    expect(result.response.persons.length).to.greaterThan(0);
  });

  it('Search for lastName', async () => {
    const result = await controller.search(null, null, 'Pottier')
    expect(result.response.persons[0].name.last).to.equal('Pottier');
  });

  it('Birth country parameter', async () => {
    const result = await controller.search(null, null, null, null, null, null, null, null, null, 'France')
    expect(result.response.persons[0].death.location.country).to.equal('France');
  });

  it('Query by lastSeenAliveDate', async () => {
    const result = await controller.search(null, 'jean', null, null, null, null, null, null, null, null, null, null, null, null, null, null, '20/01/2020')
    expect(result.response.persons.every(x => parseInt(x.death.date, 10) >= 20200120)).to.equal(true);
    expect(result.response.persons.length).to.greaterThan(0);
  });

  it('Query by source', async () => {
    const result = await controller.search(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, '2020-m01')
    expect(result.response.persons.length).to.greaterThan(0);
  });

});

describe('search.controller.ts - POST request', () => {
  const controller = new SearchController()
  it('Query parameter should return more than 0 results', async () => {
    const result = await controller.searchpost({q: 'Georges'}, {} as express.Request)
    expect(result.response.persons.length).to.greaterThan(0);
  });

  it('Sort and order by score asc', async () => {
    const result = await controller.searchpost({firstName: 'jean', lastName: 'dupont', sort: [{score: "asc"}]}, {} as express.Request)
    expect(result.response.persons.every((x, i) => i === 0 || x.score >= result.response.persons[i - 1].score)).to.equal(true)
    expect(result.response.persons.length).to.greaterThan(0);
  });

  it('Sort and order by score desc', async () => {
    const result = await controller.searchpost({firstName: 'jean', lastName: 'dupont', sort: [{score: "desc"}]}, {} as express.Request)
    expect(result.response.persons.length).to.greaterThan(0);
    expect(result.response.persons.every((x, i) => i === 0 || x.score <= result.response.persons[i - 1].score)).to.equal(true)
  });

  it('Query by lastSeenAliveDate', async () => {
    const result = await controller.searchpost({firstName: 'jean', lastSeenAliveDate: '20/01/2020'}, {} as express.Request)
    expect(result.response.persons.length).to.greaterThan(0);
    expect(result.response.persons.every(x => parseInt(x.death.date, 10) >= 20200120)).to.equal(true);
  });

  it('Query by source', async () => {
    const result = await controller.searchpost({source: '2020-m01'}, {} as express.Request)
    expect(result.response.persons.length).to.greaterThan(0);
  });

  it('Query by GeoPoint', async () => {
    const result = await controller.searchpost({birthGeoPoint: {latitude: 49.6, longitude: 2.98, distance: "10km"}}, {} as express.Request)
    expect(result.response.persons.map(x => x.birth.location.city)).to.include('Noyon')
  });

  // not active in single search
  // it('Query by communes using geocoding', async () => {
  //   const result = await controller.searchpost({firstName: 'jean', lastName: 'martin', birthCity: 'La Londe'}, {} as express.Request)
  //   expect(result.response.persons[0].birth.location.city).to.include('Elbeuf')
  // });
});

describe('search.controller.ts - POST id', () => {
  const controller = new SearchController()
  it('update id', async () => {
    // let res: any;
    const inputArray = [
      ['Prenom', 'Nom', 'Date', 'Sex'],
      ['jean', 'pierre', '04/08/1933', 'M'],
      ['georges', 'michel', '12/03/1939', 'M']
    ]
    const buf: any = await writeToBuffer(inputArray)
    const body = {
      'author_id': 'Ked3oh@oPho3m.com',
      lastName: 'Aiph7u'
    }
    const req = {
      headers: {},
      body,
      files: buf
    } as express.Request
    const res = await controller.updateId('POgzt_2CZT2o', body, req)
    expect(res.msg).to.equal('OK');
    // const { id: jobId }: { id: string } = res
    // await controller.downloadResults({res: {send: (x) => res = x, status: (x) => console.log(x)}} as express.Request, 'csv', jobId)
    // console.log(res);
    // await new Promise(r => setTimeout(r, 2000));
    // console.log("finish sleep");
    // while (res.status === 'created' || res.status === 'waiting' || res.status === 'active') {
    //   const response: any = {res: {send: (x) => res = x, status: (_) => {
    //     return {send: (x) => res = x}}
    //   }} as express.Request
    //   await controller.downloadResults(response, 'csv', jobId)
    //   console.log(res);
    // }
    // console.log(res);
  });
});
