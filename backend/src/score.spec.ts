import { ScoreResult } from './score';
import { expect } from 'chai';
import 'mocha';

describe('score.ts - Score function', () => {

  it('should return 0.8 as global score', () => {
    const score = new ScoreResult({
      firstName:  'georges',
      lastName: 'pompidous',
      birthDate: "19691101"
    }, {
      score: 0.7,
      scores: {score: 0},
      source: '',
      sourceLine: 212,
      id: "13",
      name: {
        first: "Georges",
        last: "Pompidou"
      },
      sex: "M",
      birth: {
        date: "19691101",
        location: {
          city: '',
          cityCode: '',
          departmentCode: '',
          country: '',
          countryCode: '',
          latitude: +'',
          longitude: +'',
        }
      },
      death: {
        date: '',
        certificateId: '',
        age: +'',
        location: {
          city: '',
          cityCode: '',
          departmentCode: '',
          country: '',
          countryCode: '',
          latitude: +'',
          longitude: +'',
        }
      }
    });
    expect(score).to.contain.all.keys(['score', 'date', 'name'])
    expect(score.score).to.equal(0.51);
  });

});
