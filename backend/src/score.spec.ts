import { ScoreResult } from './score';

test('score.ts - Score function', () => {
  const score = new ScoreResult({
    firstName:  'georges',
    lastName: 'pompidous',
    birthDate: "19691101"
  }, {
    score: 0.7,
    scores: {score: 0},
    source: '',
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
  expect(score).toHaveProperty('score', 0.8)
  expect(score).toHaveProperty('date')
  expect(score).toHaveProperty('name')
});
