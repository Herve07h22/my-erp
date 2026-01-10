/**
 * Définitions des types de champs pour l'ORM
 */

import type {
  FieldDefinition,
  FieldTypesCollection,
  FieldTypeDefinition,
  ModelDef,
} from './types.js';

export const fieldTypes: FieldTypesCollection = {
  integer: {
    sqlType: 'INTEGER',
    jsType: 'number',
    validate: (value: unknown): boolean => Number.isInteger(value),
    toSQL: (value: unknown): unknown => value,
    fromSQL: (value: unknown): unknown => value,
  },

  float: {
    sqlType: 'DECIMAL(15,4)',
    jsType: 'number',
    validate: (value: unknown): boolean => typeof value === 'number',
    toSQL: (value: unknown): unknown => value,
    fromSQL: (value: unknown): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') return parseFloat(value);
      return 0;
    },
  },

  string: {
    sqlType: (field: FieldDefinition): string => `VARCHAR(${field.size || 255})`,
    jsType: 'string',
    validate: (value: unknown): boolean => typeof value === 'string',
    toSQL: (value: unknown): unknown => value,
    fromSQL: (value: unknown): unknown => value,
  },

  text: {
    sqlType: 'TEXT',
    jsType: 'string',
    validate: (value: unknown): boolean => typeof value === 'string',
    toSQL: (value: unknown): unknown => value,
    fromSQL: (value: unknown): unknown => value,
  },

  boolean: {
    sqlType: 'BOOLEAN',
    jsType: 'boolean',
    validate: (value: unknown): boolean => typeof value === 'boolean',
    toSQL: (value: unknown): unknown => value,
    fromSQL: (value: unknown): unknown => value,
  },

  date: {
    sqlType: 'DATE',
    jsType: 'object',
    validate: (value: unknown): boolean =>
      value instanceof Date || typeof value === 'string',
    toSQL: (value: unknown): string | unknown =>
      value instanceof Date ? value.toISOString().split('T')[0] : value,
    fromSQL: (value: unknown): Date | null => {
      if (!value) return null;
      if (value instanceof Date) return value;
      if (typeof value === 'string') return new Date(value);
      return null;
    },
  },

  datetime: {
    sqlType: 'TIMESTAMP',
    jsType: 'object',
    validate: (value: unknown): boolean =>
      value instanceof Date || typeof value === 'string',
    toSQL: (value: unknown): string | unknown =>
      value instanceof Date ? value.toISOString() : value,
    fromSQL: (value: unknown): Date | null => {
      if (!value) return null;
      if (value instanceof Date) return value;
      if (typeof value === 'string') return new Date(value);
      return null;
    },
  },

  selection: {
    sqlType: 'VARCHAR(64)',
    jsType: 'string',
    validate: (value: unknown, field?: FieldDefinition): boolean => {
      if (typeof value !== 'string') return false;
      const options = field?.options?.map((o) => o[0]) || [];
      return options.includes(value);
    },
    toSQL: (value: unknown): unknown => value,
    fromSQL: (value: unknown): unknown => value,
  },

  many2one: {
    sqlType: 'INTEGER',
    jsType: 'number',
    validate: (value: unknown): boolean =>
      Number.isInteger(value) || value === null,
    toSQL: (value: unknown): unknown => value,
    fromSQL: (value: unknown): unknown => value,
    isRelation: true,
  },

  one2many: {
    sqlType: null, // Pas de colonne, relation inverse
    jsType: 'array',
    validate: (): boolean => true,
    isRelation: true,
    isVirtual: true,
  },

  many2many: {
    sqlType: null, // Table de relation séparée
    jsType: 'array',
    validate: (): boolean => true,
    isRelation: true,
    isVirtual: true,
  },

  json: {
    sqlType: 'JSONB',
    jsType: 'object',
    validate: (): boolean => true,
    toSQL: (value: unknown): string => JSON.stringify(value),
    fromSQL: (value: unknown): unknown => value,
  },

  monetary: {
    sqlType: 'DECIMAL(15,2)',
    jsType: 'number',
    validate: (value: unknown): boolean => typeof value === 'number',
    toSQL: (value: unknown): unknown => value,
    fromSQL: (value: unknown): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') return parseFloat(value);
      return 0;
    },
  },

  image: {
    sqlType: 'TEXT',
    jsType: 'string',
    validate: (value: unknown): boolean => typeof value === 'string' || value === null,
    toSQL: (value: unknown): unknown => value,
    fromSQL: (value: unknown): unknown => value,
  },
};

/**
 * Génère la définition SQL d'une colonne à partir d'un champ
 */
export function fieldToColumnDef(
  name: string,
  field: FieldDefinition
): string | null {
  const type: FieldTypeDefinition | undefined = fieldTypes[field.type];
  if (!type || type.isVirtual) return null;

  // Les champs calculés non stockés ne créent pas de colonne
  if (field.compute && !field.store) return null;

  const sqlType =
    typeof type.sqlType === 'function' ? type.sqlType(field) : type.sqlType;

  let def = `${name} ${sqlType}`;

  if (field.primaryKey) {
    def += ' PRIMARY KEY';
    if (field.type === 'integer') {
      def = `${name} SERIAL PRIMARY KEY`;
    }
  }

  if (field.required && !field.primaryKey) {
    def += ' NOT NULL';
  }

  if (field.unique) {
    def += ' UNIQUE';
  }

  if (field.default !== undefined && typeof field.default !== 'function') {
    const defaultVal =
      typeof field.default === 'string' ? `'${field.default}'` : field.default;
    def += ` DEFAULT ${defaultVal}`;
  }

  if (type.isRelation && field.relation) {
    const refTable = field.relation.replace(/\./g, '_');
    def += ` REFERENCES ${refTable}(id)`;
    if (field.onDelete) {
      def += ` ON DELETE ${field.onDelete}`;
    }
  }

  return def;
}

/**
 * Génère le CREATE TABLE SQL pour un modèle
 */
export function generateCreateTable(modelDef: ModelDef): string {
  const tableName = modelDef._table || modelDef._name.replace(/\./g, '_');
  const columns: string[] = [];

  for (const [name, field] of Object.entries(modelDef._fields)) {
    const colDef = fieldToColumnDef(name, field);
    if (colDef) {
      columns.push(colDef);
    }
  }

  return `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${columns.join(',\n  ')}\n);`;
}
