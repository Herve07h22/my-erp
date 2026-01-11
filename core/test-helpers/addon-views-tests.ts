import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ViewDefinitionsSchema } from './view-schema.js';
import { createTestEnv } from './test-env.js';
import type { ModelRegistryInterface, ModelConstructor } from '../server/orm/types.js';

export interface AddonViewsTestConfig {
  /** Nom de l'addon (ex: 'timesheet') */
  addonName: string;
  /** Chemin absolu vers le dossier de l'addon */
  addonPath: string;
  /** Liste des dépendances à charger (ex: ['base', 'project']) */
  dependencies?: string[];
}

/**
 * Crée une suite de tests pour valider les vues d'un addon
 *
 * Usage:
 * ```ts
 * import { createAddonViewsTests } from '@core/test-helpers/addon-views-tests.js';
 *
 * createAddonViewsTests({
 *   addonName: 'timesheet',
 *   addonPath: path.resolve(__dirname, '..'),
 *   dependencies: ['base', 'project'],
 * });
 * ```
 */
export function createAddonViewsTests(config: AddonViewsTestConfig): void {
  const { addonName, addonPath, dependencies = [] } = config;
  const viewsPath = path.join(addonPath, 'views');

  describe(`${addonName} - Views Validation`, () => {
    let registry: ModelRegistryInterface;
    let viewFiles: string[];

    beforeAll(async () => {
      const testEnv = await createTestEnv(addonName, dependencies);
      registry = testEnv.registry;

      if (fs.existsSync(viewsPath)) {
        viewFiles = fs.readdirSync(viewsPath).filter((f) => f.endsWith('.json'));
      } else {
        viewFiles = [];
      }
    });

    it('should have valid JSON syntax (Zod schema validation)', () => {
      for (const file of viewFiles) {
        const filePath = path.join(viewsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);

        const result = ViewDefinitionsSchema.safeParse(json);
        if (!result.success) {
          console.error(`Validation errors in ${file}:`, result.error.issues);
        }
        expect(result.success, `${file} should have valid JSON structure`).toBe(true);
      }
    });

    it('should have consistent data with models (fields, actions, menus)', () => {
      const errors: string[] = [];

      for (const file of viewFiles) {
        const filePath = path.join(viewsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);

        // Valider les vues
        if (json.views) {
          for (const view of json.views) {
            // Vérifier que le modèle existe
            if (!registry.has(view.model)) {
              errors.push(`[${file}] Model "${view.model}" not found in registry`);
              continue;
            }

            const ModelClass = registry.compile(view.model) as ModelConstructor;
            const fields = ModelClass._fields;

            // Extraire et vérifier les champs
            const referencedFields = extractFields(view.arch);
            for (const fieldName of referencedFields) {
              if (!fields[fieldName]) {
                errors.push(`[${file}] Field "${fieldName}" in view "${view.id}" not found in model "${view.model}"`);
              }
            }

            // Extraire et vérifier les actions des boutons
            const buttonActions = extractButtonActions(view.arch);
            for (const actionName of buttonActions) {
              if (!hasModelMethod(ModelClass, actionName)) {
                errors.push(`[${file}] Action "${actionName}" in view "${view.id}" not found in model "${view.model}"`);
              }
            }
          }
        }

        // Valider les actions (vérifier que le modèle existe)
        if (json.actions) {
          for (const action of json.actions) {
            if (action.model && !registry.has(action.model)) {
              errors.push(`[${file}] Model "${action.model}" in action "${action.id}" not found in registry`);
            }
          }
        }

        // Valider les menus (vérifier les actions référencées dans le même fichier)
        if (json.menus && json.actions) {
          const actionIds = new Set(json.actions.map((a: { id: string }) => a.id));

          for (const menu of json.menus) {
            if (menu.action && !actionIds.has(menu.action)) {
              errors.push(`[${file}] Action "${menu.action}" in menu "${menu.id}" not found in this file`);
            }
          }
        }
      }

      if (errors.length > 0) {
        console.error('Consistency errors:', errors);
      }
      expect(errors.length, `Should have no consistency errors:\n${errors.join('\n')}`).toBe(0);
    });
  });
}

/**
 * Extrait les noms de champs référencés dans l'architecture d'une vue
 * Ignore les champs "tree" des one2many car ils appartiennent au modèle lié
 */
function extractFields(arch: Record<string, unknown>): string[] {
  const fields = new Set<string>();

  function extract(obj: unknown): void {
    if (typeof obj !== 'object' || obj === null) return;

    if (Array.isArray(obj)) {
      obj.forEach(extract);
      return;
    }

    const record = obj as Record<string, unknown>;

    // Champs dans un tableau "fields"
    if (record.fields && Array.isArray(record.fields)) {
      for (const f of record.fields) {
        if (typeof f === 'string') {
          fields.add(f);
        } else if (typeof f === 'object' && f !== null && 'field' in f) {
          fields.add((f as { field: string }).field);
        }
      }
    }

    // Champ unique (pour one2many)
    if (typeof record.field === 'string') {
      fields.add(record.field);
    }

    // Parcourir récursivement sauf les propriétés "tree" (champs du modèle lié)
    for (const [key, value] of Object.entries(record)) {
      if (key !== 'tree') {
        extract(value);
      }
    }
  }

  extract(arch);
  return Array.from(fields);
}

/**
 * Extrait les actions des boutons dans le header
 */
function extractButtonActions(arch: Record<string, unknown>): string[] {
  const actions: string[] = [];
  const header = arch.header as Record<string, unknown> | undefined;

  if (header?.buttons && Array.isArray(header.buttons)) {
    for (const button of header.buttons as Array<{ type?: string; name?: string }>) {
      if (button.type === 'action' && button.name) {
        actions.push(button.name);
      }
    }
  }

  return actions;
}

/**
 * Vérifie si une méthode existe sur le modèle
 */
function hasModelMethod(ModelClass: ModelConstructor, methodName: string): boolean {
  return methodName in ModelClass.prototype && typeof ModelClass.prototype[methodName] === 'function';
}
