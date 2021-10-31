import { ScoreResult } from './score';
import { expect } from 'chai';
import 'mocha';

describe('score.ts - Score function', () => {

  it('should return 0.8 as global score', () => {
    const score = new ScoreResult({
      name: {
        first: 'georges',
        last: 'pompidous'
      },
      birth: {
        date: "19691101"
      }
    }, {
      name: {
        first: "Georges",
        last: "Pompidou"
      },
      sex: "M",
      birth: {
        date: "19691101",
      },
    });
    expect(score).to.contain.all.keys(['score', 'birthDate', 'birthLocation', 'name'])
    expect(score.score).to.equal(0.73);
  });


  it('birth geo score', () => {
    const score = new ScoreResult({
      name: {
        first : 'georges',
        last: 'pompidous'
      },
      birth: {
        location: {
          city: 'Paris'
        }
      }
    }, {
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
    });
    expect(score).to.contain.all.keys(['score', 'birthLocation', 'name'])
    expect(score.birthLocation).to.contain.all.keys(['score', 'city', 'code'])

  });


  it('birth postal code score', () => {
    const score = new ScoreResult({
      name: {
        first: 'georges',
        last: 'pompidous',
      },
      birth: {
        location: {
          codePostal: '75001'
        }
      }
    }, {
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
          codePostal: ['75080'],
          codeHistory: ['75080', '94800'],
          departmentCode: '75',
          country: '',
          countryCode: 'FRA',
          latitude: +'48.847759',
          longitude: +'2.439497',
        }
      },
    });
    expect(score).to.contain.all.keys(['score', 'birthLocation', 'name'])
    expect(score.birthLocation).to.contain.all.keys(['score', 'codePostal'])

  });

});
