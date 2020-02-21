import axios from 'axios';
import Body from './types/body';

export default async function runRequest(body: Body) {
  const response = await axios.get("http://elasticsearch:9200/deces/_search", {
    params: {
      source: JSON.stringify(body),
      source_content_type: 'application/json'
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
