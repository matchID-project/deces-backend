import { ScoreResult, fuzzballTokenSetRatio } from './score';
import { describe, expect, it } from 'vitest'

describe('score.ts - Score function', () => {

  it('fuzzball token set ratio', () => {
    const score = fuzzballTokenSetRatio("fuzzy was a bear", "a fuzzy bear fuzzy was");
    expect(score).eq(1)
  })

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

  it('special: should return 0.8 as global score different date format', () => {
    const score = new ScoreResult({
      name: {
        first: 'georges',
        last: 'pompidous'
      },
      birth: {
        date: "01/11/1969"
      }
    }, {
      name: {
        first: "Georges",
        last: "Pompidou"
      },
      sex: "M",
      birth: {
        date: "01/11/1969",
      },
    },{
      dateFormatA: "dd/MM/yyyy",
      dateFormatB: "dd/MM/yyyy"
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

  it('Score GeoPoint', () => {
    const score = new ScoreResult({
      name: {
        first: 'tran',
        last: 'chen',
      },
      birth: {
        location: {
          latitude: 48.847759,
          longitude: 2.439497
        }
      }
    }, {
      name: {
        first: 'tran',
        last: 'chen',
      },
      birth: {
        location: {
          latitude: 48.847759,
          longitude: 2.439497
        }
      }
    });
    expect(score).to.contain.all.keys(['birthLocation'])
    expect(score.birthLocation).to.contain.all.keys(['geo'])
  });

  it('explain: Nom d\'usage', () => {
    const score = new ScoreResult({
      name: {
        first: 'jeanne',
        last: 'michou',
        legal: 'marie'
      },
      sex: 'F'
    }, {
      name: {
        first: "jeanne",
        last: "marie"
      },
      sex: "F",
    }, {explain: true});
    expect(score.explain).to.contain.all.keys(['legalName'])
    expect(score.explain).to.contain.all.keys(['sex'])

  });

  it('explain: Longnames', () => {
    const score = new ScoreResult({
      name: {
        first: 'tran',
        last: 'chen ju mei wou',
      },
      sex: 'F'
    }, {
      name: {
        first: 'tran mi',
        last: "chen ju wang"
      },
      sex: "F",
    }, {explain: true});
    expect(score.explain).to.contain.all.keys(['sex'])
  });

  it('explain: location', () => {
    const score = new ScoreResult({
      name: {
        first: 'tran',
        last: 'chen ju mei wou',
      },
      birth: {
        location: {
          city: "Paris",
          countryCode: 'FRA',
        }
      },
      sex: 'F'
    }, {
      name: {
        first: 'tran mi',
        last: "chen ju wang"
      },
      birth: {
        location: {
          city: "Parisi",
          countryCode: 'FRA',
        }
      },
      sex: "F",
    }, {explain: true});
    expect(score.explain).to.contain.all.keys(['sex'])
  })


});
