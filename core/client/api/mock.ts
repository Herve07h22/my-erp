/**
 * Implémentation mock du client API pour les tests
 * Permet de simuler les réponses sans appels réseau
 */
import type {
  ApiClient,
  Domain,
  SearchOptions,
  RecordData,
  FieldsCollection,
  ViewDefinition,
  ActionDefinition,
  MenuItem,
  SearchResult,
} from './types.js';

// Types pour configurer le mock
export interface MockData {
  records?: Map<string, RecordData[]>;
  fields?: Map<string, FieldsCollection>;
  views?: Map<string, ViewDefinition>;
  actions?: Map<string, ActionDefinition>;
  menus?: MenuItem[];
  defaults?: Map<string, Record<string, unknown>>;
}

export interface MockConfig {
  delay?: number; // Simule la latence réseau
  failOn?: string[]; // Liste des modèles qui doivent échouer
}

/**
 * Client API mock pour les tests unitaires
 */
export class MockApiClient implements ApiClient {
  private records: Map<string, RecordData[]>;
  private fields: Map<string, FieldsCollection>;
  private views: Map<string, ViewDefinition>;
  private actions: Map<string, ActionDefinition>;
  private menus: MenuItem[];
  private defaults: Map<string, Record<string, unknown>>;
  private nextId: Map<string, number>;
  private delay: number;
  private failOn: Set<string>;

  // Callbacks pour espionner les appels
  public onSearch?: (model: string, domain?: Domain, options?: SearchOptions) => void;
  public onCreate?: (model: string, data: unknown) => void;
  public onUpdate?: (model: string, id: number, data: unknown) => void;
  public onDelete?: (model: string, id: number) => void;
  public onExecute?: (model: string, id: number, action: string) => void;

  constructor(data: MockData = {}, config: MockConfig = {}) {
    this.records = data.records ?? new Map();
    this.fields = data.fields ?? new Map();
    this.views = data.views ?? new Map();
    this.actions = data.actions ?? new Map();
    this.menus = data.menus ?? [];
    this.defaults = data.defaults ?? new Map();
    this.nextId = new Map();
    this.delay = config.delay ?? 0;
    this.failOn = new Set(config.failOn ?? []);

    // Initialiser les IDs max par modèle
    for (const [model, recs] of this.records) {
      const maxId = Math.max(0, ...recs.map((r) => r.id));
      this.nextId.set(model, maxId + 1);
    }
  }

  private async simulateDelay(): Promise<void> {
    if (this.delay > 0) {
      await new Promise((r) => setTimeout(r, this.delay));
    }
  }

  private checkFail(model: string): void {
    if (this.failOn.has(model)) {
      throw new Error(`Mock error for model: ${model}`);
    }
  }

  private getNextId(model: string): number {
    const id = this.nextId.get(model) ?? 1;
    this.nextId.set(model, id + 1);
    return id;
  }

  // Méthodes utilitaires pour configurer le mock
  setRecords(model: string, records: RecordData[]): void {
    this.records.set(model, records);
    const maxId = Math.max(0, ...records.map((r) => r.id));
    this.nextId.set(model, maxId + 1);
  }

  setFields(model: string, fields: FieldsCollection): void {
    this.fields.set(model, fields);
  }

  setView(model: string, type: string, view: ViewDefinition): void {
    this.views.set(`${model}:${type}`, view);
  }

  setAction(actionId: string, action: ActionDefinition): void {
    this.actions.set(actionId, action);
  }

  setMenus(menus: MenuItem[]): void {
    this.menus = menus;
  }

  setDefaults(model: string, defaults: Record<string, unknown>): void {
    this.defaults.set(model, defaults);
  }

