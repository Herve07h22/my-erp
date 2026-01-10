/**
 * Environnement d'exécution
 * Fournit l'accès aux modèles et services dans le contexte d'une requête
 */

import type { Pool, PoolClient } from 'pg';
import type { Request, Response, NextFunction } from 'express';
import type {
  EnvironmentInterface,
  EnvironmentOptions,
  ModelRegistryInterface,
  RecordData,
} from '../orm/types.js';
import { BaseModel } from '../orm/model.js';

export class Environment implements EnvironmentInterface {
  pool: Pool | { query: PoolClient['query'] };
  registry: ModelRegistryInterface;
  user: RecordData | null;
  context: Record<string, unknown>;

  constructor(options: EnvironmentOptions) {
    this.pool = options.pool;
    this.registry = options.registry;
    this.user = options.user || null;
    this.context = options.context || {};
  }

  /**
   * Accède à un modèle par son nom
   * Retourne une nouvelle instance du modèle dans cet environnement
   */
  model(modelName: string): BaseModel {
    const ModelClass = this.registry.compile(modelName);
    return new ModelClass(this) as BaseModel;
  }

  /**
   * Alias pour model() - syntaxe env('model.name')
   */
  call(modelName: string): BaseModel {
    return this.model(modelName);
  }

  /**
   * Crée un nouvel environnement avec un contexte différent
   */
  withContext(newContext: Record<string, unknown>): Environment {
    return new Environment({
      pool: this.pool,
      registry: this.registry,
      user: this.user,
      context: { ...this.context, ...newContext },
    });
  }

  /**
   * Crée un nouvel environnement avec un utilisateur différent
   */
  withUser(user: RecordData): Environment {
    return new Environment({
      pool: this.pool,
      registry: this.registry,
      user,
      context: this.context,
    });
  }

  /**
   * Exécute une fonction dans une transaction
   */
  async transaction<T>(fn: (env: Environment) => Promise<T>): Promise<T> {
    const client = await (this.pool as Pool).connect();

    try {
      await client.query('BEGIN');

      const txEnv = new Environment({
        pool: { query: client.query.bind(client) } as { query: PoolClient['query'] },
        registry: this.registry,
        user: this.user,
        context: this.context,
      });

      const result = await fn(txEnv);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Récupère la langue actuelle
   */
  get lang(): string {
    return (this.context.lang as string) || 'fr_FR';
  }

  /**
   * Récupère le fuseau horaire actuel
   */
  get timezone(): string {
    return (this.context.timezone as string) || 'Europe/Paris';
  }
}

// Extension du type Request Express
export interface EnvRequest extends Request {
  env: (modelName: string) => BaseModel;
  environment: Environment;
  user?: RecordData;
}

/**
 * Middleware Express pour injecter l'environnement dans les requêtes
 */
export function envMiddleware(
  pool: Pool,
  registry: ModelRegistryInterface
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const envReq = req as EnvRequest;
    const env = new Environment({
      pool,
      registry,
      user: envReq.user || null,
      context: {
        lang: req.headers['accept-language']?.split(',')[0] || 'fr_FR',
      },
    });

    // Fonction raccourcie pour accéder aux modèles
    envReq.env = (modelName: string): BaseModel => env.model(modelName);
    envReq.environment = env;

    next();
  };
}
