/**
 * Types pour l'abstraction API du client
 * Permet l'injection de dépendances pour les tests
 */

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
  | 'ilike';

export type DomainCondition = [string, DomainOperator, unknown];
export type Domain = DomainCondition[];

// Options de recherche
export interface SearchOptions {
  limit?: number;
  offset?: number;
  order?: string;
}

// Données d'un enregistrement
export interface RecordData {
  id: number;
  [key: string]: unknown;
}

// Définition d'un champ
export interface FieldDefinition {
  type: string;
  label?: string;
  required?: boolean;
  options?: [string, string][];
  relation?: string;
  inverse?: string;
  [key: string]: unknown;
}

// Collection de champs
export interface FieldsCollection {
  [fieldName: string]: FieldDefinition;
}

// Définition d'une vue
export interface ViewDefinition {
  id: string;
  model: string;
  type: string;
  arch?: unknown;
  [key: string]: unknown;
}

// Définition d'une action
export interface ActionDefinition {
  id: string;
  model: string;
  name: string;
  views?: [string, string][];
  [key: string]: unknown;
}

// Menu
export interface MenuItem {
  id: string;
  label: string;
  action?: string;
  children?: MenuItem[];
  sequence?: number;
}

// Résultat de recherche avec count
export interface SearchResult<T> {
  data: T[];
  count?: number;
}

/**
 * Interface du client API - permet l'injection de dépendances
 * Implémentée par FetchApiClient (production) et MockApiClient (tests)
 */
export interface ApiClient {
  // CRUD modèle
  search<T = RecordData>(
    model: string,
    domain?: Domain,
    options?: SearchOptions
  ): Promise<SearchResult<T>>;

  read<T = RecordData>(model: string, id: number): Promise<T>;

  create<T = RecordData>(
    model: string,
    data: Partial<T>
  ): Promise<T>;

  update<T = RecordData>(
    model: string,
    id: number,
    data: Partial<T>
  ): Promise<T>;

  delete(model: string, id: number): Promise<void>;

  execute<T = unknown>(
    model: string,
    id: number,
    action: string,
    params?: Record<string, unknown>
  ): Promise<T>;

  // Métadonnées
  getFields(model: string): Promise<FieldsCollection>;
  getDefaults(model: string): Promise<Record<string, unknown>>;

  // Vues et menus
  getView(model: string, type: string): Promise<ViewDefinition>;
  getAction(actionId: string): Promise<ActionDefinition>;
  getMenus(): Promise<MenuItem[]>;

  // Upload
  uploadFile(file: File): Promise<string>;
  uploadFiles(files: File[]): Promise<string[]>;
}

// Type pour les erreurs API
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
