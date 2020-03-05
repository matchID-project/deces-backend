import axios from 'axios';
import { BodyResponse } from './types/body';

export default async function runRequest(body: BodyResponse): Promise<any> { // TODO definition type
  const response = await axios("http://elasticsearch:9200/deces/_search", {
    method: 'post',
    data: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json'
    }
  });
  if (response.status >= 400) {
    return {
      hits: {
        total: {
          value: 1
        },
        hits: [
          {
            _id: 0,
            _source: {
              status: response.status,
              statusText: response.statusText,
              error: true
            }
          }
        ]
      }
    };
  } else {
    return response;
  }
};
