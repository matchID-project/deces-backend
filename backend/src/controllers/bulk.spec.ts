import { BulkController } from './bulk.controller'
import { writeToBuffer } from '@fast-csv/format';
import express from 'express';
import { expect } from 'chai';
import 'mocha';

describe('bulk.controller.ts', () => {
  const controller = new BulkController()
  it('no files attached', async () => {
    const req = {
      headers: {},
      body: {},
      files: []
    } as express.Request
    const result = await controller.uploadCsv(req)
    expect(result.msg).to.equal('no files attached');
  });

 it('read csv', async () => {
   // let res: any;
   const inputArray = [
     ['Prenom', 'Nom', 'Date', 'Sex'],
     ['jean', 'pierre', '04/08/1933', 'M'],
     ['georges', 'michel', '12/03/1939', 'M']
   ]
   const buf: any = await writeToBuffer(inputArray)
   const req = {
     headers: {},
     body: {},
     files: buf
   } as express.Request
   const res = await controller.uploadCsv(req)
   expect(res.msg).to.equal('started');
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
})
