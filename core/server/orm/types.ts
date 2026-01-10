import type { Pool, PoolClient } from 'pg';

// Types des champs supportés
export type FieldType =
  | 'integer'
  | 'float'
  | 'string'
  | 'text'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'selection'
  | 'many2one'
  | 'one2many'
  | 'many2many'
  | 'json'
  | 'monetary';

// Option de sélection [valeur, label]
export type SelectionOption = [string, string];

// Définition d'un champ
export interface FieldDefinition {
  type: FieldType;
  label?: string;
  required?: boolean;
  unique?: boolean;
  primaryKey?: boolean;
  default?: unknown | (() => unknown);
  size?: number;
  options?: SelectionOption[];
  relation?: string;
  inverse?: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  compute?: string;
  store?: boolean;
}

// Collection de champs
export interface FieldsCollection {
  [fieldName: string]: FieldDefinition;
}

// Type d'un champ avec ses fonctions de conversion
export interface FieldTypeDefinition {
  sqlType: string | ((field: FieldDefinition) => string) | null;
  jsType: string;
  validate: (value: unknown, field?: FieldDefinition) => boolean;
  toSQL?: (value: unknown) => unknown;
  fromSQL?: (value: unknown) => unknown;
  isRelation?: boolean;
  isVirtual?: boolean;
}

// Collection des types de champs
export interface FieldTypesCollection {
  [typeName: string]: FieldTypeDefinition;
}

// Domaine de recherche (format Odoo-like)
export type DomainOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'in'
  | 'not in'
  | 'like'
  | 'ilike'
  | '=like'
  | '=ilike';

export type DomainCondition = [string, DomainOperator, unknown];
export type DomainLogical = '|' | '&' | '!';
export type DomainItem = DomainCondition | DomainLogical;
export type Domain = DomainItem[];

// Options de recherche
export interface SearchOptions {
  limit?: number;
  offset?: number;
  order?: string;
}

// Résultat de la conversion domaine -> SQL
export interface DomainSQL {
  where: string;
  params: unknown[];
}

// Données d'un enregistrement
export interface RecordData {
  id: number;
  [key: string]: unknown;
}

// Options de l'environnement
export interface EnvironmentOptions {
  pool: Pool | { query: PoolClient['query'] };
  registry: ModelRegistryInterface;
  user?: RecordData | null;
  context?: Record<string, unknown>;
}

// Interface du registry (pour éviter les dépendances circulaires)
export interface ModelRegistryInterface {
  define(ModelClass: ModelConstructor): ModelRegistryInterface;
  extend(extension: ModelExtension): ModelRegistryInterface;
  compile(name: string): ModelConstructor;
  getModelNames(): string[];
  has(name: string): boolean;
}

// Extension de modèle
export interface ModelExtension {
  inherit: string;
  fields?: FieldsCollection;
  methods?: Record<string, (...args: unknown[]) => unknown>;
}

// Constructeur de modèle
export interface ModelConstructor {
  new (env: EnvironmentInterface, records?: RecordData[]): ModelInstance;
  _name: string;
  _table: string;
  _fields: FieldsCollection;
  _order: string;
}

// Instance de modèle (RecordSet)
export interface ModelInstance {
  env: EnvironmentInterface;
  records: RecordData[];
  ids: number[];
  length: number;
  first: RecordData | null;

  create(values: Record<string, unknown>): Promise<ModelInstance>;
  search(domain?: Domain, options?: SearchOptions): Promise<ModelInstance>;
  searchCount(domain?: Domain): Promise<number>;
  browse(ids: number | number[]): Promise<ModelInstance>;
  read(fieldNames?: string[] | null): Promise<RecordData[]>;
  write(values: Record<string, unknown>): Promise<boolean>;
  unlink(): Promise<boolean>;

  [Symbol.iterator](): Iterator<ModelInstance>;
}

// Interface de l'environnement
export interface EnvironmentInterface {
  pool: Pool | { query: PoolClient['query'] };
  registry: ModelRegistryInterface;
  user: RecordData | null;
  context: Record<string, unknown>;
  lang: string;
  timezone: string;

  model(modelName: string): ModelInstance;
  call(modelName: string): ModelInstance;
  withContext(newContext: Record<string, unknown>): EnvironmentInterface;
  withUser(user: RecordData): EnvironmentInterface;
  transaction<T>(fn: (env: EnvironmentInterface) => Promise<T>): Promise<T>;
}

// Définition d'un modèle (pour generateCreateTable)
export interface ModelDef {
  _name: string;
  _table?: string;
  _fields: FieldsCollection;
}
