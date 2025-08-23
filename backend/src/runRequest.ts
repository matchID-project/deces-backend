import { estypes } from '@elastic/elasticsearch';
import { getClient } from './elasticsearch';
import loggerStream from './logger';
import { BodyResponse, ScrolledResponse } from './models/body';

const log = (json:any) => {
  loggerStream.write(JSON.stringify({
    "backend": {
      "server-date": new Date(Date.now()).toISOString(),
      ...json
    }
  }));
}

const isBodyResponse = (body: BodyResponse|ScrolledResponse): body is BodyResponse => {
  return 'query' in body;
}

export const runRequest = async (body: BodyResponse|ScrolledResponse, scroll: string): Promise<any> => {
  const client = getClient();
  let operation = 'unknown';
  try {
    if (body.scroll_id) {
      operation = 'scroll';
      const response = await client.scroll({
        scroll_id: body.scroll_id,
        scroll
      });
      return response;
    } else if (scroll && isBodyResponse(body)) {
      operation = 'search_with_scroll';
      const response = await client.search({
        index: 'deces',
        scroll,
        body: body as any
      });
      return response;
    } else if (isBodyResponse(body)) {
      operation = 'search';
      const response = await client.search({
        index: 'deces',
        body: body as any
      });
      return response;
    } else {
      operation = 'invalid_body_type';
      throw new Error('Invalid request body type');
    }
  } catch (error) {
    log({
      elasticsearchError: error.toString(),
      msg: `Elasticsearch request failed during ${operation}`
    });

    return {
      took: 0,
      hits: {
        total: {
          value: 0
        },
        max_score: 0,
        hits: []
      },
      status: error.statusCode || 500,
      statusText: error.message || 'Internal Server Error',
      error: true
    };
  }
};

export const runBulkRequest = async (bulkRequest: any): Promise<estypes.MsearchResponse> => {
  const client = getClient();
  try {
    const response = await client.msearch(bulkRequest);
    return response;
  } catch (error) {
    const errorMessage = `Elasticsearch bulk request failed: ${error.message || error.toString()}`;
    log({
      elasticsearchError: error.toString(),
      msg: 'Elasticsearch bulk request failed'
    });
    throw new Error(errorMessage);
  }
};
