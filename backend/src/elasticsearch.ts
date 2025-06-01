import { Client, ClientOptions } from '@elastic/elasticsearch';
import loggerStream from './logger';

// Configuration du client pour utiliser Undici par défaut
const config: ClientOptions = {
  node: 'http://elasticsearch:9200',
  requestTimeout: 30000, // Timeout de 30 secondes pour les requêtes
  maxRetries: 3,         // Nombre maximum de tentatives en cas d'échec
  // Laisser Undici gérer les options de connexion/socket par défaut.
  // Si des ajustements fins sont nécessaires plus tard, nous pourrons ajouter un objet `agent`
  // avec des options spécifiques à Undici (ex: connections, pipelining).
};

// Création du client
let esClientInstance: Client | null = null;

// Fonction pour créer ou récupérer le client
export const getClient = (): Client => {
  if (!esClientInstance) {
    esClientInstance = new Client(config);

    const logError = (error: Error, context: string) => {
      loggerStream.write(JSON.stringify({
        "backend": {
          "server-date": new Date(Date.now()).toISOString(),
          "elasticsearchError": error.message || error.toString(),
          "elasticsearchStack": error.stack,
          "msg": `Elasticsearch ${context} error`
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

// Fonction pour réinitialiser le client en cas de problème majeur
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
      "backend": {
        "server-date": new Date(Date.now()).toISOString(),
        "elasticsearchError": error.message || error.toString(),
        "elasticsearchStack": error.stack,
        "msg": "Elasticsearch health check failed"
      }
    }));
    return false;
  }
};