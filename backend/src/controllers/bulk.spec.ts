import { processChunk } from './bulk';

describe('bulk.ts - Process chunk', () => {
  it('Precise request should return only one result', async () => {
    const result = await processChunk(
      [{firstName: 'jean', lastName: 'pierre', birthDate: '04/08/1933'}, {firstName: 'georges', lastName: 'michel', birthDate: '12/03/1939'}],
      'DD/MM/YYYY',
      5
    )
    expect(result).toHaveLength(2)
    expect(result[0][0].name).toHaveProperty('first')
    expect(result[0][0].name.first).toContain('Jean')
    expect(result[0][0].name).toHaveProperty('last', 'Pierre')
  });

  it('Passing only first and last name', async () => {
    const result = await processChunk(
      [{firstName: 'jean', lastName: 'pierre'}, {firstName: 'georges', lastName: 'michel'}],
      'DD/MM/YYYY',
      5
    )
    expect(result[0]).toHaveLength(2)
    expect(result[0][0].name).toHaveProperty('first')
    expect(result[0][0].name.first).toContain('Jean')
    expect(result[0][0].name).toHaveProperty('last', 'Pierre')
  });

  it('Alternative date format', async () => {
    const result = await processChunk(
      [{firstName: 'jean', lastName: 'pierre', birthDate: '1933-08-04'}, {firstName: 'georges', lastName: 'michel', birthDate: '1939-03-12'}],
      'YYYY-MM-DD',
      1
    )
    expect(result[0]).toHaveLength(1)
    expect(result[0][0].name).toHaveProperty('first')
    expect(result[0][0].name.first).toContain('Jean')
    expect(result[0][0].name).toHaveProperty('last', 'Pierre')
  });
});
