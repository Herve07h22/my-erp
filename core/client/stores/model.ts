/**
 * ModelStore - Gestion des données d'un modèle ORM
 * Classe JS pure, testable avec injection de l'API client
 */
import { Store, withLoading, type LoadingState } from './base.js';
import type {
  ApiClient,
  RecordData,
  FieldsCollection,
  Domain,
  SearchOptions,
} from '../api/types.js';

export interface ModelState extends LoadingState {
  model: string;
  record: RecordData | null;
  records: RecordData[];
  fields: FieldsCollection;
  count: number;
}

function createInitialState(model: string): ModelState {
  return withLoading({
    model,
    record: null,
    records: [],
    fields: {},
    count: 0,
  });
}

/**
 * Store pour gérer les données d'un modèle
 * Remplace le hook useModel avec une approche testable
 */
export class ModelStore extends Store<ModelState> {
  private api: ApiClient;

  constructor(api: ApiClient, model: string) {
    super(createInitialState(model));
    this.api = api;
  }

  /**
   * Charge les métadonnées (champs) du modèle
   */
  async loadFields(): Promise<FieldsCollection> {
    try {
      const fields = await this.api.getFields(this.state.model);
      this.setState({ fields });
      return fields;
    } catch (err) {
      this.setState({ error: (err as Error).message });
      return {};
    }
  }

  /**
   * Charge un enregistrement par son ID
   */
  async loadRecord(id: number): Promise<RecordData | null> {
    this.setState({ loading: true, error: null });

    try {
      const record = await this.api.read(this.state.model, id);
      this.setState({ record, loading: false });
      return record;
    } catch (err) {
      this.setState({ error: (err as Error).message, loading: false });
      return null;
    }
  }

  /**
   * Recherche des enregistrements avec filtrage
   */
  async search(
    domain: Domain = [],
    options: SearchOptions = {}
  ): Promise<RecordData[]> {
    this.setState({ loading: true, error: null });

    try {
      const result = await this.api.search<RecordData>(
        this.state.model,
        domain,
        options
      );
      this.setState({
        records: result.data,
        count: result.count ?? result.data.length,
        loading: false,
      });
      return result.data;
    } catch (err) {
      this.setState({ error: (err as Error).message, loading: false });
      return [];
    }
  }

  /**
   * Crée un nouvel enregistrement
   */
  async create(values: Record<string, unknown>): Promise<RecordData | null> {
    this.setState({ loading: true, error: null });

    try {
      const record = await this.api.create<RecordData>(
        this.state.model,
        values as Partial<RecordData>
      );
      this.setState({ record, loading: false });
      return record;
    } catch (err) {
      this.setState({ error: (err as Error).message, loading: false });
      return null;
    }
  }

  /**
   * Met à jour l'enregistrement courant ou un enregistrement spécifique
   */
  async save(
    values: Record<string, unknown>,
    id?: number
  ): Promise<RecordData | null> {
    const recordId = id ?? this.state.record?.id;

    if (!recordId) {
      return this.create(values);
    }

    this.setState({ loading: true, error: null });

    try {
      const record = await this.api.update<RecordData>(
        this.state.model,
        recordId,
        values as Partial<RecordData>
      );
      this.setState({ record, loading: false });
      return record;
    } catch (err) {
      this.setState({ error: (err as Error).message, loading: false });
      return null;
    }
  }

  /**
   * Supprime un enregistrement
   */
  async remove(id?: number): Promise<boolean> {
    const recordId = id ?? this.state.record?.id;

    if (!recordId) {
      this.setState({ error: 'No record to delete' });
      return false;
    }

    this.setState({ loading: true, error: null });

    try {
      await this.api.delete(this.state.model, recordId);
      this.setState({
        record: recordId === this.state.record?.id ? null : this.state.record,
        records: this.state.records.filter((r) => r.id !== recordId),
        loading: false,
      });
      return true;
    } catch (err) {
      this.setState({ error: (err as Error).message, loading: false });
      return false;
    }
  }

  /**
   * Exécute une action métier sur l'enregistrement
   */
  async execute(
    actionName: string,
    params: Record<string, unknown> = {},
    id?: number
  ): Promise<unknown> {
    const recordId = id ?? this.state.record?.id;

    if (!recordId) {
      this.setState({ error: 'No record selected' });
      return null;
    }

    this.setState({ loading: true, error: null });

    try {
      const result = await this.api.execute(
        this.state.model,
        recordId,
        actionName,
        params
      );

      // Recharge l'enregistrement après l'action
      const record = await this.api.read(this.state.model, recordId);
      this.setState({ record, loading: false });

      return result;
    } catch (err) {
      this.setState({ error: (err as Error).message, loading: false });
      return null;
    }
  }

  /**
   * Rafraîchit la liste des enregistrements
   */
  async refresh(): Promise<RecordData[]> {
    return this.search();
  }

  /**
   * Réinitialise l'enregistrement courant
   */
  clearRecord(): void {
    this.setState({ record: null });
  }

  /**
   * Efface l'erreur
   */
  clearError(): void {
    this.setState({ error: null });
  }
}

/**
 * Factory pour créer un ModelStore
 */
export function createModelStore(api: ApiClient, model: string): ModelStore {
  return new ModelStore(api, model);
}
