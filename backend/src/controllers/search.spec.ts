import { SearchController } from './search.controller';
import express from 'express';
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
});
