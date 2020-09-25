import { app } from './index';
import chai from 'chai';
import { expect } from 'chai';
import chaiHttp = require('chai-http');
import 'mocha';

chai.use(chaiHttp);

describe('index.ts - GET request', () => {
  it('healthcheck', async () => {
    const res = await chai.request(app)
      .get(`${process.env.BACKEND_PROXY_PATH}/healthcheck`)
    expect(res).to.have.status(200);
    expect(res.body.msg).to.eql("OK");
  });
});
