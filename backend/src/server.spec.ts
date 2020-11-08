import { app } from './server';
import { expect } from 'chai';
import { finished } from 'stream';
import { Person } from './models/entities';
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

  describe('/search GET', () => {
    it('firstName', async () => {
      const res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({deathDate: 2020, firstName: 'Harry'})
      expect(res).to.have.status(200);
      expect(res.body.response.persons[0].name.first).to.include('Harry');
    });

    it('lastName', async () => {
      const res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({deathDate: 2020, lastName: 'Pottier'})
      expect(res).to.have.status(200);
      expect(res.body.response.persons[0].name.last).to.include('Pottier');
    });

    it('birthCountry', async () => {
      const res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({deathDate: 2020, birthCountry: 'France'})
      expect(res).to.have.status(200);
      expect(res.body.response.persons[0].birth.location.country).to.equal('France');
    });

    it('deathCountry', async () => {
      const res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({deathDate: 2020, deathCountry: 'Argentine'})
      expect(res).to.have.status(200);
      expect(res.body.response.persons[0].death.location.country).to.equal('Argentine');
    });

    it('birthDate', async () => {
      const res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({deathDate: 2020, birthDate: '23/01/1928'})
      expect(res).to.have.status(200);
      expect(res.body.response.persons[0].birth.date).to.equal('19280123');
    });

    it('deathDate', async () => {
      const res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ deathDate: '22/01/2020'})
      expect(res).to.have.status(200);
      expect(res.body.response.persons[0].death.date).to.equal('20200122');
    });

    it('deathDate range', async () => {
      const res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ deathDate: '22/01/2020-30/01/2020'})
      expect(res).to.have.status(200);
      res.body.response.persons.forEach((person: Person) => {
        expect(parseInt(person.death.date, 10)).to.be.within(20200122, 20200130);
      })
    });

    it('birthCity', async () => {
      const res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ deathDate: '2020', birthCity: 'Metz' })
      expect(res).to.have.status(200);
      expect(res.body.response.persons[0].birth.location.city).to.equal('Metz');
    });

    it('deathCity', async () => {
      const res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ deathDate: '2020', deathCity: 'Nice' })
      expect(res).to.have.status(200);
      expect(res.body.response.persons[0].death.location.city).to.equal('Nice');
    });

    it('birthDepartment Code', async () => {
      const res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ deathDate: '2020', birthDepartment: 57 })
      expect(res).to.have.status(200);
      expect(res.body.response.persons[0].birth.location.departmentCode).to.equal('57');
    });

    it('deathDepartment Code', async () => {
      const res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ deathDate: '2020', deathDepartment: 75 })
      expect(res).to.have.status(200);
      expect(res.body.response.persons[0].death.location.departmentCode).to.equal('75');
    });

    it('fuzzy', async () => {
      const res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ deathDate: '2020', firstName: 'Ana', fuzzy: false })
      expect(res).to.have.status(200);
      res.body.response.persons.forEach((person: Person) => {
        expect(person.name.first).to.include('Ana');
      })
    });

    it('fullText', async () => {
      const res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ q: 'Michel Rojo' })
      expect(res).to.have.status(200);
      res.body.response.persons.forEach((person: Person) => {
        expect(person.name.first).to.include('Michel');
      })
    });

    it('empty request', async () => {
      const res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
      expect(res).to.have.status(400);
      expect(res.body.msg).to.include('error');
    });

    it('wrong field', async () => {
      const res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ bob: 'Pop' })
      expect(res).to.have.status(400);
      expect(res.body.msg).to.include('error');
    });

    it('wrong value', async () => {
      const res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ birthDate: 19 })
      expect(res).to.have.status(400);
      res.body.msg.some((msg: string) => {
        expect(msg).to.include('invalid');
      })
    });

    it('simple and complex request', async () => {
      const res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ birthDate: 19, q: 'Georges' })
      expect(res).to.have.status(400);
      res.body.msg.some((msg: string) => {
        expect(msg).to.include('invalid');
      })
    });

    it('deathAge', async () => {
      const res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ deathDate: '2020', deathAge: 20 })
      expect(res).to.have.status(200);
      expect(res.body.response.persons).to.have.lengthOf.within(1, 20);
    });

    it('sex', async () => {
      const res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ deathDate: '2020', sex: 'M' })
      expect(res).to.have.status(200);
      expect(res.body.response.persons.map((x: Person) => x.sex)).to.not.include('F');
    });

    it('sort', async () => {
      const res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ deathDate: '2020', sort: '[{\"sex\":\"asc\"}]' })
      expect(res).to.have.status(200);
      expect(res.body.response.persons.map((x: Person) => x.sex)).to.not.include('M');
    });

    it('scroll', async () => {
      let res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ firstName: 'Alban', scroll: '1m' })
      expect(res).to.have.status(200);
      totalPersons = res.body.response.persons.length;
      while (res.body.response.persons.length > 0) {
        res = await chai.request(app)
          .get(`${process.env.BACKEND_PROXY_PATH}/search`)
          .query({ scroll: '1m', scrollId: res.body.response.scrollId })
        expect(res).to.have.status(200);
        totalPersons += res.body.response.persons.length;
      }
      expect(totalPersons).to.equal(res.body.response.total);
    });

    it('pagination', async () => {
      let actualPage = 1;
      let res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ firstName: 'Alban', page: actualPage })
      expect(res).to.have.status(200);
      totalPersons = res.body.response.persons.length;
      while (res.body.response.persons.length > 0) {
        actualPage += 1;
        res = await chai.request(app)
          .get(`${process.env.BACKEND_PROXY_PATH}/search`)
          .query({ firstName: 'Alban', page: actualPage })
        expect(res).to.have.status(200);
        totalPersons += res.body.response.persons.length;
      }
      expect(totalPersons).to.equal(res.body.response.total);
    });

    it('inconnu', async () => {
      const res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ firstName: 'Inconnu' })
      expect(res).to.have.status(200);
      expect(res.body.response.total).to.equal(0);
      expect(res.body.response.persons).to.have.lengthOf(0);
    });

  })


  describe('/search POST', () => {
    it('firstName', async () => {
      const res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({deathDate: 2020, firstName: 'Harry'})
      expect(res).to.have.status(200);
      expect(res.body.response.persons[0].name).to.have.property('first');
      expect(res.body.response.persons[0].name.first).to.include('Harry');
    });

    it('lastName', async () => {
      const res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({deathDate: 2020, lastName: 'Pottier'})
      expect(res).to.have.status(200);
      expect(res.body.response.persons[0].name).to.have.property('last');
      expect(res.body.response.persons[0].name.last).to.match(/Pottier/);
    });

    it('birthCountry', async () => {
      const res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({deathDate: 2020, birthCountry: 'France'})
      expect(res).to.have.status(200);
      expect(res.body.response.persons[0].birth.location.country).to.equal('France');
    });

    it('deathCountry', async () => {
      const res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({deathDate: 2020, deathCountry: 'Argentine'})
      expect(res).to.have.status(200);
      expect(res.body.response.persons[0].death.location.country).to.equal('Argentine');
    });

    it('deathDate', async () => {
      const res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ deathDate: '22/01/2020'})
      expect(res).to.have.status(200);
      expect(res.body.response.persons[0].death.date).to.equal('20200122');
    });

    it('deathDate range', async () => {
      const res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ deathDate: '22/01/2020-30/01/2020'})
      expect(res).to.have.status(200);
      res.body.response.persons.forEach((person: Person) => {
        expect(parseInt(person.death.date, 10)).to.be.within(20200122, 20200130);
      })
    });

    it('birthCity', async () => {
      const res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ deathDate: '2020', birthCity: 'Metz' })
      expect(res).to.have.status(200);
      expect(res.body.response.persons[0].birth.location.city).to.equal('Metz');
    });

    it('deathCity', async () => {
      const res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ deathDate: '2020', deathCity: 'Nice' })
      expect(res).to.have.status(200);
      expect(res.body.response.persons[0].death.location.city).to.equal('Nice');
    });

    it('birthDepartment Code', async () => {
      const res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ deathDate: '2020', birthDepartment: '57' })
      expect(res).to.have.status(200);
      expect(res.body.response.persons[0].birth.location.departmentCode).to.equal('57');
    });

    it('deathDepartment Code', async () => {
      const res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ deathDate: '2020', deathDepartment: '75' })
      expect(res).to.have.status(200);
      expect(res.body.response.persons[0].death.location.departmentCode).to.equal('75');
    });


    it('fuzzy', async () => {
      const res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ deathDate: '2020', firstName: 'Ana', fuzzy: 'false' })
      expect(res).to.have.status(200);
      res.body.response.persons.forEach((person: Person) => {
        expect(person.name.first).to.include('Ana');
      })
    });

    it('fullText', async () => {
      const res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ q: 'Michel Rojo' })
      expect(res).to.have.status(200);
      res.body.response.persons.forEach((person: Person) => {
        expect(person.name.first).to.include('Michel');
      })
    });

    it('empty request', async () => {
      const res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
      expect(res).to.have.status(400);
      expect(res.body.msg).to.include('error');
    });

    it('wrong field', async () => {
      const res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ bob: 'Pop' })
      expect(res).to.have.status(400);
      expect(res.body.msg).to.include('error');
    });

    it('wrong value', async () => {
      const res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ birthDate: 19 })
      expect(res).to.have.status(400);
      res.body.msg.some((msg: string) => {
        expect(msg).to.include('invalid');
      })
    });

    it('simple and complex request', async () => {
      const res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ birthDate: 19, q: 'Georges' })
      expect(res).to.have.status(400);
      expect(res.body.msg).to.include('error - simple and complex request');
    });

    it('deathAge', async () => {
      const res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ deathDate: '2020', deathAge: 20 })
      expect(res).to.have.status(200);
      expect(res.body.response.persons.length).to.be.within(1,20)
    });

    it('sex', async () => {
      const res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ deathDate: '2020', sex: 'M' })
      expect(res).to.have.status(200);
      expect(res.body.response.persons.map((x: Person) => x.sex)).to.not.include(['F'])
    });

    it('sort', async () => {
      const res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ deathDate: '2020', sort: [{sex: 'asc'}] })
      expect(res.body.response.persons.map((x: Person) => x.sex)).to.not.include(['M'])
    });

    it('scroll', async () => {
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

    it('pagination', async () => {
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

     it('inconnu', async () => {
      const res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ firstName: 'Inconnu' })
      expect(res.body.response.total).to.equal(0);
      expect(res.body.response.persons).to.have.lengthOf(0);
    });

    it('text/csv', async () => {
      const res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .set('Accept', 'text/csv')
        .send({ firstName: 'Alban' })
      expect(res).to.have.status(200);
      expect(res.text.split('\n')[0]).to.not.include('scores');
      // remove header and last line
      parseString(res.text, { headers: true, delimiter: ','})
        .on('data', (row: any) => {
          expect(row).to.include.all.keys('name last', 'name first', 'birth city', 'birth cityCode');
          expect(row['birth date']).to.match(/\d{2}\/\d{2}\/\d{4}/);
        })
        .on('end', (rowCount: number) => {
          expect(rowCount).to.eql(totalPersons);
        });
    });

    it('text/csv french header', async () => {
      const res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .set('Accept', 'text/csv')
        .send({ firstName: 'Alban', headerLang: 'french' })
      expect(res).to.have.status(200);
      parseString(res.text, { headers: true, delimiter: ','})
        .on('data', (row: any) => {
          expect(row).to.include.all.keys('nom', 'prénoms', 'sexe', 'date_naissance');
          expect(row.date_naissance).to.match(/\d{2}\/\d{2}\/\d{4}/);
        })
        .on('end', (rowCount: number) => {
          expect(rowCount).to.eql(totalPersons);
        });
    });
  })

  describe('/search/csv Bulk', () => {
    it('delete job', async () => {
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

      while (res.body.status === 'created' || res.body.status === 'waiting' || res.body.msg === 'started') {
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
      expect(res).to.have.status(400);
      expect(res.body).to.have.all.keys('msg');
      expect(res.body.msg).to.have.string('cancelled');
    }).timeout(5000);

    it('run bulk job', async () => {
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

    it('bulk ordered', async () => {
      let res;
      const inputArray = [
        ['Prenom', 'Nom', 'Date', 'Sex'],
        ['jean', 'pierre', '04/08/1933', 'M'],
        ['georges', 'michel', '12/03/1939', 'M']
      ]
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
        .get(`${process.env.BACKEND_PROXY_PATH}/search/csv/${jobId}?order=true`)
      while (res.body.status === 'created' || res.body.status === 'waiting' || res.body.status === 'active') {
        res = await chai.request(app)
          .get(`${process.env.BACKEND_PROXY_PATH}/search/csv/${jobId}?order=true`)
      }
      expect(res).to.have.status(200);
      parseString(res.text, { headers: true})
        .on('data', (row: any) => {
          expect(Object.keys(row).slice(0,8)).to.have.ordered.members(['name.first', 'Prenom', 'name.last', 'Nom', 'birth.date', 'Date', 'sex', 'Sex']);
        })
        .on('end', (rowCount: number) => {
          expect(rowCount).to.eql(inputArray.length - 1);
        });
    });

    it('bulk non ordered', async () => {
      let res;
      const inputArray = [
        ['Prenom', 'Nom', 'Date', 'Sex'],
        ['jean', 'pierre', '04/08/1933', 'M'],
        ['georges', 'michel', '12/03/1939', 'M']
      ]
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
          expect(Object.keys(row).slice(0,8)).to.have.ordered.members(['Prenom', 'Nom', 'Date', 'Sex', 'sourceLineNumber', 'score', 'scores', 'source']);
        })
        .on('end', (rowCount: number) => {
          expect(rowCount).to.eql(inputArray.length - 1);
        });
    });

    it('bad csv format', async () => {
      let res;
      const bufStr = `Prenom,Nom,Date,Sex\n jean,pierre,dupont,04/08/1933,Marseille,M\n georges,michel,john,steven,12/03/1939,M`
      const buf = Buffer.from(bufStr, 'utf8');
      res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search/csv`)
        .field('sep', ',')
        .field('firstName', 'Prenom')
        .field('lastName', 'Nom')
        .field('birthDate', 'Date')
        .attach('csv', buf, 'file.csv')
      const { body : { id: jobId } } = res
      res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search/csv/${jobId}`)
      while (res.body.status === 'created' || res.body.status === 'waiting' || res.body.status === 'active') {
        res = await chai.request(app)
          .get(`${process.env.BACKEND_PROXY_PATH}/search/csv/${jobId}`)
      }
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('msg');
      expect(res.body.msg).to.have.string('column header mismatch');
    });

    it('sex is not filled even when there is no match', async () => {
      let res;
      const inputArray = [
        ['Prenom', 'Nom', 'Date', 'Sexe'],
        ['jean', 'pierre', '04/08/1908', 'M'],
        ['georges', 'michel', '12/03/1903', 'M']
      ]
      const buf = await writeToBuffer(inputArray)
      res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search/csv`)
        .field('sep', ',')
        .field('firstName', 'Prenom')
        .field('lastName', 'Nom')
        .field('birthDate', 'Date')
        .field('sex', 'Sexe')
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
          expect(row).to.have.property('Sexe', 'M');
          if (row.score && row.score.length > 0) {
            expect(row).to.have.property('sex', 'M');
          } else {
            expect(row).to.have.property('sex', '');
            expect(row).to.have.property('birth.date', '');
            expect(row).to.have.property('name.last', '');
          }
        })
        .on('end', (rowCount: number) => {
          expect(rowCount).to.eql(inputArray.length - 1);
        });
    }).timeout(5000);

    it('bulk json output format', async () => {
      let res;
      const inputArray = [
        ['Prenom', 'Nom', 'Date', 'Sexe'],
        ['jean', 'pierre', '04/08/1908', 'M'],
        ['georges', 'michel', '12/03/1903', 'M']
      ]
      const buf = await writeToBuffer(inputArray)
      res = await chai.request(app)
        .post(`${process.env.BACKEND_PROXY_PATH}/search/csv`)
        .field('sep', ',')
        .field('firstName', 'Prenom')
        .field('lastName', 'Nom')
        .field('birthDate', 'Date')
        .field('sex', 'Sexe')
        .attach('csv', buf, 'file.csv')
      const { body : { id: jobId } } = res
      res = await chai.request(app)
        .get(`${process.env.BACKEND_PROXY_PATH}/search/json/${jobId}`)
      while (res.body.status === 'created' || res.body.status === 'waiting' || res.body.status === 'active') {
        res = await chai.request(app)
          .get(`${process.env.BACKEND_PROXY_PATH}/search/json/${jobId}`)
      }
      expect(res).to.have.status(200);
      expect(res.body).to.have.lengthOf(inputArray.length);
    }).timeout(5000);

  })
});
