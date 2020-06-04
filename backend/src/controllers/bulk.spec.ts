import { processCsv } from './bulk';
import { expect } from 'chai';
import 'mocha';

describe('Process csv', () => {
  it('Return json', async () => {
    const result = await processCsv(
      {
        data: {
          sep: ',',
          chunkSize: 5
        }
      },
      {file: ['firstName,lastName,birthDate', 'jean,pierre,04/08/1933', 'georges,michel,12/03/1939'].join('\r\n')}
    )
    expect(result[0].metadata.mapping.firstName).to.equal('firstName')
    expect(result[0].metadata.mapping.lastName).to.equal('lastName')
    expect(result[1].block.minimum_match).to.equal(1);
  });
});
