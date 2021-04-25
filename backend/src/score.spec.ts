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
          code: '',
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
          code: '',
          departmentCode: '',
          country: '',
          countryCode: '',
          latitude: +'',
          longitude: +'',
        }
      }
    });
    expect(score.scores).to.contain.all.keys(['score', 'birthDate', 'birthLocation', 'name'])
    expect(score.scores.score).to.equal(0.73);
  });


  it('birth geo score', () => {
    const score = new ScoreResult({
      firstName:  'georges',
      lastName: 'pompidous',
      birthCity: 'Paris'
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
          city: 'Vincennes',
          code: '75080',
          codeHistory: ['75080', '94800'],
          departmentCode: '75',
          country: '',
          countryCode: 'FRA',
          latitude: +'48.847759',
          longitude: +'2.439497',
        }
      },
      death: {
        date: '',
        certificateId: '',
        age: +'',
        location: {
          city: '',
          code: '',
          departmentCode: '',
          country: '',
          countryCode: '',
          latitude: +'',
          longitude: +'',
        }
      }
    });
    expect(score.scores).to.contain.all.keys(['score', 'birthLocation', 'name'])
    expect(score.scores.birthLocation).to.contain.all.keys(['score', 'city', 'code'])

  });

});
