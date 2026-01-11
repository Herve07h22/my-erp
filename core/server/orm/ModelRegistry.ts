import { BaseModel } from './BaseModel.js';
import { generateCreateTable } from './fields.js';
import type {
  FieldsCollection,
  ModelConstructor,
  ModelExtension,
  ModelRegistryInterface,
} from './types.js';


/**
 * Registry central des modèles
 * Gère l'enregistrement et l'extension des modèles
 */
export class ModelRegistry implements ModelRegistryInterface {
  private models: Map<string, ModelConstructor> = new Map();
  private extensions: Map<string, ModelExtension[]> = new Map();
  private compiled: Map<string, ModelConstructor> = new Map();

  /**
   * Enregistre un nouveau modèle
   */
  define(ModelClass: ModelConstructor): this {
    const name = ModelClass._name;
    if (!name) {
      throw new Error('Model must have a _name property');
    }

    this.models.set(name, ModelClass);
    this.compiled.delete(name); // Invalider le cache
    return this;
  }

  /**
   * Étend un modèle existant (équivalent _inherit d'Odoo)
   */
  extend(extension: ModelExtension): this {
    const inheritFrom = extension.inherit;
    if (!inheritFrom) {
      throw new Error('Extension must have an inherit property');
    }

    const existing = this.extensions.get(inheritFrom) || [];
    existing.push(extension);
    this.extensions.set(inheritFrom, existing);
    this.compiled.delete(inheritFrom); // Invalider le cache
    return this;
  }

  /**
   * Compile un modèle avec toutes ses extensions
   */
  compile(name: string): ModelConstructor {
    const cached = this.compiled.get(name);
    if (cached) {
      return cached;
    }

    const BaseModelClass = this.models.get(name);
    if (!BaseModelClass) {
      throw new Error(`Model "${name}" not found`);
    }

    // Capturer les valeurs pour éviter les erreurs "possibly undefined" dans la classe
    const baseFields = BaseModelClass._fields;
    const baseName = BaseModelClass._name;
    const baseTable = BaseModelClass._table || baseName.replace(/\./g, '_');

    const extensions = this.extensions.get(name) || [];

    // Créer une nouvelle classe qui étend le modèle de base
    class CompiledModel extends (BaseModelClass as typeof BaseModel) {
      static override _fields: FieldsCollection = { ...baseFields };
      static override _name: string = baseName;
      static override _table: string = baseTable;
    }

    // Appliquer les extensions
    for (const ext of extensions) {
      // Fusionner les champs
      if (ext.fields) {
        Object.assign(CompiledModel._fields, ext.fields);
      }

      // Fusionner les méthodes
      if (ext.methods) {
        for (const [methodName, fn] of Object.entries(ext.methods)) {
          // Type guard pour vérifier si une propriété existe sur le prototype
          const proto = CompiledModel.prototype;
          const original = methodName in proto && typeof proto[methodName as keyof typeof proto] === 'function'
            ? (proto[methodName as keyof typeof proto] as (...args: unknown[]) => unknown)
            : undefined;

          if (original) {
            // Wrapper pour supporter _super()
            Object.defineProperty(proto, methodName, {
              value: function (
                this: BaseModel & { _super?: (...args: unknown[]) => unknown },
                ...args: unknown[]
              ): unknown {
                const prevSuper = this._super;
                this._super = original.bind(this);
                const result = fn.apply(this, args);
                this._super = prevSuper;
                return result;
              },
              writable: true,
              enumerable: true,
              configurable: true,
            });
          } else {
            Object.defineProperty(proto, methodName, {
              value: fn,
              writable: true,
              enumerable: true,
              configurable: true,
            });
          }
        }
      }
    }

    this.compiled.set(name, CompiledModel as unknown as ModelConstructor);
    return CompiledModel as unknown as ModelConstructor;
  }

  /**
   * Retourne tous les noms de modèles enregistrés
   */
  getModelNames(): string[] {
    return [...this.models.keys()];
  }

  /**
   * Vérifie si un modèle existe
   */
  has(name: string): boolean {
    return this.models.has(name);
  }
}

export { BaseModel, generateCreateTable };
