import axios from 'axios';
import { BodyResponse, ScrolledResponse } from './types/body';

export default async function runRequest(body: BodyResponse|ScrolledResponse, scroll: string): Promise<any> { // TODO definition type
  let endpoint
  if (body.scroll_id) {
    endpoint = '_search/scroll'
  } else if (scroll) {
    endpoint = `deces/_search?scroll=${scroll}`
  } else {
    endpoint = 'deces/_search'
  }
  const response = await axios(`http://elasticsearch:9200/${endpoint}`, {
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
