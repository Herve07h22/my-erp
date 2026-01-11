import fs from 'fs';
import path from 'path';
import type { Pool } from 'pg';
import type { Express } from 'express';
import { topologicalSort, checkDependencies } from './graph.js';
import type { ModuleManifest } from './graph.js';
import type { ModelRegistryInterface, ModelConstructor, ModelExtension } from '../orm/types.js';
import { getErrorMessage } from '../../shared/utils/errors.js';

/**
 * Type guard pour vérifier si une définition est une extension de modèle
 */
function isModelExtension(def: ModelConstructor | ModelExtension): def is ModelExtension {
  return 'inherit' in def && typeof def.inherit === 'string';
}

/**
 * Type guard pour vérifier si une définition est un constructeur de modèle
 */
function isModelConstructor(def: ModelConstructor | ModelExtension): def is ModelConstructor {
  return '_name' in def && typeof def._name === 'string';
}

export interface ModuleLoaderOptions {
  registry?: ModelRegistryInterface;
  pool?: Pool;
  app?: Express;
}

export interface ViewDefinition {
  id: string;
  model: string;
  type: string;
  arch?: unknown;
  [key: string]: unknown;
}

export interface ActionDefinition {
  id: string;
  model: string;
  [key: string]: unknown;
}

export interface MenuDefinition {
  id: string;
  label: string;
  parent?: string;
  sequence?: number;
  action?: string;
}

export interface ViewDefinitions {
  views?: ViewDefinition[];
  actions?: ActionDefinition[];
  menus?: MenuDefinition[];
}

export interface ModuleData {
  manifest: ModuleManifest;
  models: (ModelConstructor | ModelExtension)[];
  routes: unknown[];
  views: ViewDefinitions[];
}

export interface MigrationModule {
  up: (pool: Pool) => Promise<void>;
}

export class ModuleLoader {
  private addonsPaths: string[];
  private manifests: Map<string, ModuleManifest> = new Map();
  private loadedModules: Map<string, ModuleData> = new Map();
  private registry?: ModelRegistryInterface;
  private pool?: Pool;
  private app?: Express;

  constructor(addonsPaths: string | string[], options: ModuleLoaderOptions = {}) {
    this.addonsPaths = Array.isArray(addonsPaths) ? addonsPaths : [addonsPaths];
    this.registry = options.registry;
    this.pool = options.pool;
    this.app = options.app;
  }

  /**
   * Découvre tous les modules disponibles dans les chemins d'addons
   */
  discoverModules(): this {
    for (const addonsPath of this.addonsPaths) {
      if (!fs.existsSync(addonsPath)) {
        console.warn(`Addons path not found: ${addonsPath}`);
        continue;
      }

      const dirs = fs.readdirSync(addonsPath, { withFileTypes: true });

      for (const dir of dirs.filter((d) => d.isDirectory())) {
        const manifestPath = path.join(addonsPath, dir.name, 'manifest.json');

        if (fs.existsSync(manifestPath)) {
          try {
            const manifest: ModuleManifest = JSON.parse(
              fs.readFileSync(manifestPath, 'utf-8')
            );
            manifest._path = path.join(addonsPath, dir.name);
            manifest._name = dir.name;
            this.manifests.set(dir.name, manifest);
            console.log(`  Discovered module: ${manifest.label || dir.name}`);
          } catch (err) {
            console.error(
              `Error reading manifest for ${dir.name}:`,
              getErrorMessage(err)
            );
          }
        }
      }
    }

    console.log(`Total modules discovered: ${this.manifests.size}`);
    return this;
  }

  /**
   * Charge les modules demandés avec résolution des dépendances
   */
  async loadModules(modulesToInstall: string[]): Promise<Map<string, ModuleData>> {
    const toLoad = this.resolveDependencies(modulesToInstall);
    const sorted = topologicalSort(toLoad, (m: string) => {
      const manifest = this.manifests.get(m);
      return manifest ? manifest.depends || [] : [];
    });

    console.log(
      `\nLoading ${sorted.length} modules in order:`,
      sorted.join(' -> ')
    );

    for (const moduleName of sorted) {
      await this.loadModule(moduleName);
    }

    return this.loadedModules;
  }

