import { app } from './server';
import { finished } from 'stream';
import { Person } from './models/entities';
import { promisify } from 'util';
import { parseString } from '@fast-csv/parse';
import { writeToBuffer } from '@fast-csv/format';
import fs from "fs";
import request from 'supertest';

const finishedAsync:any = promisify(finished);
const srv = app.listen();
const superApp = request(srv);

describe('index.ts - Express application', () => {
  let totalPersons: number;

  afterAll((done) => {
    srv.close(done);
  })

  it('/healthcheck', async () => {
    const res = await superApp
      .get(`${process.env.BACKEND_PROXY_PATH}/healthcheck`)
      .expect('Content-Type', /json/)
      .expect(200)
    expect(res.body).toHaveProperty('msg', 'OK')
  });

  describe('/search GET', () => {
    it('firstName', async () => {
      const res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({deathDate: 2020, firstName: 'Harry'})
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons[0].name).toHaveProperty('first');
      expect(res.body.response.persons[0].name.first).toContain('Harry');
    });

    it('lastName', async () => {
      const res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({deathDate: 2020, lastName: 'Pottier'})
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons[0].name.last).toEqual(expect.stringMatching(/Pottier/));
    });

    it('birthCountry', async () => {
      const res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({deathDate: 2020, birthCountry: 'France'})
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons[0].birth.location.country).toBe('France');
    });

    it('deathCountry', async () => {
      const res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({deathDate: 2020, deathCountry: 'Argentine'})
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons[0].death.location.country).toBe('Argentine');
    });

    it('birthDate', async () => {
      const res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({deathDate: 2020, birthDate: '23/01/1928'})
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons[0].birth.date).toBe('19280123');
    });

    it('deathDate', async () => {
      const res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ deathDate: '22/01/2020'})
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons[0].death.date).toBe('20200122');
    });

    it('deathDate range', async () => {
      const res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ deathDate: '22/01/2020-30/01/2020'})
        .expect('Content-Type', /json/)
        .expect(200)
      res.body.response.persons.forEach((person: Person) => {
        expect(parseInt(person.death.date, 10)).toBeGreaterThanOrEqual(20200122)
        expect(parseInt(person.death.date, 10)).toBeLessThanOrEqual(20200130);
      })
    });

    it('birthCity', async () => {
      const res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ deathDate: '2020', birthCity: 'Metz' })
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons[0].birth.location.city).toBe('Metz');
    });

    it('deathCity', async () => {
      const res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ deathDate: '2020', deathCity: 'Nice' })
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons[0].death.location.city).toBe('Nice');
    });

    it('birthDepartment Code', async () => {
      const res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ deathDate: '2020', birthDepartment: 57 })
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons[0].birth.location.departmentCode).toBe('57');
    });

    it('deathDepartment Code', async () => {
      const res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ deathDate: '2020', deathDepartment: 75 })
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons[0].death.location.departmentCode).toBe('75');
    });

    it('fuzzy', async () => {
      const res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ deathDate: '2020', firstName: 'Ana', fuzzy: false })
        .expect('Content-Type', /json/)
        .expect(200)
      res.body.response.persons.forEach((person: Person) => {
        expect(person.name.first).toContain('Ana');
      })
    });

    it('fullText', async () => {
      const res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ q: 'Michel Rojo' })
        .expect('Content-Type', /json/)
        .expect(200)
      res.body.response.persons.forEach((person: Person) => {
        expect(person.name.first).toContain('Michel');
      })
    });

    it('empty request', async () => {
      const res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .expect('Content-Type', /json/)
        .expect(400)
      expect(res.body.msg).toContain('error');
    });

    it('wrong field', async () => {
      const res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ bob: 'Pop' })
        .expect('Content-Type', /json/)
        .expect(400)
      expect(res.body.msg).toContain('error');
    });

    it('wrong value', async () => {
      const res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ birthDate: 19 })
        .expect('Content-Type', /json/)
        .expect(400)
      res.body.msg.some((msg: string) => {
        expect(msg).toContain('invalid');
      })
    });

    it('simple and complex request', async () => {
      const res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ birthDate: 19, q: 'Georges' })
        .expect('Content-Type', /json/)
        .expect(400)
      res.body.msg.some((msg: string) => {
        expect(msg).toContain('invalid');
      })
    });

    it('deathAge', async () => {
      const res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ deathDate: '2020', deathAge: 20 })
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons.length).toBeGreaterThanOrEqual(1);
      expect(res.body.response.persons.length).toBeLessThanOrEqual(20);
    });

    it('sex', async () => {
      const res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ deathDate: '2020', sex: 'M' })
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons.map((x: Person) => x.sex)).toEqual(
        expect.not.arrayContaining(['F'])
      );
    });

    it('sort', async () => {
      const res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ deathDate: '2020', sort: '[{\"sex\":\"asc\"}]' })
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons.map((x: Person) => x.sex)).toEqual(
        expect.not.arrayContaining(['M'])
      );
    });

    it('scroll', async () => {
      let res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ firstName: 'Alban', scroll: '1m' })
        .expect('Content-Type', /json/)
        .expect(200)
      totalPersons = res.body.response.persons.length;
      while (res.body.response.persons.length > 0) {
        res = await superApp
          .get(`${process.env.BACKEND_PROXY_PATH}/search`)
          .query({ scroll: '1m', scrollId: res.body.response.scrollId })
          .expect('Content-Type', /json/)
          .expect(200)
        totalPersons += res.body.response.persons.length;
      }
      expect(totalPersons).toBe(res.body.response.total);
    });

    it('pagination', async () => {
      let actualPage = 1;
      let res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ firstName: 'Alban', page: actualPage })
        .expect('Content-Type', /json/)
        .expect(200)
      totalPersons = res.body.response.persons.length;
      while (res.body.response.persons.length > 0) {
        actualPage += 1;
        res = await superApp
          .get(`${process.env.BACKEND_PROXY_PATH}/search`)
          .query({ firstName: 'Alban', page: actualPage })
          .expect('Content-Type', /json/)
          .expect(200)
        totalPersons += res.body.response.persons.length;
      }
      expect(totalPersons).toBe(res.body.response.total);
    });

    it('inconnu', async () => {
      const res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search`)
        .query({ firstName: 'Inconnu' })
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.total).toBe(0);
      expect(res.body.response.persons).toHaveLength(0);
    });

  })

  describe('/search POST', () => {
    it('firstName', async () => {
      const res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({deathDate: 2020, firstName: 'Harry'})
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons[0].name).toHaveProperty('first');
      expect(res.body.response.persons[0].name.first).toContain('Harry');
    });

    it('lastName', async () => {
      const res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({deathDate: 2020, lastName: 'Pottier'})
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons[0].name.last).toEqual(expect.stringMatching(/Pottier/));
    });

    it('birthCountry', async () => {
      const res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({deathDate: 2020, birthCountry: 'France'})
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons[0].birth.location.country).toBe('France');
    });

    it('deathCountry', async () => {
      const res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({deathDate: 2020, deathCountry: 'Argentine'})
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons[0].death.location.country).toBe('Argentine');
    });

    it('birthDate', async () => {
      const res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({deathDate: 2020, birthDate: '23/01/1928'})
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons[0].birth.date).toBe('19280123');
    });

    it('deathDate', async () => {
      const res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ deathDate: '22/01/2020'})
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons[0].death.date).toBe('20200122');
    });

    it('deathDate range', async () => {
      const res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ deathDate: '22/01/2020-30/01/2020'})
        .expect('Content-Type', /json/)
        .expect(200)
      res.body.response.persons.forEach((person: Person) => {
        expect(parseInt(person.death.date, 10)).toBeGreaterThanOrEqual(20200122)
        expect(parseInt(person.death.date, 10)).toBeLessThanOrEqual(20200130);
      })
    });

    it('birthCity', async () => {
      const res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ deathDate: '2020', birthCity: 'Metz' })
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons[0].birth.location.city).toBe('Metz');
    });

    it('deathCity', async () => {
      const res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ deathDate: '2020', deathCity: 'Nice' })
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons[0].death.location.city).toBe('Nice');
    });

    it('birthDepartment Code', async () => {
      const res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ deathDate: '2020', birthDepartment: '57' })
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons[0].birth.location.departmentCode).toBe('57');
    });

    it('deathDepartment Code', async () => {
      const res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ deathDate: '2020', deathDepartment: '75' })
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons[0].death.location.departmentCode).toBe('75');
    });

    it('fuzzy', async () => {
      const res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ deathDate: '2020', firstName: 'Ana', fuzzy: 'false' })
        .expect('Content-Type', /json/)
        .expect(200)
      res.body.response.persons.forEach((person: Person) => {
        expect(person.name.first).toContain('Ana');
      })
    });

    it('fullText', async () => {
      const res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ q: 'Michel Rojo' })
        .expect('Content-Type', /json/)
        .expect(200)
      res.body.response.persons.forEach((person: Person) => {
        expect(person.name.first).toContain('Michel');
      })
    });

    it('empty request', async () => {
      const res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .expect('Content-Type', /json/)
        .expect(400)
      expect(res.body.msg).toContain('error');
    });

    it('wrong field', async () => {
      const res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ bob: 'Pop' })
        .expect('Content-Type', /json/)
        .expect(400)
      expect(res.body.msg).toContain('error');
    });

    it('wrong value', async () => {
      const res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ birthDate: 19 })
        .expect('Content-Type', /json/)
        .expect(400)
      res.body.msg.some((msg: string) => {
        expect(msg).toContain('invalid');
      })
    });

    it('simple and complex request', async () => {
      const res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ birthDate: 19, q: 'Georges' })
        .expect('Content-Type', /json/)
        .expect(400)
      expect(res.body.msg).toContain('error - simple and complex request');
    });

    it('deathAge', async () => {
      const res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ deathDate: '2020', deathAge: 20 })
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons.length).toBeGreaterThanOrEqual(1);
      expect(res.body.response.persons.length).toBeLessThanOrEqual(20);
    });

    it('sex', async () => {
      const res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ deathDate: '2020', sex: 'M' })
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons.map((x: Person) => x.sex)).toEqual(
        expect.not.arrayContaining(['F'])
      );
    });

    it('sort', async () => {
      const res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ deathDate: '2020', sort: [{sex: 'asc'}] })
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.persons.map((x: Person) => x.sex)).toEqual(
        expect.not.arrayContaining(['M'])
      );
    });

    it('scroll', async () => {
      let res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ firstName: 'Alban', scroll: '1m' })
        .expect('Content-Type', /json/)
        .expect(200)
      totalPersons = res.body.response.persons.length;
      while (res.body.response.persons.length > 0) {
        res = await superApp
          .post(`${process.env.BACKEND_PROXY_PATH}/search`)
          .send({ scroll: '1m', scrollId: res.body.response.scrollId })
          .expect('Content-Type', /json/)
          .expect(200)
        totalPersons += res.body.response.persons.length;
      }
      expect(totalPersons).toBe(res.body.response.total);
    });

    it('pagination', async () => {
      let actualPage = 1;
      let res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ firstName: 'Alban', page: actualPage })
        .expect('Content-Type', /json/)
        .expect(200)
      totalPersons = res.body.response.persons.length;
      while (res.body.response.persons.length > 0) {
        actualPage += 1;
        res = await superApp
          .post(`${process.env.BACKEND_PROXY_PATH}/search`)
          .send({ firstName: 'Alban', page: actualPage })
          .expect('Content-Type', /json/)
          .expect(200)
        totalPersons += res.body.response.persons.length;
      }
      expect(totalPersons).toBe(res.body.response.total);
    });

    it('inconnu', async () => {
      const res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .send({ firstName: 'Inconnu' })
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.response.total).toBe(0);
      expect(res.body.response.persons).toHaveLength(0);
    });

    it('text/csv', async () => {
      const res = await superApp
        .post(`${process.env.BACKEND_PROXY_PATH}/search`)
        .set('Accept', 'text/csv')
        .send({ firstName: 'Alban' })
        .expect('Content-Type', /text\/csv/)
        .expect(200)
      // remove header
      expect(res.text.split('\n').length).toBe(totalPersons + 1);
    });
  })

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

    res = await superApp
      .post(`${process.env.BACKEND_PROXY_PATH}/search/csv`)
      .field('sep', ';')
      .field('firstName', 'Prenom')
      .field('lastName', 'Nom')
      .field('birthDate', 'Date')
      .field('chunkSize', 20)
      .attach('csv', buf, 'file.csv')
      .expect(200)
    expect(res.body).toHaveProperty('msg', 'started')
    const { body : { id: jobId } } = res

    while (res.body.status === 'created' || res.body.status === 'waiting' || res.body.msg === 'started' ) {
      res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search/csv/${jobId}`)
        .expect(200)
    }
    res = await superApp
      .delete(`${process.env.BACKEND_PROXY_PATH}/search/csv/${jobId}`)
      .expect(200)
    expect(res.body).toHaveProperty('msg', expect.stringMatching(/cancelled/));
    res = await superApp
      .get(`${process.env.BACKEND_PROXY_PATH}/search/csv/${jobId}`)
      .expect(200)
    while (res.body.status === 'created' || res.body.status === 'waiting' || res.body.status === 'active' || res.body.msg === 'started') {
      res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search/csv/${jobId}`)
        .expect(200)
    }
    expect(res.body).toHaveProperty('msg', expect.stringMatching(/cancelled/));
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

    res = await superApp
      .post(`${process.env.BACKEND_PROXY_PATH}/search/csv`)
      .field('sep', ';')
      .field('firstName', 'Prenom')
      .field('lastName', 'Nom')
      .field('birthDate', 'Date')
      .field('chunkSize', 20)
      .attach('csv', buf, 'file.csv')
      .expect(200)
    expect(res.body).toHaveProperty('msg', 'started')
    const { body : { id: jobId } } = res

    while (res.body.status === 'created' || res.body.status === 'waiting' || res.body.status === 'active' || res.body.msg === 'started') {
      res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search/csv/${jobId}`)
        .expect(200)
    }
    res = await superApp
      .get(`${process.env.BACKEND_PROXY_PATH}/search/csv/${jobId}`)
      .expect(200)
    parseString(res.text, { headers: true, delimiter: ';'})
      .on('data', (row: any) => {
        expect(row).toMatchObject({
          Date: expect.any(String),
          Prenom: expect.any(String),
          Nom: expect.any(String),
        });
      })
      .on('end', (rowCount: number) => {
        expect(rowCount).toBe(nrows - 1);
      });
  });

  it('/search/csv/ - bulk ordered', async () => {
    let res;
    const inputArray = [{firstName: 'Prenom', lastName: 'Nom', birthDate: 'Date', sex: 'Sex'},{firstName: 'jean', lastName: 'pierre', birthDate: '04/08/1933', sex: 'M'}, {firstName: 'georges', lastName: 'michel', birthDate: '12/03/1939', sex: 'M'}]
    const buf = await writeToBuffer(inputArray)
    res = await superApp
      .post(`${process.env.BACKEND_PROXY_PATH}/search/csv`)
      .field('sep', ',')
      .field('firstName', 'Prenom')
      .field('lastName', 'Nom')
      .field('birthDate', 'Date')
      .field('sex', 'Sex')
      .attach('csv', buf, 'file.csv')
      .expect(200)
    expect(res.body).toHaveProperty('msg', 'started')
    const { body : { id: jobId } } = res
    res = await superApp
      .get(`${process.env.BACKEND_PROXY_PATH}/search/csv/${jobId}`)
    while (res.body.status === 'created' || res.body.status === 'waiting' || res.body.status === 'active') {
      res = await superApp
        .get(`${process.env.BACKEND_PROXY_PATH}/search/csv/${jobId}`)
        .expect(200)
    }
    parseString(res.text, { headers: true})
      .on('data', (row: any) => {
        expect(Object.keys(row).slice(0,8)).toEqual(['name.first', 'Prenom', 'name.last', 'Nom', 'birth.date', 'Date', 'sex', 'Sex']);
      })
      .on('end', (rowCount: number) => {
        expect(rowCount).toBe(inputArray.length - 1);
      });
  });
});
