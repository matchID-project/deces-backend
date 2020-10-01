import { app } from './index';
import { writeToBuffer } from '@fast-csv/format';
import { parseString } from '@fast-csv/parse';
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

  it('/search - POST - pagination', async () => {
    let actualPage = 1;
    let res = await chai.request(app)
      .post(`${process.env.BACKEND_PROXY_PATH}/search`)
      .send({ firstName: 'Alban', page: actualPage })
    totalPersons = res.body.response.persons.length;
    while (res.body.response.persons.length > 0) {
      actualPage += 1;
      res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ firstName: 'Alban', page: actualPage })
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
    expect(res.text.split('\n').length).to.eql(totalPersons + 1);
  });

  it('/csv/ - POST - bulk', async () => {
    let res;
    const inputArray = [{firstName: 'Prenom', lastName: 'Nom', birthDate: 'Date', sex: 'Sex'},{firstName: 'jean', lastName: 'pierre', birthDate: '04/08/1933', sex: 'M'}, {firstName: 'georges', lastName: 'michel', birthDate: '12/03/1939', sex: 'M'}]
    const buf = await writeToBuffer(inputArray)
    res = await chai.request(app)
      .post(`${process.env.BACKEND_PROXY_PATH}/search/csv`)
      .field('sep', ',')
      .field('firstName', 'Prenom')
      .field('lastName', 'Nom')
      .field('birthDate', 'Date')
      .field('sex', 'Sex')
      .attach('csv', buf, 'file.csv')
    const { body : { id: jobId } } = res
    res = await chai.request(app)
      .get(`${process.env.BACKEND_PROXY_PATH}/search/csv/${jobId}`)
    while (res.body.status === 'created' || res.body.status === 'waiting' || res.body.status === 'active') {
      res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search/csv/${jobId}`)
    }
    expect(res).to.have.status(200);
    parseString(res.text, { headers: true})
      .on('data', (row: any) => {
        expect(Object.keys(row).slice(0,8)).to.include.members(['Prenom', 'name.first', 'Nom', 'name.last']);
      })
      .on('end', (rowCount: number) => {
        expect(rowCount).to.eql(inputArray.length - 1);
      });
  });
});
