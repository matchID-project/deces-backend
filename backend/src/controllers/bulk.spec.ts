import { processChunk } from './bulk';
import { expect } from 'chai';
import 'mocha';

describe('bulk.ts - Process chunk', () => {
  it('Precise request should return only one result', async () => {
    const result = await processChunk(
      [{firstName: 'jean', lastName: 'pierre', birthDate: '04/08/1933'}, {firstName: 'georges', lastName: 'michel', birthDate: '12/03/1939'}],
      'DD/MM/YYYY',
      5
    )
    expect(result.length).to.equal(2)
    expect(result[0][0].name.first).to.contain('Jean')
    expect(result[0][0].name.last).to.equal('Pierre')
  });

  it('Passing only first and last name', async () => {
    const result = await processChunk(
      [{firstName: 'jean', lastName: 'pierre'}, {firstName: 'georges', lastName: 'michel'}],
      'DD/MM/YYYY',
      5
    )
    expect(result[0]).to.contain.all.keys(['0','1'])
    expect(result[0][0].name.first).to.contain('Jean')
    expect(result[0][0].name.last).to.equal('Pierre')
  });

  it('Alternative date format', async () => {
    const result = await processChunk(
      [{firstName: 'jean', lastName: 'pierre', birthDate: '1933-08-04'}, {firstName: 'georges', lastName: 'michel', birthDate: '1939-03-12'}],
      'YYYY-MM-DD',
      1
    )
    expect(result.length).to.equal(2)
    expect(result[0][0].name.first).to.contain('Jean')
    expect(result[0][0].name.last).to.equal('Pierre')
  });

  it('Nom d\'usage', async () => {
    const result = await processChunk(
      [{firstName: 'jeanne', lastName: 'michou', sex: 'F', legalName: 'marie'}],
      'YYYY-MM-DD',
      1
    )
    expect(result.length).to.equal(1)
    expect(result[0][0].name.first).to.contain('Jeanne')
    expect(result[0][0].name.last).to.equal('Marie')
    expect(result[0][0].scores.name.last).to.above(0.7)
  });

});
