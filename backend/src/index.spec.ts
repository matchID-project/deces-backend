import { app } from './index';
import chai from 'chai';
import { expect } from 'chai';
import chaiHttp = require('chai-http');
import 'mocha';

chai.use(chaiHttp);

describe('index.ts - Express application', () => {
  let totalPersons: number;

  it('/healthcheck', async () => {
    const res = await chai.request(app)
      .get(`${process.env.BACKEND_PROXY_PATH}/healthcheck`)
    expect(res).to.have.status(200);
    expect(res.body.msg).to.eql("OK");
  });

  it('/search - POST - scrollId', async () => {
    let res = await chai.request(app)
      .post(`${process.env.BACKEND_PROXY_PATH}/search`)
      .send({ firstName: 'Alban', scroll: '1m' })
    totalPersons = res.body.response.persons.length;
    while (res.body.response.persons.length > 0) {
      res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ scroll: '1m', scrollId: res.body.response.scrollId })
      totalPersons += res.body.response.persons.length;
    }
    expect(res).to.have.status(200);
    expect(totalPersons).to.eql(res.body.response.total);
  });

  it('/search - POST - text/csv', async () => {
    const res = await chai.request(app)
      .post(`${process.env.BACKEND_PROXY_PATH}/search`)
      .set('Accept', 'text/csv')
      .send({ firstName: 'Alban' })
    expect(res).to.have.status(200);
    // remove header and last line
    expect(res.text.split('\n').length).to.eql(totalPersons + 2);
  });
});
