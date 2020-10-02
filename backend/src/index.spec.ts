import { app } from './index';
import { expect } from 'chai';
import { finished } from 'stream';
import { promisify } from 'util';
import { parseString } from '@fast-csv/parse';
import { writeToBuffer } from '@fast-csv/format';
import fs from "fs";
import chai from 'chai';
import chaiHttp = require('chai-http');
import 'mocha';

chai.use(chaiHttp);
const finishedAsync:any = promisify(finished);

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

  it('/search/csv/ - delete job', async () => {
    let res;
    let data = '';
    let pos = 0;
    let index: number;
    const nrows = 5000;
    const readStream: any = fs.createReadStream('/deces-backend/tests/clients_test.csv',  {encoding: 'utf8'})
    readStream
      .on('data', function (chunk: string) {
        index = chunk.indexOf('\n');
        data += chunk;
        if (index > 10) {
          readStream.close() 
        } else {
          pos += chunk.length;
        }
      })
    await finishedAsync(readStream, {}).catch(() => {
      // do nothing: closed stream
    });
    const buf = Buffer.from(data.split('\n').slice(0, nrows).join('\n'), 'utf8');

    res = await chai.request(app)
      .post(`${process.env.BACKEND_PROXY_PATH}/search/csv`)
      .field('sep', ';')
      .field('firstName', 'Prenom')
      .field('lastName', 'Nom')
      .field('birthDate', 'Date')
      .field('chunkSize', 20)
      .attach('csv', buf, 'file.csv')
    const { body : { id: jobId } } = res

    while (res.body.status === 'created' || res.body.status === 'waiting') {
      res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search/csv/${jobId}`)
    }
    res = await chai.request(app)
      .delete(`${process.env.BACKEND_PROXY_PATH}/search/csv/${jobId}`)
    expect(res).to.have.status(200);
    expect(res.body).to.have.all.keys('msg');
    expect(res.body.msg).to.have.string('cancelled');
    res = await chai.request(app)
       .get(`${process.env.BACKEND_PROXY_PATH}/search/csv/${jobId}`)
    while (res.body.status === 'created' || res.body.status === 'waiting' || res.body.status === 'active' || res.body.msg === 'started') {
      res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search/csv/${jobId}`)
    }
    expect(res).to.have.status(200);
    expect(res.body).to.have.all.keys('msg');
    expect(res.body.msg).to.have.string('cancelled');
  });

  it('/search/csv/ - run bulk job', async () => {
    let res;
    let data = '';
    let pos = 0;
    const nrows = 100;
    let index: number;
    const readStream: any = fs.createReadStream('/deces-backend/tests/clients_test.csv',  {encoding: 'utf8'})
    readStream
      .on('data', function (chunk: string) {
        index = chunk.indexOf('\n');
        data += chunk;
        if (index > 10) {
          readStream.close() 
        } else {
          pos += chunk.length;
        }
      })
    await finishedAsync(readStream, {}).catch(() => {
      // do nothing: closed stream
    });
    const buf = Buffer.from(data.split('\n').slice(0, nrows).join('\n'), 'utf8');

    res = await chai.request(app)
      .post(`${process.env.BACKEND_PROXY_PATH}/search/csv`)
      .field('sep', ';')
      .field('firstName', 'Prenom')
      .field('lastName', 'Nom')
      .field('birthDate', 'Date')
      .field('chunkSize', 20)
      .attach('csv', buf, 'file.csv')
    const { body : { id: jobId } } = res

    while (res.body.status === 'created' || res.body.status === 'waiting' || res.body.status === 'active' || res.body.msg === 'started') {
      res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search/csv/${jobId}`)
    }
    res = await chai.request(app)
      .get(`${process.env.BACKEND_PROXY_PATH}/search/csv/${jobId}`)
    parseString(res.text, { headers: true, delimiter: ';'})
      .on('data', (row: any) => {
        expect(row).to.include.all.keys('Prenom', 'name.first', 'Nom', 'name.last');
      })
      .on('end', (rowCount: number) => {
        expect(rowCount).to.eql(nrows - 1);
      });
  }).timeout(5000);

  it('/search/csv/ - bulk ordered', async () => {
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
