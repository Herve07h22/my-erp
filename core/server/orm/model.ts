import { fieldTypes, generateCreateTable } from './fields.js';
import { hasCountProperty } from './guards.js';
import type {
  Domain,
  DomainCondition,
  DomainSQL,
  EnvironmentInterface,
  FieldsCollection,
  ModelConstructor,
  ModelExtension,
  ModelRegistryInterface,
  RecordData,
  SearchOptions,
} from './types.js';

import { isMany2OneValue } from './types.js';

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

/**
 * Classe de base pour tous les modèles ORM
 */
export class BaseModel {
  static _name: string = '';
  static _table: string = '';
  static _fields: FieldsCollection = {};
  static _order: string = 'id';

  env: EnvironmentInterface;
  records: RecordData[];
  ids: number[];
  protected _super?: (...args: unknown[]) => unknown;

  constructor(env: EnvironmentInterface, records: RecordData[] = []) {
    this.env = env;
    this.records = records;
    this.ids = records.map((r) => r.id).filter(Boolean);
  }

  /**
   * Normalise une valeur selon le type du champ
   * Convertit les chaînes vides en null pour les types qui ne les acceptent pas
   */
  protected _normalizeValue(value: unknown, fieldType: string): unknown {
    // Les chaînes vides doivent être converties en null pour certains types
    if (value === '') {
      const nullableTypes = ['date', 'datetime', 'integer', 'float', 'monetary', 'many2one'];
      if (nullableTypes.includes(fieldType)) {
        return null;
      }
    }
    // Pour les many2one, accepter à la fois { id, name } et un ID simple
    if (fieldType === 'many2one') {
      if (isMany2OneValue(value)) {
        return value.id;
      }
      if (typeof value === 'number') {
        return value;
      }
      return null;
    }
    return value;
  }

