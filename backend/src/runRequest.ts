import axios from 'axios';
import loggerStream from './logger';
import { BodyResponse, ScrolledResponse } from './models/body';
import { RequestResult, BulkRequestResult } from './models/result';

const log = (json:any) => {
  loggerStream.write(JSON.stringify({
    "backend": {
      "server-date": new Date(Date.now()).toISOString(),
      ...json
    }
  }));
}

export const runRequest = async (body: BodyResponse|ScrolledResponse, scroll: string): Promise<RequestResult> => {
  let endpoint
  if (body.scroll_id) {
    endpoint = '_search/scroll'
  } else if (scroll) {
    endpoint = `deces/_search?scroll=${scroll}`
  } else {
    endpoint = 'deces/_search'
  }

  // Exponential backoff parameters
  const maxRetries = 3;
  const initialBackoff = 300;
  let retries = 0;
  let backoff = initialBackoff;

  let response;
  while (retries <= maxRetries) {
    try {
      response = await axios(`http://elasticsearch:9200/${endpoint}`, {
        method: 'post',
        data: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // timemout of 10s
      });
      break; // if ok, exit the loop
    } catch (error) {
      if ((error.response?.status >= 500 || error.code === 'ECONNABORTED') && retries < maxRetries) {
        // if it's a timeout or a 5xx error, retry
        log({
          elasticsearchError: error.toString(),
          msg: `Elasticsearch overloaded, retrying in ${backoff}ms... (${maxRetries - retries} attempts left)`
        });
        await new Promise(resolve => setTimeout(resolve, backoff));
        retries++;
        backoff *= 2; // exponential backoff
        continue;
      }

      // if all attempts failed, or it is another error, return an error
      return {
        data: {
          took: 0,
          hits: {
            total: {
              value: 1
            },
            max_score: 0,
            hits: []
          },
          status: error.response?.status || 500,
          statusText: error.response?.statusText || 'Internal Server Error',
          error: true
        }
      };
    }
  }

  if (response.status >= 400) {
    return {
      data: {
        took: 0,
        hits: {
          total: {
            value: 1
          },
          max_score: 0,
          hits: [],
        },
        status: response.status,
        statusText: response.statusText,
        error: true,
      }
    };
  } else {
    return response;
  }
};

export const runBulkRequest = async (body: string): Promise<BulkRequestResult> => {
  const response = await axios(`http://elasticsearch:9200/_msearch`, {
    method: 'post',
    data: body,
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache'
    }
  });
  if (response.status >= 400) {
    return {
      data: {
        responses: [{
          took: 0,
          hits: {
            total: {
              value: 1
            },
            max_score: 0,
            hits: [],
          },
          status: response.status,
          statusText: response.statusText,
          error: true,
        }]
      }
    };
  } else {
    return response;
  }
};