  // Implémentation de l'interface ApiClient
  async search<T = RecordData>(
    model: string,
    domain: Domain = [],
    options: SearchOptions = {}
  ): Promise<SearchResult<T>> {
    await this.simulateDelay();
    this.checkFail(model);
    this.onSearch?.(model, domain, options);

    let results = [...(this.records.get(model) ?? [])];

    // Filtrage basique par domaine
    for (const condition of domain) {
      const [field, op, value] = condition;
      results = results.filter((r) => {
        const fieldValue = r[field];
        switch (op) {
          case '=':
            return fieldValue === value;
          case '!=':
            return fieldValue !== value;
          case '>':
            return (fieldValue as number) > (value as number);
          case '>=':
            return (fieldValue as number) >= (value as number);
          case '<':
            return (fieldValue as number) < (value as number);
          case '<=':
            return (fieldValue as number) <= (value as number);
          case 'in':
            return (value as unknown[]).includes(fieldValue);
          case 'not in':
            return !(value as unknown[]).includes(fieldValue);
          case 'like':
          case 'ilike':
            return String(fieldValue)
              .toLowerCase()
              .includes(String(value).toLowerCase());
          default:
            return true;
        }
      });
    }

    const count = results.length;

    // Pagination
    if (options.offset) {
      results = results.slice(options.offset);
    }
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return { data: results as T[], count };
  }

  async read<T = RecordData>(model: string, id: number): Promise<T> {
    await this.simulateDelay();
    this.checkFail(model);

    const records = this.records.get(model) ?? [];
    const record = records.find((r) => r.id === id);

    if (!record) {
      throw new Error(`Record not found: ${model}/${id}`);
    }

    return record as T;
  }

  async create<T = RecordData>(
    model: string,
    data: Partial<T>
  ): Promise<T> {
    await this.simulateDelay();
    this.checkFail(model);
    this.onCreate?.(model, data);

    const id = this.getNextId(model);
    const record = { ...data, id } as RecordData;

    const records = this.records.get(model) ?? [];
    records.push(record);
    this.records.set(model, records);

    return record as T;
  }

  async update<T = RecordData>(
    model: string,
    id: number,
    data: Partial<T>
  ): Promise<T> {
    await this.simulateDelay();
    this.checkFail(model);
    this.onUpdate?.(model, id, data);

    const records = this.records.get(model) ?? [];
    const index = records.findIndex((r) => r.id === id);

    if (index === -1) {
      throw new Error(`Record not found: ${model}/${id}`);
    }

    records[index] = { ...records[index], ...data };
    return records[index] as T;
  }

  async delete(model: string, id: number): Promise<void> {
    await this.simulateDelay();
    this.checkFail(model);
    this.onDelete?.(model, id);

    const records = this.records.get(model) ?? [];
    const index = records.findIndex((r) => r.id === id);

    if (index !== -1) {
      records.splice(index, 1);
    }
  }

  async execute<T = unknown>(
    model: string,
    id: number,
    action: string,
    _params?: Record<string, unknown>
  ): Promise<T> {
    await this.simulateDelay();
    this.checkFail(model);
    this.onExecute?.(model, id, action);

    // Retourne l'enregistrement mis à jour par défaut
    const record = await this.read(model, id);
    return record as T;
  }

  async getFields(model: string): Promise<FieldsCollection> {
    await this.simulateDelay();
    this.checkFail(model);
    return this.fields.get(model) ?? {};
  }

  async getDefaults(model: string): Promise<Record<string, unknown>> {
    await this.simulateDelay();
    return this.defaults.get(model) ?? {};
  }

  async getView(model: string, type: string): Promise<ViewDefinition> {
    await this.simulateDelay();
    const view = this.views.get(`${model}:${type}`);

    if (!view) {
      // Retourne une vue par défaut
      return { id: `${model}_${type}`, model, type };
    }

    return view;
  }

  async getAction(actionId: string): Promise<ActionDefinition> {
    await this.simulateDelay();
    const action = this.actions.get(actionId);

    if (!action) {
      throw new Error(`Action not found: ${actionId}`);
    }

    return action;
  }

  async getMenus(): Promise<MenuItem[]> {
    await this.simulateDelay();
    return this.menus;
  }

  async uploadFile(_file: File): Promise<string> {
    await this.simulateDelay();
    return '/uploads/mock-file.jpg';
  }

  async uploadFiles(files: File[]): Promise<string[]> {
    await this.simulateDelay();
    return files.map((_, i) => `/uploads/mock-file-${i}.jpg`);
  }

  // Méthode pour réinitialiser l'état
  reset(): void {
    this.records.clear();
    this.nextId.clear();
  }
}

/**
 * Factory pour créer un mock pré-configuré
 */
export function createMockApiClient(
  data?: MockData,
  config?: MockConfig
): MockApiClient {
  return new MockApiClient(data, config);
}
