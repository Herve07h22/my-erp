import path from 'path';
import { fileURLToPath } from 'url';
import { Environment } from '../server/services/Environment.js';
import { ModelRegistry } from '../server/orm/ModelRegistry.js';
import { ModuleLoader } from '../server/module-loader/index.js';
import type { ModelRegistryInterface, RecordData, EnvironmentOptions } from '../server/orm/types.js';
import { BaseModel } from '@core/server/orm/BaseModel.js';
import { MockPool } from './mock-pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * Crée un environnement de test pour un addon spécifique
 * Charge les modèles de l'addon et ses dépendances
 */
export async function createTestEnv(
  addonName: string,
  additionalAddons: string[] = []
): Promise<{
  env: Environment;
  registry: ModelRegistryInterface;
  pool: MockPool;
}> {
  const pool = new MockPool();
  const registry = new ModelRegistry();

  // Créer le loader de modules
  const addonsPath = path.join(PROJECT_ROOT, 'addons');
  const loader = new ModuleLoader(addonsPath, { registry });

  // Découvrir tous les modules
  loader.discoverModules();

  // Charger les modules nécessaires (dépendances + addon principal)
  const modulesToLoad = [...additionalAddons, addonName];
  await loader.loadModules(modulesToLoad);

  // Créer l'environnement
  const env = new Environment({
    pool,
    registry,
    user: null,
    context: {},
  });

  return { env, registry, pool };
}

/**
 * Crée un enregistrement de test directement dans le mock pool
 * Utile pour les fixtures et les tests d'actions
 * Note: Cette fonction est asynchrone car browse() retourne une Promise
 */
export async function createTestRecord(
  env: Environment,
  modelName: string,
  data: RecordData
): Promise<BaseModel> {
  const Model = env.model(modelName);
  const tableName = (Model.constructor as typeof BaseModel)._table;

  // S'assurer que l'ID existe
  if (!data.id) {
    data.id = Date.now() + Math.floor(Math.random() * 1000);
  }

  // Ajouter l'enregistrement directement dans le pool mock
  if (env.pool instanceof MockPool) {
    env.pool.seed(tableName, [data]);
  }

  // Retourner une instance du modèle avec cet enregistrement
  return await Model.browse(data.id);
}

/**
 * Helper pour créer plusieurs enregistrements de test
 */
export async function createTestRecords(
  env: Environment,
  modelName: string,
  records: RecordData[]
): Promise<BaseModel> {
  const Model = env.model(modelName);
  const tableName = (Model.constructor as typeof BaseModel)._table;

  // S'assurer que tous les IDs existent
  records.forEach((record, index) => {
    if (!record.id) {
      record.id = Date.now() + index + Math.floor(Math.random() * 1000);
    }
  });

  // Ajouter les enregistrements dans le pool mock
  if (env.pool instanceof MockPool) {
    env.pool.seed(tableName, records);
  }

  // Retourner des instances du modèle
  const ids = records.map((r) => r.id as number);
  return await Model.browse(ids);
}