  /**
   * Charge un module individuel
   */
  async loadModule(name: string): Promise<ModuleData> {
    const cached = this.loadedModules.get(name);
    if (cached) {
      return cached;
    }

    const manifest = this.manifests.get(name);
    if (!manifest) {
      throw new Error(`Module "${name}" not found`);
    }

    // Vérifier les dépendances
    const { valid, missing } = checkDependencies(
      name,
      this.manifests,
      this.loadedModules
    );
    if (!valid) {
      throw new Error(
        `Module "${name}" has missing dependencies: ${missing.join(', ')}`
      );
    }

    console.log(
      `\n  Loading module: ${manifest.label || name} (${manifest.version})`
    );

    const moduleData: ModuleData = {
      manifest,
      models: [],
      routes: [],
      views: [],
    };

    // Charger les modèles
    moduleData.models = await this.loadModels(manifest);

    // Charger les routes
    moduleData.routes = await this.loadRoutes(manifest);

    // Charger les vues
    moduleData.views = await this.loadViews(manifest);

    // Exécuter les migrations
    await this.runMigrations(manifest);

    // Charger les données initiales
    await this.loadData(manifest);

    this.loadedModules.set(name, moduleData);
    return moduleData;
  }

  /**
   * Charge les fichiers de modèles d'un module
   */
  private async loadModels(
    manifest: ModuleManifest
  ): Promise<(ModelConstructor | ModelExtension)[]> {
    const models: (ModelConstructor | ModelExtension)[] = [];
    const modelsPatterns = manifest.models || ['models/*.ts', 'models/*.js'];

    for (const pattern of modelsPatterns) {
      const modelsPath = path.join(
        manifest._path!,
        pattern.replace(/\*\.(ts|js)$/, '')
      );

      if (!fs.existsSync(modelsPath)) continue;

      const files = fs
        .readdirSync(modelsPath)
        .filter((f) => f.endsWith('.ts') || f.endsWith('.js'));

      for (const file of files) {
        try {
          const modulePath = path.join(modelsPath, file);
          const modelModule = await import(modulePath);
          const modelDef: ModelConstructor | ModelExtension =
            modelModule.default || modelModule;

          if (this.registry) {
            if (isModelExtension(modelDef)) {
              // Extension d'un modèle existant
              this.registry.extend(modelDef);
              console.log(`    Extended model: ${modelDef.inherit}`);
            } else if (isModelConstructor(modelDef)) {
              // Nouveau modèle
              this.registry.define(modelDef);
              console.log(`    Registered model: ${modelDef._name}`);
            }
            models.push(modelDef);
          }
        } catch (err) {
          console.error(`    Error loading model ${file}:`, getErrorMessage(err));
        }
      }
    }

    return models;
  }

  /**
   * Charge les fichiers de routes d'un module
   */
  private async loadRoutes(manifest: ModuleManifest): Promise<unknown[]> {
    const routes: unknown[] = [];
    const routesPatterns = manifest.routes || ['routes/*.ts', 'routes/*.js'];

    for (const pattern of routesPatterns) {
      const routesPath = path.join(
        manifest._path!,
        pattern.replace(/\*\.(ts|js)$/, '')
      );

      if (!fs.existsSync(routesPath)) continue;

      const files = fs
        .readdirSync(routesPath)
        .filter((f) => f.endsWith('.ts') || f.endsWith('.js'));

      for (const file of files) {
        try {
          const modulePath = path.join(routesPath, file);
          const routeModule = await import(modulePath);
          const routeFn = routeModule.default || routeModule;

          if (this.app && typeof routeFn === 'function') {
            routeFn(this.app);
            console.log(`    Registered routes from: ${file}`);
          }
          routes.push(routeFn);
        } catch (err) {
          console.error(`    Error loading route ${file}:`, getErrorMessage(err));
        }
      }
    }

    return routes;
  }

  /**
   * Charge les définitions de vues d'un module
   */
  private async loadViews(manifest: ModuleManifest): Promise<ViewDefinitions[]> {
    const views: ViewDefinitions[] = [];
    const viewsPatterns = manifest.views || ['views/*.json'];

    for (const pattern of viewsPatterns) {
      const viewsPath = path.join(
        manifest._path!,
        pattern.replace('*.json', '')
      );

      if (!fs.existsSync(viewsPath)) continue;

      const files = fs.readdirSync(viewsPath).filter((f) => f.endsWith('.json'));

      for (const file of files) {
        try {
          const viewDef: ViewDefinitions = JSON.parse(
            fs.readFileSync(path.join(viewsPath, file), 'utf-8')
          );
          views.push(viewDef);
          console.log(`    Loaded views from: ${file}`);
        } catch (err) {
          console.error(`    Error loading view ${file}:`, getErrorMessage(err));
        }
      }
    }

    return views;
  }

