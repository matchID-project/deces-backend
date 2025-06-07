import { app } from './server';
import { finished } from 'stream';
import { Person } from './models/entities';
import { promisify } from 'util';
import { parseString } from '@fast-csv/parse';
import { writeToBuffer } from '@fast-csv/format';
import fs from "fs";
import { describe, expect, it, test } from 'vitest'
import supertest from 'supertest';
const server = supertest(app)
const finishedAsync:any = promisify(finished);

const csv2Buffer = async (filePath: string, nrows: number) => {
  let data = '';
  let index: number;
  const readStream: any = fs.createReadStream(filePath,  {encoding: 'utf8'})
  readStream
    .on('data', (chunk: string) => {
      index = chunk.indexOf('\n');
      data += chunk;
      // if (index > 10) {
      //   readStream.close()
      // }
    })
  await finishedAsync(readStream, {}).catch(() => {
    // do nothing: closed stream
  });
  return Buffer.from(data.split('\n').slice(0, nrows).join('\n'), 'utf8');
}

describe('server.ts - Express application', () => {
  let totalPersons: number;
  const apiPath = (api: string): string => {
    return `${process.env.BACKEND_PROXY_PATH}/${api}`
  };

  it('/healthcheck', async () => {
    const res = await server// .get(app)
      .get(apiPath('healthcheck'))
    expect(res.status).toBe(200);
    expect(res.body.msg).toEqual("OK");
  });

  describe('/id/{id}', () => {
    it('search', async () => {
      let res = await server
        .get(apiPath('search'))
        .query({q: 'Georges Duboeuf'})
      const { id }: { id: string } = res.body.response.persons[0];
      res = await server
        .get(apiPath(`id/${id}`))
      expect(res.status).toBe(200);
      expect(res.body.response.persons[0].name.first).to.include('Georges');
      expect(res.body.response.persons[0].id).to.eql('VhfumwT3QnUq');
      expect(res.body.response.persons[0].links.wikidata).to.include('Q3102639');
    });

    it('update', async () => {
      const token = await server
        .post(apiPath(`auth`))
        .send({user:'user1@gmail.com', password: 'magicPass'})
      const buf = Buffer.from('weird pdf', 'base64')
      const res = await server
        .post(apiPath(`id/VhfumwT3QnUq`))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
        .field('author_id', 'Ked3oh@oPho3m.com')
        .field('lastName', 'Aiph7u')
        .attach('pdf', buf, 'file.pdf')
      expect(res.status).toBe(200);
      expect(res.body.msg).to.equal('Update stored');
    });
  })

  describe('/queue', () => {
    it('/queue/jobs with good token', async () => {
      const token = await server
        .post(apiPath(`auth`))
        .send({user: process.env.BACKEND_TOKEN_USER, password: process.env.BACKEND_TOKEN_PASSWORD})
      const res = await server
        .get(apiPath('queue/jobs?jobsType=delayed'))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
      expect(res.status).toBe(200);
      expect(res.body.jobs.length).to.eql(0);
    });

    it('/queue/jobs with wrong token', async () => {
      const res = await server
        .get(apiPath(`queue/jobs?jobsType=stalled`))
        .set('Authorization', 'Wrong username or password')
      expect(res.status).toBe(422);
      expect(res.body.message).to.eql("jwt malformed");
    });

    it('/queue/jobs query missing token', async () => {
      const res = await server
        .get(apiPath(`queue/jobs?jobsType=failed`))
      expect(res.status).toBe(422);
      expect(res.body.message).to.eql("No token provided");
    });
  })

  describe('/auth', () => {
    it('good password authentification', async () => {
      const token = await server
        .post(apiPath(`auth`))
        .send({user: process.env.BACKEND_TOKEN_USER, password: process.env.BACKEND_TOKEN_PASSWORD})
      expect(token.status).toBe(200);
      expect(token.body).to.include.all.keys('access_token');
    });

    it('wrong password authentification', async () => {
      const res = await server
        .post(apiPath(`auth`))
        .send({user: 'anyone', password: 'wrong_password'})
      expect(res.status).toBe(401);
      expect(res.body.msg).to.include('Wrong username or password');
    });

    it('token details', async () => {
      const token = await server
        .post(apiPath(`auth`))
        .send({user:'user1@gmail.com', password: 'magicPass'})
      expect(token.status).toBe(200);
      expect(token.body).to.include.all.keys('access_token');
      const res = await server
        .get(apiPath('auth'))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
      expect(res.status).toBe(200);
      expect(res.body).to.include.all.keys(['msg', 'expiration_date']);
    });

    it('refresh token', async () => {
      const token = await server
        .post(apiPath(`auth`))
        .send({user:'user1@gmail.com', password: 'magicPass'})
      expect(token.status).toBe(200);
      expect(token.body).to.include.all.keys('access_token');
      const tokenVerify = await server
        .get(apiPath('auth'))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
      expect(tokenVerify.status).toBe(200);
      expect(tokenVerify.body).to.include.all.keys(['msg', 'expiration_date']);
      const promise = new Promise(( resolve: any, reject ) => {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout( async () => {
          try {
            const refreshToken = await server
              .get(apiPath(`auth`))
              .query({refresh: true })
              .set('Authorization', `Bearer ${token.body.access_token as string}`)
            expect(refreshToken.status).toBe(422);
            expect(refreshToken.body.msg).to.include('Auth0');
          } catch (e) {
            reject(e)
          }
          resolve()
        }, 3000 );
      });
      await promise
    }, 10000);
  })

  const testFixtures = [
    {params: {deathDate: 2020, firstName: 'Harry'}, testFunc: (res: any) => {
      expect(res.body.response.persons[0].name.first).to.include('Harry');
    }},
    {params: {deathDate: 2020, lastName: 'Pottier'}, testFunc: (res: any) => {
      expect(res.body.response.persons[0].name.last).to.include('Pottier');
    }},
    {params: {deathDate: 2020, birthCountry: 'France'}, testFunc: (res: any) => {
      expect(res.body.response.persons[0].birth.location.country).to.equal('France');
    }},
    {params: {deathDate: 2020, deathCountry: 'Argentine'}, testFunc: (res: any) => {
      expect(res.body.response.persons[0].death.location.country).to.equal('Argentine');
    }},
    {params: {deathDate: 2020, birthDate: '23/01/1928'}, testFunc: (res: any) => {
      expect('19280123').to.be.oneOf([res.body.response.persons[0].birth.date, res.body.response.persons[1].birth.date]);
    }},
    {params: {deathDate: '22/01/2020'}, testFunc: (res: any) => {
      expect(res.body.response.persons[0].death.date).to.equal('20200122');
    }},
    {params: {deathDate: '22/01/2020-30/01/2020'}, testFunc: (res: any) => {
      res.body.response.persons.forEach((person: Person) => {
        expect(parseInt(person.death.date, 10)).to.be.within(20200122, 20200130);
      })
    }},
    {params: {deathDate: 2020, birthCity: 'Metz'}, testFunc: (res: any) => {
      expect(res.body.response.persons[0].birth.location.city).to.equal('Metz');
    }},
    {params: {deathDate: 2020, deathCity: 'Nice'}, testFunc: (res: any) => {
      expect(res.body.response.persons[0].death.location.city).to.equal('Nice');
    }},
    {params: {deathDate: 2020, birthDepartment: 57}, testFunc: (res: any) => {
      expect(res.body.response.persons[0].birth.location.departmentCode).to.equal('57');
    }},
    {params: {deathDate: 2020, birthDepartment: '94'}, testFunc: (res: any) => {
      expect(res.body.response.persons[0].birth.location.departmentCode).to.equal('94');
    }},
    {params: {deathDate: 2020, deathDepartment: 75}, testFunc: (res: any) => {
      expect(res.body.response.persons[0].death.location.departmentCode).to.equal('75');
    }},
    {params: {deathDate: 2020, firstName: 'Ana', fuzzy: false}, testFunc: (res: any) => {
      res.body.response.persons.forEach((person: Person) => {
        expect(person.name.first).to.include('Ana');
      })
    }},
    {params: {deathDate: 2020, firstName: 'Mathieu', fuzzy: 'false'}, testFunc: (res: any) => {
      res.body.response.persons.forEach((person: Person) => {
        expect(person.name.first).to.include('Mathieu');
      })
    }},
    {params: {q: 'Michel Rojo'}, testFunc: (res: any) => {
      res.body.response.persons.forEach((person: Person) => {
        expect(person.name.first).to.include('Michel');
      })
    }},
    {params: {}, testFunc: (res: any) => {
      expect(res.body.msg).to.include('error');
    }, status: 400},
    {params: { bob: 'Pop' }, testFunc: (res: any) => {
      expect(res.body.msg).to.include('error');
    }, status: 400},
    {params: { birthDate: 19 }, testFunc: (res: any) => {
      res.body.msg.some((msg: string) => {
        expect(msg).to.include('invalid');
      })
    }, status: 400},
    {params: { birthDate: '1920', q: 'Georges' }, testFunc: (res: any) => {
      expect(res.body.msg).to.include('error - simple and complex request');
    }, status: 400},
    {params: { deathDate: '2020', deathAge: 20 }, testFunc: (res: any) => {
      expect(res.body.response.persons).to.have.lengthOf.within(1, 20);
    }},
    {params: { deathDate: '2020', sex: 'M' }, testFunc: (res: any) => {
      expect(res.body.response.persons.map((x: Person) => x.sex)).to.not.include('F');
    }},
    {params: { deathDate: '2020', sort: '[{\"sex\":\"asc\"}]' }, testFunc: (res: any) => {
      expect(res.body.response.persons.map((x: Person) => x.sex)).to.not.include('M');
    }},
    {params: { deathDate: '2020', sort: '[{\"firstName\":\"asc\"}]' }, testFunc: (res: any) => {
      const firstNames = res.body.response.persons.map((person: Person) => person.name.first)
      expect(firstNames).to.have.ordered.members(firstNames.sort());
    }},
    {params: { firstName: 'Inconnu' }, testFunc: (res: any) => {
      expect(res.body.response.persons).to.have.lengthOf(0);
    }}
  ];

  describe('/search GET', () => {
    testFixtures.forEach((testFixture) => {
      it(`${Object.entries(testFixture.params).join(" ")}`, async () => {
        const res = await server
          .get(apiPath('search'))
          .query(testFixture.params)
        expect(res.status).toBe(testFixture.status ? testFixture.status : 200);
        if (testFixture.testFunc) {
          testFixture.testFunc(res)
        }
      });
    });

    it('scroll', async () => {
      let res = await server
        .get(apiPath('search'))
        .query({ firstName: 'Alban', scroll: '1m' })
      expect(res.status).toBe(200);
      totalPersons = res.body.response.persons.length;
      while (res.body.response.persons.length > 0) {
        res = await server
          .get(apiPath('search'))
          .query({ scroll: '1m', scrollId: res.body.response.scrollId })
        expect(res.status).toBe(200);
        totalPersons += res.body.response.persons.length;
      }
      expect(totalPersons).to.equal(res.body.response.total);
    });

    it('pagination', async () => {
      let actualPage = 1;
      let res = await server
        .get(apiPath('search'))
        .query({ firstName: 'Alban', page: actualPage })
      expect(res.status).toBe(200);
      totalPersons = res.body.response.persons.length;
      while (res.body.response.persons.length > 0) {
        actualPage += 1;
        res = await server
          .get(apiPath('search'))
          .query({ firstName: 'Alban', page: actualPage })
        expect(res.status).toBe(200);
        totalPersons += res.body.response.persons.length;
      }
      expect(totalPersons).to.equal(res.body.response.total);
    });

  })


  describe('/search POST', () => {
    testFixtures.forEach((testFixture) => {
      it(`${Object.entries(testFixture.params).join(" ")}`, async () => {
        const res = await server
          .post(apiPath('search'))
          .send(testFixture.params)
        expect(res.status).toBe(testFixture.status ? testFixture.status : 200);
        if (testFixture.testFunc) {
          testFixture.testFunc(res)
        }
      });
    });

    it('sort as an object', async () => {
      const res = await server
        .post(apiPath('search'))
        .send({ deathDate: '2020', sort: [{sex: 'asc'}] })
      expect(res.body.response.persons.map((x: Person) => x.sex)).to.not.include(['M'])
    });

    it('scroll', async () => {
      let res = await server
        .post(apiPath('search'))
        .send({ firstName: 'Alban', scroll: '1m' })
      totalPersons = res.body.response.persons.length;
      while (res.body.response.persons.length > 0) {
        res = await server
          .post(apiPath('search'))
          .send({ scroll: '1m', scrollId: res.body.response.scrollId })
        totalPersons += res.body.response.persons.length;
      }
      expect(res.status).toBe(200);
      expect(totalPersons).to.eql(res.body.response.total);
    });

    it('pagination', async () => {
      let actualPage = 1;
      let res = await server
        .post(apiPath('search'))
        .send({ firstName: 'Alban', page: actualPage })
      totalPersons = res.body.response.persons.length;
      while (res.body.response.persons.length > 0) {
        actualPage += 1;
        res = await server
          .post(apiPath('search'))
          .send({ firstName: 'Alban', page: actualPage })
        totalPersons += res.body.response.persons.length;
      }
      expect(res.status).toBe(200);
      expect(totalPersons).to.eql(res.body.response.total);
    });

    it('text/csv', async () => {
      const res = await server
        .post(apiPath('search'))
        .set('Accept', 'text/csv')
        .send({ firstName: 'Alban' })
      expect(res.status).toBe(200);
      expect(res.text.split('\n')[0]).to.not.include('scores');
      // remove header and last line
      parseString(res.text, { headers: true, delimiter: ','})
        .on('data', (row: any) => {
          expect(row).to.include.all.keys('name last', 'name first', 'birth city', 'birth code');
          expect(row['birth date']).to.match(/\d{2}\/\d{2}\/\d{4}/);
        })
        .on('end', (rowCount: number) => {
          expect(rowCount).to.eql(totalPersons);
        });
    });

    it('text/csv french header', async () => {
      const res = await server
        .post(apiPath('search'))
        .set('Accept', 'text/csv')
        .send({ firstName: 'Alban', headerLang: 'french' })
      expect(res.status).toBe(200);
      parseString(res.text, { headers: true, delimiter: ','})
        .on('data', (row: any) => {
          expect(row).to.include.all.keys(
            'nom', 'prénoms', 'sexe', 'date_naissance', 'commune_naissance',
            'code_INSEE_naissance', 'département_naissance', 'pays_naissance',
            'pays_ISO_naissance', 'latitude_naissance', 'longitude_naissance',
            'id_certificat', 'age_décès', 'date_décès', 'commune_décès',
            'code_INSEE_décès', 'département_décès', 'pays_décès',
            'pays_ISO_décès', 'latitude_décès', 'longitude_décès', 'source_INSEE'
          );
          expect(row.date_naissance).to.match(/\d{2}\/\d{2}\/\d{4}/);
        })
        .on('end', (rowCount: number) => {
          expect(rowCount).to.eql(totalPersons);
        });
    });
  })

  describe.sequential('/search/csv Bulk', () => {
    test.sequential('delete job', async () => {
      let res;
      const token = await server
        .post(apiPath(`auth`))
        .send({user:'user1@gmail.com', password: 'magicPass'})

      const buf  = await csv2Buffer('/deces-backend/tests/clients_test.csv', 5000)
      res = await server
        .post(apiPath('search/csv'))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
        .field('sep', ';')
        .field('firstName', 'Prenom')
        .field('lastName', 'Nom')
        .field('birthDate', 'Date')
        .field('chunkSize', 20)
        .attach('csv', buf, 'file.csv')
      const { body : { id: jobId } }: { body: { id: string} } = res

      while (res.body.status === 'created' || res.body.status === 'wait' || res.body.msg === 'started') {
        res = await server
          .get(apiPath(`search/csv/${jobId}`))
          .set('Authorization', `Bearer ${token.body.access_token as string}`)
        }
      res = await server
        .delete(apiPath(`search/csv/${jobId}`))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
      expect(res.status).toBe(200);
      expect(res.body).to.have.all.keys('msg');
      expect(res.body.msg).to.have.string('cancelled');
      res = await server
         .get(apiPath(`search/csv/${jobId}`))
         .set('Authorization', `Bearer ${token.body.access_token as string}`)
         while (res.body.status === 'created' || res.body.status === 'wait' || res.body.status === 'active' || res.body.msg === 'started') {
        res = await server
          .get(apiPath(`search/csv/${jobId}`))
          .set('Authorization', `Bearer ${token.body.access_token as string}`)
        }
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('msg');
      expect(res.body.msg).to.have.string('cancelled');
    }, 5000);

    test.sequential('run bulk job', async () => {
      let res;
      const nrows = 100;
      const token = await server
        .post(apiPath(`auth`))
        .send({user:'user1@gmail.com', password: 'magicPass'})

      const buf = await csv2Buffer('/deces-backend/tests/clients_test.csv', nrows);
      res = await server
        .post(apiPath('search/csv'))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
        .field('sep', ';')
        .field('firstName', 'Prenom')
        .field('lastName', 'Nom')
        .field('birthDate', 'Date')
        .field('chunkSize', 20)
        .attach('csv', buf, 'file.csv')
      const { body : { id: jobId } }: { body: { id: string} } = res

      while (res.body.status === 'created' || res.body.status === 'wait' || res.body.status === 'active' || res.body.msg === 'started') {
        res = await server
          .get(apiPath(`search/csv/${jobId}`))
          .set('Authorization', `Bearer ${token.body.access_token as string}`)
        }
      res = await server
        .get(apiPath(`search/csv/${jobId}`))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
      parseString(res.text, { headers: true, delimiter: ';'})
        .on('data', (row: any) => {
          expect(row).to.include.all.keys('Prenom', 'name.first', 'Nom', 'name.last');
        })
        .on('end', (rowCount: number) => {
          expect(rowCount).to.eql(nrows - 1);
        });

      // verify that chunks info has been deleted
      res = await server
        .get(apiPath('queue?name=chunks'))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
      Object.values(res.body).forEach(jobType => {
        expect(jobType).toEqual(0);
      })

      // verify that crypted files are deleted ater timeout
      await new Promise(resolve => setTimeout(resolve, Number(process.env.BACKEND_TMPFILE_PERSISTENCE || "3000")));
      setTimeout(() => {
        fs.readdirSync("./").forEach(file => {
          expect(file).to.not.include('.enc');
        });
      }, Number(process.env.BACKEND_TMPFILE_PERSISTENCE || "3000"))
    }, 10000);

    test.sequential('bulk ordered', async () => {
      let res;
      const inputArray = [
        ['Prenom', 'Nom', 'Date', 'Sex'],
        ['jean', 'pierre', '04/08/1933', 'M'],
        ['georges', 'michel', '12/03/1939', 'M']
      ]
      const buf = await writeToBuffer(inputArray)
      const token = await server
        .post(apiPath(`auth`))
        .send({user:'user1@gmail.com', password: 'magicPass'})
      res = await server
        .post(apiPath('search/csv'))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
        .field('sep', ',')
        .field('firstName', 'Prenom')
        .field('lastName', 'Nom')
        .field('birthDate', 'Date')
        .field('sex', 'Sex')
        .attach('csv', buf, 'file.csv')
      const { body : { id: jobId } }: { body: { id: string} } = res
      res = await server
        .get(apiPath(`search/csv/${jobId}?order=true`))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
      while (res.body.status === 'created' || res.body.status === 'wait' || res.body.status === 'active') {
        res = await server
          .get(apiPath(`search/csv/${jobId}?order=true`))
          .set('Authorization', `Bearer ${token.body.access_token as string}`)
        }
      expect(res.status).toBe(200);
      parseString(res.text, { headers: true})
        .on('data', (row: any) => {
          expect(Object.keys(row).slice(0,8)).to.have.ordered.members(['name.first', 'Prenom', 'name.last', 'Nom', 'birth.date', 'Date', 'sex', 'Sex']);
        })
        .on('end', (rowCount: number) => {
          expect(rowCount).to.eql(inputArray.length - 1);
        });
    });

    test.sequential('bulk non ordered', async () => {
      let res;
      const inputArray = [
        ['Prenom', 'Nom', 'Date', 'Sex'],
        ['jean', 'pierre', '04/08/1933', 'M'],
        ['georges', 'michel', '12/03/1939', 'M']
      ]
      const buf = await writeToBuffer(inputArray)
      const token = await server
        .post(apiPath(`auth`))
        .send({user:'user1@gmail.com', password: 'magicPass'})
      res = await server
        .post(apiPath('search/csv'))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
        .field('sep', ',')
        .field('firstName', 'Prenom')
        .field('lastName', 'Nom')
        .field('birthDate', 'Date')
        .field('sex', 'Sex')
        .attach('csv', buf, 'file.csv')
      const { body : { id: jobId } }: { body: { id: string} } = res
      res = await server
        .get(apiPath(`search/csv/${jobId}`))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
      while (res.body.status === 'created' || res.body.status === 'wait' || res.body.status === 'active') {
        res = await server
          .get(apiPath(`search/csv/${jobId}`))
          .set('Authorization', `Bearer ${token.body.access_token as string}`)
        }
      expect(res.status).toBe(200);
      parseString(res.text, { headers: true})
        .on('data', (row: any) => {
          expect(Object.keys(row).slice(0,8)).to.have.ordered.members(['Prenom', 'Nom', 'Date', 'Sex', 'sourceLineNumber', 'score', 'scores', 'source']);
        })
        .on('end', (rowCount: number) => {
          expect(rowCount).to.eql(inputArray.length - 1);
        });
    });

    test.sequential('bad csv format', async () => {
      let res;
      const bufStr = `Prenom,Nom,Date,Sex\n jean,pierre,dupont,04/08/1933,Marseille,M\n georges,michel,john,steven,12/03/1939,M`
      const buf = Buffer.from(bufStr, 'utf8');
      const token = await server
        .post(apiPath(`auth`))
        .send({user:'user1@gmail.com', password: 'magicPass'})
      res = await server
        .post(apiPath('search/csv'))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
        .field('sep', ',')
        .field('firstName', 'Prenom')
        .field('lastName', 'Nom')
        .field('birthDate', 'Date')
        .attach('csv', buf, 'file.csv')
      const { body : { id: jobId } }: { body: { id: string} } = res
      res = await server
        .get(apiPath(`search/csv/${jobId}`))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
      while (res.body.status === 'created' || res.body.status === 'wait' || res.body.status === 'active') {
        res = await server
          .get(apiPath(`search/csv/${jobId}`))
          .set('Authorization', `Bearer ${token.body.access_token as string}`)
        }
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('msg');
      expect(res.body.msg).to.have.string('column header mismatch');
    });

    test.sequential('sex is not filled even when there is no match', async () => {
      let res;
      const inputArray = [
        ['Prenom', 'Nom', 'Date', 'Sexe'],
        ['jean', 'pierre', '04/08/1908', 'M'],
        ['georges', 'michel', '12/03/1903', 'M']
      ]
      const buf = await writeToBuffer(inputArray)
      const token = await server
        .post(apiPath(`auth`))
        .send({user:'user1@gmail.com', password: 'magicPass'})
      res = await server
        .post(apiPath('search/csv'))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
        .field('sep', ',')
        .field('firstName', 'Prenom')
        .field('lastName', 'Nom')
        .field('birthDate', 'Date')
        .field('sex', 'Sexe')
        .attach('csv', buf, 'file.csv')
      const { body : { id: jobId } }: { body: { id: string} } = res
      res = await server
        .get(apiPath(`search/csv/${jobId}`))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
      while (res.body.status === 'created' || res.body.status === 'wait' || res.body.status === 'active') {
        res = await server
          .get(apiPath(`search/csv/${jobId}`))
          .set('Authorization', `Bearer ${token.body.access_token as string}`)
        }
      expect(res.status).toBe(200);
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
    }, 5000);

    test.sequential('bulk json output format', async () => {
      let res;
      const inputArray = [
        ['Prenom', 'Nom', 'Date', 'Sexe'],
        ['jean', 'pierre', '04/08/1908', 'M'],
        ['georges', 'michel', '12/03/1903', 'M']
      ]
      const buf = await writeToBuffer(inputArray)
      const token = await server
        .post(apiPath(`auth`))
        .send({user:'user1@gmail.com', password: 'magicPass'})
      res = await server
        .post(apiPath('search/csv'))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
        .field('sep', ',')
        .field('firstName', 'Prenom')
        .field('lastName', 'Nom')
        .field('birthDate', 'Date')
        .field('sex', 'Sexe')
        .attach('csv', buf, 'file.csv')
      const { body : { id: jobId } }: { body: { id: string} } = res
      res = await server
        .get(apiPath(`search/json/${jobId}`))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
      while (res.body.status === 'created' || res.body.status === 'wait' || res.body.status === 'active') {
        res = await server
          .get(apiPath(`search/json/${jobId}`))
          .set('Authorization', `Bearer ${token.body.access_token as string}`)
        }
      expect(res.status).toBe(200);
      expect(res.body).to.have.lengthOf(inputArray.length);
    }, 5000);

    test.sequential('bulk customize pruneScore', async () => {
      let res;
      const inputArray = [
        ['Prenom', 'Nom', 'Date', 'Sexe'],
        ['jean', 'pierre', '04/08/1908', 'M'],
        ['georges', 'michel', '12/03/1903', 'M']
      ]
      const buf = await writeToBuffer(inputArray)
      const token = await server
        .post(apiPath(`auth`))
        .send({user:'user1@gmail.com', password: 'magicPass'})
      res = await server
        .post(apiPath('search/csv'))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
        .field('sep', ',')
        .field('firstName', 'Prenom')
        .field('lastName', 'Nom')
        .field('pruneScore', '0.1')
        .field('candidateNumber', '5')
        .attach('csv', buf, 'file.csv')
      const { body : { id: jobId } }: { body: { id: string} } = res
      res = await server
        .get(apiPath(`search/json/${jobId}`))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
      while (res.body.status === 'created' || res.body.status === 'wait' || res.body.status === 'active') {
        res = await server
          .get(apiPath(`search/json/${jobId}`))
          .set('Authorization', `Bearer ${token.body.access_token as string}`)
        }
      expect(res.status).toBe(200);
      const source1 = res.body
        .filter((x:any) => x.metadata && x.metadata.sourceLineNumber && x.metadata.sourceLineNumber === 1 )
      const source2 = res.body
        .filter((x:any) => x.metadata && x.metadata.sourceLineNumber && x.metadata.sourceLineNumber === 2 )
      expect(source1.length).to.above(1); // there are 2 "exact" matches for 'jean', 'pierre', '04/08/1908', 'M'
      expect(source2.length).to.above(0); // there is 1 "exact" match 'georges', 'michel', '12/03/1903', 'M'
    }, 5000);

    test.sequential('bulk skip lines', async () => {
      let res;
      const skipLines = 3
      const inputArray = [
        ['Dirty Line 1'],
        ['Dirty Line 2'],
        ['Dirty Line 3'],
        ['Prenom', 'Nom', 'Date', 'Sexe'],
        ['jean', 'pierre', '04/08/1908', 'M'],
        ['georges', 'michel', '12/03/1903', 'M']
      ]
      const buf = await writeToBuffer(inputArray)
      const token = await server
        .post(apiPath(`auth`))
        .send({user:'user1@gmail.com', password: 'magicPass'})
      res = await server
        .post(apiPath('search/csv'))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
        .field('sep', ',')
        .field('firstName', 'Prenom')
        .field('lastName', 'Nom')
        .field('skipLines', skipLines)
        .attach('csv', buf, 'file.csv')
      const { body : { id: jobId } }: { body: { id: string} } = res
      res = await server
        .get(apiPath(`search/json/${jobId}`))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
      while (res.body.status === 'created' || res.body.status === 'wait' || res.body.status === 'active') {
        res = await server
          .get(apiPath(`search/json/${jobId}`))
          .set('Authorization', `Bearer ${token.body.access_token as string}`)
        }
      expect(res.status).toBe(200);
      expect(res.body).to.have.lengthOf(inputArray.length - skipLines);
    }, 5000);


    test.sequential('birthCity in communes dictionary', async () => {
      let res;
      const inputArray = [
        ['Prenom', 'Nom', 'Commune'],
        ['jean', 'martin', 'La Londe'],
      ]
      const buf = await writeToBuffer(inputArray)
      const token = await server
        .post(apiPath(`auth`))
        .send({user:'user1@gmail.com', password: 'magicPass'})
      res = await server
        .post(apiPath('search/csv'))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
        .field('sep', ',')
        .field('firstName', 'Prenom')
        .field('lastName', 'Nom')
        .field('birthCity', 'Commune')
        .attach('csv', buf, 'file.csv')
      const { body : { id: jobId } }: { body: { id: string} } = res
      res = await server
        .get(apiPath(`search/csv/${jobId}`))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
      while (res.body.status === 'created' || res.body.status === 'wait' || res.body.status === 'active') {
        res = await server
          .get(apiPath(`search/csv/${jobId}`))
          .set('Authorization', `Bearer ${token.body.access_token as string}`)
        }
      expect(res.status).toBe(200);
      parseString(res.text, { headers: true})
        .on('data', (row: any) => {
          expect(row).to.have.property('birth.city', 'Elbeuf');
        })
        .on('end', (rowCount: number) => {
          expect(rowCount).to.eql(inputArray.length - 1);
        });
    }, 5000);

    test.sequential('files without \n (only \r)', async () => {
      let res;
      const inputString = "Nom;Prenoms;Date \rFLOCH;Marie Anne;01/01/1919 \rFLOCH;Francois;01/01/1919 \r BRIANT;Joseph;01/01/1919"
      const buf: any = Buffer.from(inputString)
      const token = await server
        .post(apiPath(`auth`))
        .send({user:'user1@gmail.com', password: 'magicPass'})
      res = await server
        .post(apiPath('search/csv'))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
        .field('sep', ';')
        .field('firstName', 'Prenoms')
        .field('lastName', 'Nom')
        .field('birthDate', 'Date')
        .attach('csv', buf, 'file.csv')
      const { body : { id: jobId } }: { body: { id: string} } = res
      res = await server
        .get(apiPath(`search/csv/${jobId}?order=true`))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
      while (res.body.status === 'created' || res.body.status === 'wait' || res.body.status === 'active') {
        res = await server
          .get(apiPath(`search/csv/${jobId}?order=true`))
          .set('Authorization', `Bearer ${token.body.access_token as string}`)
        }
      expect(res.status).toBe(200);
      parseString(res.text, { headers: true, delimiter: ";"})
        .on('data', (row: any) => {
          expect(Object.keys(row).slice(0,4)).to.have.ordered.members(['name.last', 'name.first', 'Nom', 'Prenoms']);
        })
         .on('end', (rowCount: number) => {
           expect(rowCount).to.eql(3);
         });
    });

    test.sequential('priority', async () => {
      let res;
      let buf;
      const token = await server
        .post(apiPath(`auth`))
        .send({user: process.env.BACKEND_TOKEN_USER, password: process.env.BACKEND_TOKEN_PASSWORD})

      res = await server
        .get(apiPath('queue/jobs'))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)

      buf  = await csv2Buffer('/deces-backend/tests/clients_test.csv', 3000)
      res = await server
        .post(apiPath('search/csv'))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
        .field('sep', ';')
        .field('firstName', 'Prenom')
        .field('lastName', 'Nom')
        .field('birthDate', 'Date')
        .field('chunkSize', 20)
        .attach('csv', buf, 'file.csv')
      const { body : { id: jobId1 } }: { body: { id: string} } = res
      let statusJob1;
      buf  = await csv2Buffer('/deces-backend/tests/clients_test.csv', 500)
      res = await server
        .post(apiPath('search/csv'))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
        .field('sep', ';')
        .field('firstName', 'Prenom')
        .field('lastName', 'Nom')
        .field('birthDate', 'Date')
        .field('chunkSize', 20)
        .attach('csv', buf, 'file.csv')
      const { body : { id: jobId2 } }: { body: { id: string} } = res
      let statusJob2;
      while (['created', 'wait', 'started', 'active'].includes(res.body.status) || res.body.msg === 'started') {
        res = await server
          .get(apiPath(`search/csv/${jobId1}`))
          .set('Authorization', `Bearer ${token.body.access_token as string}`)
        statusJob1 = res.body.status
        res = await server
          .get(apiPath(`search/csv/${jobId2}`))
          .set('Authorization', `Bearer ${token.body.access_token as string}`)
        statusJob2 = res.body.status
        }

      // smaller job finish faster
      expect(statusJob1).toBe('active');
      expect(statusJob2).not.toBe('active');

      res = await server
        .get(apiPath('queue/jobs?jobsType=wait'))
        .set('Authorization', `Bearer ${token.body.access_token as string}`)
      expect(res.status).toBe(200);
      expect(res.body.jobs.length).to.eql(0);
    }, 30000);


  })

  const harryRequest = (fieldName: string) => {
    return {deathDate: 2020, firstName: 'Harry', aggs: fieldName}
  }

  const fixtureAggregations = [
    {fieldName: 'sex', expected: 'M'},
    {fieldName: 'birthDate', rowName: 'key_as_string', expected: '19251107'},
    {fieldName: 'birthCity', expected: 'paris'},
    {fieldName: 'birthDepartment', expected: '75'},
    {fieldName: 'birthCountry', expected: 'france'},
    {fieldName: 'deathDate', rowName: 'key_as_string', expected: '20200113'},
    {fieldName: 'deathCity', expected: 'bagnolet'},
    {fieldName: 'deathDepartment', expected: '30'},
    {fieldName: 'deathCountry', expected: 'france'},
    {fieldName: 'deathAge', expected: 64},
    {accept: 'text/csv', fieldName: 'birthDate',
      testFunc: (res: any) => {
        expect(res.status).toBe(200);
        parseString(res.text, { headers: true, delimiter: ','})
          .on('data', (row: any) => {
            expect(row).to.include.all.keys('key_as_string');
            expect(row.key_as_string).to.match(/\d{8}/);
          })
          .on('end', (rowCount: number) => {
            const total = +res.headers['total-results-birthdate']
            expect(rowCount).to.eql(total);
          });
      }},
    {params: {deathDate: 2020, sex: 'M', aggs: "birthDate"}, accept: 'text/csv', fieldName: 'birthDate',
      testFunc: (res: any) => {
        expect(res.status).toBe(200);
        parseString(res.text, { headers: true, delimiter: ','})
          .on('data', (row: any) => {
            expect(row).to.include.all.keys('key_as_string');
            expect(row.key_as_string).to.match(/\d{8}/);
          })
          .on('end', (rowCount: number) => {
            const total = +res.headers['total-results-birthdate']
            expect(rowCount).to.eql(total);
          });
      }
    },
    {params: {deathDate: 2020, sex: 'M', aggs: "birthDate"}, accept: 'application/json', fieldName: 'birthDate',
      testFunc: (res: any) => {
        expect(res.status).toBe(200);
        expect(res.body.response.aggregations.length).to.eql(res.body.response.cardinality.birthDate);
      }
    },
  ];


  describe('/agg GET', () => {
    fixtureAggregations.forEach((testFixture) => {
      it(`${testFixture.fieldName} should include the bucket ${testFixture.expected} ${testFixture.accept ? testFixture.accept : ''}`, async () => {
        const res = await server
          .get(`${process.env.BACKEND_PROXY_PATH}/agg`)
          .set('Accept', testFixture.accept ? testFixture.accept : 'application/json')
          .query(testFixture.params ? testFixture.params : harryRequest(testFixture.fieldName))
        if (testFixture.testFunc) {
          testFixture.testFunc(res)
        } else {
          expect(res.status).toBe(200);
          expect(res.body.response.aggregations.length).to.above(0);
          if (testFixture.rowName) {
            expect(res.body.response.aggregations.map((bucket: any) => bucket.key_as_string)).to.match(/\d{8}/);
          } else {
            expect(res.body.response.aggregations.map((bucket: any) => bucket.key)).to.include(testFixture.expected);
          }
        }
      });
    });
  })

  describe('/agg POST', () => {
    fixtureAggregations.forEach((testFixture) => {
      it(`${testFixture.fieldName} should include the bucket ${testFixture.expected} ${testFixture.accept ? testFixture.accept : ''}`, async () => {
        const res = await server
          .post(`${process.env.BACKEND_PROXY_PATH}/agg`)
          .set('Accept', testFixture.accept ? testFixture.accept : 'application/json')
          .send({deathDate: 2020, firstName: 'Harry', aggs: [testFixture.fieldName]})
        if (testFixture.testFunc) {
          testFixture.testFunc(res)
        } else {
          expect(res.status).toBe(200);
          expect(res.body.response.aggregations.length).to.above(0);
          if (testFixture.rowName) {
            expect(res.body.response.aggregations.map((bucket: any) => bucket.key_as_string)).to.match(/\d{8}/);
          } else {
            expect(res.body.response.aggregations.map((bucket: any) => bucket.key)).to.include(testFixture.expected);
          }
        }
      });
    });
  })

});
