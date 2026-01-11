import type { QueryResult, QueryResultRow } from 'pg';

// Forward declaration pour éviter les dépendances circulaires
// BaseModel sera importé dans les fichiers qui utilisent ModelType
declare class BaseModel {
  // Déclaration minimale pour le type helper
}

// Interface commune pour les pools de base de données (réel ou mock)
export interface Queryable {
  query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;
}

// Type helper pour accepter soit une classe (constructeur) soit un type d'instance
// Permet d'écrire env.model<typeof ResPartner>('res.partner') ou env.model<ResPartnerInstance>('res.partner')
// Si T est un constructeur (typeof ClassName), on extrait le type d'instance avec InstanceType
// Sinon, on assume que T est déjà un type d'instance
export type ModelType<T> = T extends new (...args: any[]) => any
  ? InstanceType<T>
  : T;

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

// Valeur many2one (peut être un objet avec id/name ou juste un ID)
export interface Many2OneValue {
  id: number;
  name?: string;
}

// Type guard pour vérifier si une valeur est un Many2OneValue
export function isMany2OneValue(value: unknown): value is Many2OneValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as { id: unknown }).id === 'number'
  );
}

// Options de l'environnement
export interface EnvironmentOptions {
  pool: Queryable;
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
  pool: Queryable;
  registry: ModelRegistryInterface;
  user: RecordData | null;
  context: Record<string, unknown>;
  lang: string;
  timezone: string;

  model<T = ModelInstance>(modelName: string): ModelType<T>;
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