  /**
   * Exécute les migrations d'un module
   */
  private async runMigrations(manifest: ModuleManifest): Promise<void> {
    const migrationsPath = path.join(manifest._path!, 'migrations');

    if (!fs.existsSync(migrationsPath)) return;

    const files = fs
      .readdirSync(migrationsPath)
      .filter((f) => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.cjs'))
      .sort();

    for (const file of files) {
      try {
        const modulePath = path.join(migrationsPath, file);
        const migrationModule = await import(modulePath);
        const migration: MigrationModule = migrationModule.default || migrationModule;

        if (typeof migration.up === 'function' && this.pool) {
          await migration.up(this.pool);
          console.log(`    Ran migration: ${file}`);
        }
      } catch (err) {
        console.error(
          `    Error running migration ${file}:`,
          getErrorMessage(err)
        );
      }
    }
  }

  /**
   * Charge les données initiales d'un module
   */
  private async loadData(manifest: ModuleManifest): Promise<void> {
    const dataFiles = manifest.data || [];

    if (!this.pool) return;

    for (const dataFile of dataFiles) {
      const dataPath = path.join(manifest._path!, dataFile);

      if (!fs.existsSync(dataPath)) continue;

      try {
        const data: Record<string, Record<string, unknown>[]> = JSON.parse(
          fs.readFileSync(dataPath, 'utf-8')
        );

        for (const [modelName, records] of Object.entries(data)) {
          const tableName = modelName.replace(/\./g, '_');
          let insertedCount = 0;

          for (const record of records) {
            // Vérifier si l'enregistrement existe déjà
            const recordId = record.id;
            if (recordId !== undefined) {
              const existing = await this.pool.query(
                `SELECT 1 FROM ${tableName} WHERE id = $1`,
                [recordId]
              );
              if (existing.rows.length > 0) {
                continue; // Skip existing records
              }
            }

            // Insérer l'enregistrement
            const fields = Object.keys(record);
            const values = Object.values(record);
            const placeholders = fields.map((_, i) => `$${i + 1}`);

            const sql = `
              INSERT INTO ${tableName} (${fields.join(', ')})
              VALUES (${placeholders.join(', ')})
            `;

            await this.pool.query(sql, values);
            insertedCount++;
          }

          // Mettre à jour la séquence PostgreSQL si on a inséré avec des IDs explicites
          if (records.some((r) => r.id !== undefined)) {
            await this.pool.query(`
              SELECT setval(
                pg_get_serial_sequence('${tableName}', 'id'),
                COALESCE((SELECT MAX(id) FROM ${tableName}), 0) + 1,
                false
              )
            `);
          }

          if (insertedCount > 0) {
            console.log(`    Inserted ${insertedCount} record(s) for ${modelName}`);
          }
        }

        console.log(`    Loaded data from: ${dataFile}`);
      } catch (err) {
        console.error(
          `    Error loading data ${dataFile}:`,
          getErrorMessage(err)
        );
      }
    }
  }

  /**
   * Résout toutes les dépendances d'une liste de modules
   */
  private resolveDependencies(
    modules: string[],
    resolved: Set<string> = new Set()
  ): string[] {
    for (const mod of modules) {
      if (resolved.has(mod)) continue;

      const manifest = this.manifests.get(mod);
      if (!manifest) {
        throw new Error(`Module "${mod}" not found in available modules`);
      }

      if (manifest.depends) {
        this.resolveDependencies(manifest.depends, resolved);
      }

      resolved.add(mod);
    }

    return [...resolved];
  }

  /**
   * Retourne la liste des modules installés
   */
  getInstalledModules(): string[] {
    return [...this.loadedModules.keys()];
  }

  /**
   * Retourne la liste des modules disponibles
   */
  getAvailableModules(): string[] {
    return [...this.manifests.keys()];
  }
}
