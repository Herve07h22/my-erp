import express, { Router, Request, Response, NextFunction, Express } from 'express';
import type { ModelRegistryInterface, Domain } from '../orm/types.js';
import type { EnvRequest } from '../services/env.js';
import { getQueryString, getQueryInt, getQueryJSON } from '../../shared/utils/query-params.js';
import { validateRequestBody, isAsyncMethod } from '../orm/guards.js';

/**
 * Type guard pour vérifier si une requête est une EnvRequest
 */
function isEnvRequest(req: Request): req is EnvRequest {
  return 'env' in req && typeof (req as EnvRequest).env === 'function';
}

/**
 * Helper pour obtenir l'environnement depuis une requête
 * Lance une erreur si le middleware env n'est pas configuré
 */
function getEnvRequest(req: Request): EnvRequest {
  if (!isEnvRequest(req)) {
    throw new Error('Environment middleware not configured');
  }
  return req;
}

/**
 * Génère automatiquement les routes REST CRUD pour un modèle
 */
export function generateModelAPI(
  router: Router,
  modelName: string,
  _registry: ModelRegistryInterface
): Router {
  const base = `/api/${modelName.replace(/\./g, '/')}`;

  // GET /api/model - Liste avec recherche
  router.get(base, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const envReq = getEnvRequest(req);
      const Model = envReq.env(modelName);
      const domain: Domain = getQueryJSON(req.query.domain, []);
      const options = {
        limit: getQueryInt(req.query.limit),
        offset: getQueryInt(req.query.offset),
        order: getQueryString(req.query.order),
      };

      const records = await Model.search(domain, options);
      const fieldsParam = getQueryString(req.query.fields);
      const data = await records.read(fieldsParam?.split(',') || null);

      res.json({
        success: true,
        data,
        count: records.length,
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/model/count - Compte les enregistrements
  router.get(
    `${base}/count`,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const envReq = getEnvRequest(req);
        const Model = envReq.env(modelName);
        const domain: Domain = getQueryJSON(req.query.domain, []);
        const count = await Model.searchCount(domain);

        res.json({ success: true, count });
      } catch (err) {
        next(err);
      }
    }
  );

  // GET /api/model/defaults - Retourne les valeurs par défaut pour un nouvel enregistrement
  router.get(
    `${base}/defaults`,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const envReq = getEnvRequest(req);
        const Model = envReq.env(modelName);
        const ModelClass = Model.constructor as typeof Model.constructor & {
          _fields: Record<string, { default?: unknown | (() => unknown) }>;
          _sequence?: string;
        };

        const defaults: Record<string, unknown> = {};

        // Récupérer les valeurs par défaut des champs
        for (const [fieldName, field] of Object.entries(ModelClass._fields)) {
          if (field.default !== undefined) {
            defaults[fieldName] =
              typeof field.default === 'function' ? field.default() : field.default;
          }
        }

        // Si le modèle a une séquence, obtenir l'aperçu de la prochaine valeur
        const sequenceCode = ModelClass._sequence;
        if (sequenceCode) {
          try {
            const Sequence = envReq.env('ir.sequence') as {
              previewByCode: (code: string) => Promise<string | null>;
            };
            const preview = await Sequence.previewByCode(sequenceCode);
            if (preview) {
              defaults.name = preview;
            }
          } catch {
            // Séquence non trouvée, on ignore
          }
        }

        res.json({ success: true, data: defaults });
      } catch (err) {
        next(err);
      }
    }
  );

  // GET /api/model/:id - Récupère un enregistrement
  router.get(
    `${base}/:id`,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const envReq = getEnvRequest(req);
        const Model = envReq.env(modelName);
        const records = await Model.browse(parseInt(req.params.id, 10));

        if (!records.length) {
          return res.status(404).json({
            success: false,
            error: 'Record not found',
          });
        }

        const data = await records.read();
        res.json({ success: true, data: data[0] });
      } catch (err) {
        next(err);
      }
    }
  );

  // POST /api/model - Crée un enregistrement
  router.post(base, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const envReq = getEnvRequest(req);
      const Model = envReq.env(modelName);
      const values = validateRequestBody(req.body);
      const records = await Model.create(values);
      const data = await records.read();

      res.status(201).json({
        success: true,
        data: data[0],
      });
    } catch (err) {
      next(err);
    }
  });

  // PUT /api/model/:id - Met à jour un enregistrement
  router.put(
    `${base}/:id`,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const envReq = getEnvRequest(req);
        const Model = envReq.env(modelName);
        const records = await Model.browse(parseInt(req.params.id, 10));

        if (!records.length) {
          return res.status(404).json({
            success: false,
            error: 'Record not found',
          });
        }

        const values = validateRequestBody(req.body);
        await records.write(values);
        const data = await records.read();

        res.json({ success: true, data: data[0] });
      } catch (err) {
        next(err);
      }
    }
  );

  // DELETE /api/model/:id - Supprime un enregistrement
  router.delete(
    `${base}/:id`,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const envReq = getEnvRequest(req);
        const Model = envReq.env(modelName);
        const records = await Model.browse(parseInt(req.params.id, 10));

        if (!records.length) {
          return res.status(404).json({
            success: false,
            error: 'Record not found',
          });
        }

        await records.unlink();
        res.status(204).end();
      } catch (err) {
        next(err);
      }
    }
  );

  // POST /api/model/:id/action/:action - Exécute une action métier
  router.post(
    `${base}/:id/action/:action`,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const envReq = getEnvRequest(req);
        const Model = envReq.env(modelName);
        const records = await Model.browse(parseInt(req.params.id, 10));

        if (!records.length) {
          return res.status(404).json({
            success: false,
            error: 'Record not found',
          });
        }

        const actionName = req.params.action;

        // Vérifier que l'action existe sur le recordset
        if (!isAsyncMethod(records, actionName)) {
          return res.status(404).json({
            success: false,
            error: `Action "${actionName}" not found or not a method`,
          });
        }

        // Appeler l'action de manière type-safe
        const action = (records as unknown as Record<string, (params: unknown) => Promise<unknown>>)[actionName];
        const params = validateRequestBody(req.body);
        const result = await action.call(records, params);
        res.json({ success: true, data: result });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}

/**
 * Crée le routeur API principal
 */
export function createAPIRouter(registry: ModelRegistryInterface): Router {
  const router = express.Router();

  // Middleware pour parser JSON
  router.use(express.json());

  // Route pour lister les modèles disponibles
  router.get('/api/models', (_req: Request, res: Response) => {
    const models = registry.getModelNames().map((name) => {
      const Model = registry.compile(name);
      return {
        name,
        table: Model._table,
        fields: Object.keys(Model._fields),
      };
    });

    res.json({ success: true, data: models });
  });

  // Route pour récupérer les métadonnées d'un modèle
  router.get('/api/models/*', (req: Request, res: Response) => {
    const modelName = req.params[0].replace(/\//g, '.');

    if (!registry.has(modelName)) {
      return res.status(404).json({
        success: false,
        error: `Model "${modelName}" not found`,
      });
    }

    const Model = registry.compile(modelName);
    res.json({
      success: true,
      data: {
        name: modelName,
        table: Model._table,
        fields: Model._fields,
      },
    });
  });

  return router;
}

/**
 * Génère les routes pour tous les modèles enregistrés
 */
export function generateAllModelAPIs(
  app: Express,
  registry: ModelRegistryInterface
): void {
  const router = createAPIRouter(registry);

  for (const modelName of registry.getModelNames()) {
    generateModelAPI(router, modelName, registry);
    console.log(`  Generated API for: ${modelName}`);
  }

  app.use(router);
}
