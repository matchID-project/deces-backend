import { Client, ClientOptions } from '@elastic/elasticsearch';
import loggerStream from './logger';

const config: ClientOptions = {
  node: 'http://elasticsearch:9200',
  requestTimeout: 30000,
  maxRetries: 3
};

let esClientInstance: Client = null;

export const getClient = (): Client => {
  if (!esClientInstance) {
    esClientInstance = new Client(config);

    const logError = (error: Error, context: string): void => {
      loggerStream.write(JSON.stringify({
        backend: {
          "server-date": new Date(Date.now()).toISOString(),
          elasticsearchError: error.message || error.toString(),
          elasticsearchStack: error.stack,
          msg: `Elasticsearch ${context} error`
        }
      }));
    };

    process.on('unhandledRejection', (error: Error) => {
      if (error.message.includes('elasticsearch')) {
        logError(error, 'unhandled');
      }
    });
  }
  return esClientInstance;
};

export const resetClient = (): void => {
  if (esClientInstance) {
    esClientInstance.close();
    esClientInstance = null;
  }
};

// Fonction pour vérifier la santé du client
export const checkClientHealth = async (): Promise<boolean> => {
  try {
    const esClient = getClient();
    await esClient.ping();
    return true;
  } catch (error) {
    loggerStream.write(JSON.stringify({
      backend: {
        "server-date": new Date(Date.now()).toISOString(),
        elasticsearchError: error instanceof Error ? error.message || error.toString() : String(error),
        elasticsearchStack: error instanceof Error ? error.stack : undefined,
        msg: "Elasticsearch health check failed"
      }
    }));
    return false;
  }
};