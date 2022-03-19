import { processChunk } from './processStream';
import { expect } from 'chai';
import 'mocha';

describe('processStream.ts - Process chunk', () => {
  it('Precise request should return only one result', async () => {
    const result = await processChunk(
      [{firstName: 'jean', lastName: 'pierre', birthDate: '04/08/1933'}, {firstName: 'georges', lastName: 'michel', birthDate: '12/03/1939'}],
      5,
      {
        dateFormatA: 'dd/MM/yyyy',
      }
    )
    expect(result.length).to.equal(2)
    expect(result[0][0].name.first).to.contain('Jean')
    expect(result[0][0].name.last).to.equal('Pierre')
  });

  it('Passing only first and last name', async () => {
    const result = await processChunk(
      [{firstName: 'jean', lastName: 'petit'}, {firstName: 'georges', lastName: 'michel'}],
      10,
      {
        dateFormatA: 'dd/MM/yyyy',
      },
    )
    expect(result[0].length).to.above(2)
    expect(result[1].length).to.above(1)
    expect(result[0][0].name.first).to.contain('Jean')
    expect(result[0][0].name.last).to.equal('Petit')
    expect(result[1][0].name.first).to.contain('Georges')
    expect(result[1][0].name.last).to.equal('Michel')
  });

  it('Strict and permissive pruneScore', async () => {
    const resultStrict = await processChunk(
      [{firstName: 'jean', lastName: 'petit'}],
      5,
      {
        dateFormatA: 'dd/MM/yyyy',
        pruneScore: 0.5
      },
    )
    const resultPermissive = await processChunk(
      [{firstName: 'jean', lastName: 'petit'}],
      5,
      {
        dateFormatA: 'dd/MM/yyyy',
        pruneScore: 0.1
      },
    )
    expect(resultStrict[0].length).to.below(resultPermissive[0].length);
  });

  it('Alternative date format', async () => {
    const result = await processChunk(
      [{firstName: 'jean', lastName: 'pierre', birthDate: '1933-08-04'}, {firstName: 'georges', lastName: 'michel', birthDate: '1939-03-12'}],
      1,
      {
        dateFormatA: 'yyyy-MM-dd'
      }
    )
    expect(result.length).to.equal(2)
    expect(result[0][0].name.first).to.contain('Jean')
    expect(result[0][0].name.last).to.equal('Pierre')
  });

  it('Nom d\'usage', async () => {
    const result = await processChunk(
      [{firstName: 'jeanne', lastName: 'michou', sex: 'F', legalName: 'marie'}],
      1,
      {
        dateFormatA: 'yyyy-MM-dd'
      }
    )
    expect(result.length).to.equal(1)
    expect(result[0][0].name.first).to.contain('Jeanne')
    expect(result[0][0].name.last).to.equal('Marie')
    expect(result[0][0].scores.name.last).to.above(0.65)
  });

  it('Wrong date format: DD/MM/YYYY instead of dd/MM/yyyy', async () => {
    const result = await processChunk(
      [{firstName: 'jean', lastName: 'pierre', birthDate: '04/08/1933'}],
      1,
      {
        dateFormatA: 'DD/MM/YYYY'
      }
    )
    expect(result.length).to.equal(1)
    expect(result[0][0].name.first).to.contain('Jean')
    expect(result[0][0].name.last).to.equal('Pierre')
  });

  it('Wrong date format: missing day dd', async () => {
    const result = await processChunk(
      [{firstName: 'jean', lastName: 'pierre', birthDate: '08/1933'}],
      1,
      {
        dateFormatA: 'MM/YYYY',
        pruneScore: 0.01
      }
    )
    expect(result.length).to.equal(1)
    expect(result[0][0].name.first).to.contain('Jean')
    expect(result[0][0].name.last).to.equal('Pierre')
  });

  it('Wrong date format: mixed formats', async () => {
    const result = await processChunk(
      [
        {firstName: 'jean', lastName: 'pierre', birthDate: '04/08/1933'},
        {firstName: 'jean', lastName: 'pierre', birthDate: '08-1933'}
      ],
      1,
      {
        dateFormatA: 'DD/MM/YYYY',
        pruneScore: 0.01
      }
    )
    expect(result.length).to.equal(2)
    expect(result[0][0].name.first).to.contain('Jean')
    expect(result[0][0].name.last).to.equal('Pierre')
  });

});