  /**
   * Crée un ou plusieurs enregistrements
   */
  async create(values: Record<string, unknown>): Promise<BaseModel> {
    const pool = this.env.pool;
    const tableName = (this.constructor as typeof BaseModel)._table;
    const fields = (this.constructor as typeof BaseModel)._fields;

    // Appliquer les valeurs par défaut
    const finalValues: Record<string, unknown> = { ...values };
    for (const [name, field] of Object.entries(fields)) {
      if (finalValues[name] === undefined && field.default !== undefined) {
        finalValues[name] =
          typeof field.default === 'function' ? field.default() : field.default;
      }
    }

    // Normaliser les valeurs selon leur type
    for (const [name, field] of Object.entries(fields)) {
      if (finalValues[name] !== undefined) {
        finalValues[name] = this._normalizeValue(finalValues[name], field.type);
      }
    }

    // Filtrer les champs virtuels et calculés non stockés
    const realFields = Object.entries(finalValues).filter(([name]) => {
      const field = fields[name];
      if (!field) return false;
      if (fieldTypes[field.type]?.isVirtual) return false;
      if (field.compute && !field.store) return false;
      return true;
    });

    const fieldNames = realFields.map(([name]) => name);
    const fieldValues = realFields.map(([, value]) => value);
    const placeholders = fieldNames.map((_, i) => `$${i + 1}`);

    const sql = `
      INSERT INTO ${tableName} (${fieldNames.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const result = await pool.query(sql, fieldValues);
    return this._wrap(result.rows as RecordData[]);
  }

  /**
   * Recherche des enregistrements selon un domaine
   */
  async search(
    domain: Domain = [],
    options: SearchOptions = {}
  ): Promise<BaseModel> {
    const pool = this.env.pool;
    const tableName = (this.constructor as typeof BaseModel)._table;

    const { where, params } = this._domainToSQL(domain);

    let sql = `SELECT * FROM ${tableName}`;

    if (where) {
      sql += ` WHERE ${where}`;
    }

    sql += ` ORDER BY ${options.order || (this.constructor as typeof BaseModel)._order}`;

    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    if (options.offset) {
      sql += ` OFFSET ${options.offset}`;
    }

    const result = await pool.query(sql, params);
    return this._wrap(result.rows as RecordData[]);
  }

  /**
   * Recherche et retourne le nombre d'enregistrements
   */
  async searchCount(domain: Domain = []): Promise<number> {
    const pool = this.env.pool;
    const tableName = (this.constructor as typeof BaseModel)._table;

    const { where, params } = this._domainToSQL(domain);

    let sql = `SELECT COUNT(*) as count FROM ${tableName}`;

    if (where) {
      sql += ` WHERE ${where}`;
    }

    const result = await pool.query(sql, params);
    const firstRow = result.rows[0];

    if (!hasCountProperty(firstRow)) {
      return 0;
    }

    return parseInt(String(firstRow.count), 10);
  }

  /**
   * Récupère un enregistrement par ID
   */
  async browse(ids: number | number[]): Promise<BaseModel> {
    const idsArray = Array.isArray(ids) ? ids : [ids];
    return this.search([['id', 'in', idsArray]]);
  }

  /**
   * Lit les valeurs des champs
   */
  async read(fieldNames: string[] | null = null): Promise<RecordData[]> {
    if (!this.records.length) return [];

    const allFields = (this.constructor as typeof BaseModel)._fields;
    const fields = fieldNames || Object.keys(allFields);

    // Collecter les IDs many2one à résoudre pour optimiser les requêtes
    const many2oneToResolve: Map<string, { relation: string; ids: Set<number> }> = new Map();

    for (const fieldName of fields) {
      const fieldDef = allFields[fieldName];
      if (fieldDef?.type === 'many2one' && fieldDef.relation) {
        const ids = new Set<number>();
        for (const record of this.records) {
          const value = record[fieldName];
          if (value !== null && value !== undefined) {
            ids.add(value as number);
          }
        }
        if (ids.size > 0) {
          many2oneToResolve.set(fieldName, { relation: fieldDef.relation, ids });
        }
      }
    }

    // Résoudre les noms des many2one en batch
    const many2oneNames: Map<string, Map<number, string>> = new Map();

    for (const [fieldName, { relation, ids }] of many2oneToResolve) {
      const RelatedModel = this.env.model(relation);
      const relatedRecords = await RelatedModel.browse([...ids]);
      const relatedData = await relatedRecords.read(['id', 'name']);

      const nameMap = new Map<number, string>();
      for (const rec of relatedData) {
        nameMap.set(rec.id as number, (rec.name as string) || `#${rec.id}`);
      }
      many2oneNames.set(fieldName, nameMap);
    }

    const results: RecordData[] = [];

    for (const record of this.records) {
      const data: RecordData = { id: record.id };

      for (const fieldName of fields) {
        const fieldDef = allFields[fieldName];

        // Si le champ a une fonction compute, l'appeler
        if (fieldDef?.compute) {
          const computeMethodName = fieldDef.compute;
          if (computeMethodName in this) {
            const computeMethod = Object.getOwnPropertyDescriptor(this, computeMethodName)?.value;
            if (typeof computeMethod === 'function') {
              data[fieldName] = await (computeMethod as (record: RecordData) => Promise<unknown>).call(this, record);
            } else {
              data[fieldName] = record[fieldName];
            }
          } else {
            data[fieldName] = record[fieldName];
          }
        } else if (fieldDef?.type === 'many2one') {
          // Pour les champs many2one, retourner un objet avec id et name
          const value = record[fieldName];
          if (value !== null && value !== undefined) {
            const nameMap = many2oneNames.get(fieldName);
            const name = nameMap?.get(value as number) || `#${value}`;
            data[fieldName] = { id: value, name };
          } else {
            data[fieldName] = null;
          }
        } else {
          data[fieldName] = record[fieldName];
        }
      }

      results.push(data);
    }

    return results;
  }

  /**
   * Met à jour les enregistrements
   */
  async write(values: Record<string, unknown>): Promise<boolean> {
    if (!this.ids.length) return false;

    const pool = this.env.pool;
    const tableName = (this.constructor as typeof BaseModel)._table;
    const fields = (this.constructor as typeof BaseModel)._fields;

    // Normaliser les valeurs selon leur type
    const normalizedValues: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(values)) {
      const field = fields[name];
      if (field) {
        normalizedValues[name] = this._normalizeValue(value, field.type);
      } else {
        normalizedValues[name] = value;
      }
    }

    // Filtrer les champs virtuels et calculés non stockés
    const realFields = Object.entries(normalizedValues).filter(([name]) => {
      const field = fields[name];
      if (!field) return false;
      if (fieldTypes[field.type]?.isVirtual) return false;
      if (field.compute && !field.store) return false;
      return true;
    });

    if (!realFields.length) return true;

    const fieldNames = realFields.map(([name]) => name);
    const fieldValues = realFields.map(([, value]) => value);
    const sets = fieldNames.map((name, i) => `${name} = $${i + 1}`);

    const sql = `
      UPDATE ${tableName}
      SET ${sets.join(', ')}
      WHERE id = ANY($${fieldNames.length + 1})
      RETURNING *
    `;

    const result = await pool.query(sql, [...fieldValues, this.ids]);
    this.records = result.rows as RecordData[];
    return true;
  }

  /**
   * Supprime les enregistrements
   */
  async unlink(): Promise<boolean> {
    if (!this.ids.length) return true;

    const pool = this.env.pool;
    const tableName = (this.constructor as typeof BaseModel)._table;

    await pool.query(`DELETE FROM ${tableName} WHERE id = ANY($1)`, [this.ids]);

    this.records = [];
    this.ids = [];
    return true;
  }

  /**
   * Convertit un domaine Odoo-style en SQL
   */
  protected _domainToSQL(domain: Domain): DomainSQL {
    if (!domain.length) return { where: '', params: [] };

    const conditions: string[] = [];
    const params: unknown[] = [];

    for (const item of domain) {
      if (typeof item === 'string') {
        // Opérateur logique ('|', '&', '!')
        // Pour simplifier, on ne gère que AND pour l'instant
        continue;
      }

      const [field, operator, value] = item as DomainCondition;
      params.push(value);
      const idx = params.length;

      const ops: Record<string, string> = {
        '=': `${field} = $${idx}`,
        '!=': `${field} != $${idx}`,
        '>': `${field} > $${idx}`,
        '>=': `${field} >= $${idx}`,
        '<': `${field} < $${idx}`,
        '<=': `${field} <= $${idx}`,
        in: `${field} = ANY($${idx})`,
        'not in': `${field} != ALL($${idx})`,
        like: `${field} LIKE $${idx}`,
        ilike: `${field} ILIKE $${idx}`,
        '=like': `${field} LIKE $${idx}`,
        '=ilike': `${field} ILIKE $${idx}`,
      };

      conditions.push(ops[operator] || `${field} = $${idx}`);
    }

    return {
      where: conditions.join(' AND '),
      params,
    };
  }

  /**
   * Wrap les résultats SQL dans une nouvelle instance du modèle
   */
  protected _wrap(rows: RecordData[]): BaseModel {
    const ModelClass = this.constructor as typeof BaseModel;
    return new ModelClass(this.env, rows);
  }

  /**
   * Itérateur pour parcourir les records
   */
  *[Symbol.iterator](): Iterator<BaseModel> {
    for (const record of this.records) {
      yield this._wrap([record]);
    }
  }

  /**
   * Retourne le premier enregistrement ou null
   */
  get first(): RecordData | null {
    return this.records[0] || null;
  }

  /**
   * Retourne le nombre d'enregistrements
   */
  get length(): number {
    return this.records.length;
  }
}

export { generateCreateTable };
