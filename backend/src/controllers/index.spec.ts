import { IndexController } from './index.controller';
import express from 'express';
import { expect } from 'chai';
import 'mocha';

describe('GET request', () => {
  it('Single request - should return more than 0 results', async () => {
    const controller = new IndexController()
    const result = await controller.search("Georges")
    expect(result.response.persons.length).to.greaterThan(0);
  });

  it('Search for lastName', async () => {
    const controller = new IndexController()
    const result = await controller.search(null, null, 'Pottier')
    expect(result.response.persons[0].name.last).to.equal('Pottier');
  });

  it('Birth country', async () => {
    const controller = new IndexController()
    const result = await controller.search(null, null, null, null, null, null, null, 'France')
    expect(result.response.persons[0].death.location.country).to.equal('France');
  });
});

describe('POST request', () => {
  it('Single request - should return more than 0 results', async () => {
    const controller = new IndexController()
    const result = await controller.searchpost({q: 'Georges'}, {} as express.Request)
    expect(result.response.persons.length).to.greaterThan(0);
  });

  it('Single request - should return more than 0 results', async () => {
    const controller = new IndexController()
    const result = await controller.searchpost({birthGeoPoint: {latitude: 49.6, longitude: 2.98, distance: "10km"}}, {} as express.Request)
    expect(result.response.persons.map(x => x.death.location.city).join(' ')).to.contains('Noyon')
  });
});
