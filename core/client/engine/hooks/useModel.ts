import { useState, useEffect, useCallback } from 'react';
import { getErrorMessage } from '../../../shared/utils/errors.js';

const API_BASE = '/api';

export interface FieldDefinition {
  type: string;
  label?: string;
  required?: boolean;
  options?: [string, string][];
  relation?: string;
  inverse?: string;
  [key: string]: unknown;
}

export interface FieldsCollection {
  [fieldName: string]: FieldDefinition;
}

export interface RecordData {
  id: number;
  [key: string]: unknown;
}

interface ModelResponse {
  success: boolean;
  data: {
    fields: FieldsCollection;
  };
  error?: string;
}

interface SingleRecordResponse {
  success: boolean;
  data: RecordData;
  error?: string;
}

interface MultiRecordResponse {
  success: boolean;
  data: RecordData[];
  count?: number;
  error?: string;
}

interface SearchOptions {
  limit?: number;
  offset?: number;
  order?: string;
}

interface UseModelReturn {
  record: RecordData | null;
  records: RecordData[];
  fields: FieldsCollection;
  loading: boolean;
  error: string | null;
  search: (domain?: unknown[], options?: SearchOptions) => Promise<RecordData[]>;
  create: (values: Record<string, unknown>) => Promise<RecordData | null>;
  save: (values: Record<string, unknown>) => Promise<RecordData | null>;
  remove: (id?: number) => Promise<boolean>;
  execute: (actionName: string, params?: Record<string, unknown>) => Promise<unknown>;
  refresh: () => Promise<RecordData[]>;
}

/**
 * Hook pour interagir avec un modèle ORM depuis React
 */
export function useModel(
  modelName: string,
  recordId: number | null = null
): UseModelReturn {
  const [record, setRecord] = useState<RecordData | null>(null);
  const [records, setRecords] = useState<RecordData[]>([]);
  const [fields, setFields] = useState<FieldsCollection>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modelPath = modelName.replace(/\./g, '/');

  // Charger les métadonnées du modèle
  useEffect(() => {
    async function loadFields(): Promise<void> {
      try {
        const res = await fetch(`${API_BASE}/models/${modelPath}`);
        const data: ModelResponse = await res.json();
        if (data.success) {
          setFields(data.data.fields);
        }
      } catch (err) {
        console.error('Failed to load model fields:', err);
      }
    }
    loadFields();
  }, [modelPath]);

  // Charger un enregistrement spécifique
  useEffect(() => {
    if (!recordId) {
      setRecord(null);
      return;
    }

    async function loadRecord(): Promise<void> {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/${modelPath}/${recordId}`);
        const data: SingleRecordResponse = await res.json();
        if (data.success) {
          setRecord(data.data);
        } else {
          setError(data.error || 'Unknown error');
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    loadRecord();
  }, [modelPath, recordId]);

  // Rechercher des enregistrements
  const search = useCallback(
    async (
      domain: unknown[] = [],
      options: SearchOptions = {}
    ): Promise<RecordData[]> => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (domain.length) {
          params.set('domain', JSON.stringify(domain));
        }
        if (options.limit) params.set('limit', String(options.limit));
        if (options.offset) params.set('offset', String(options.offset));
        if (options.order) params.set('order', options.order);

        const res = await fetch(`${API_BASE}/${modelPath}?${params}`);
        const data: MultiRecordResponse = await res.json();

        if (data.success) {
          setRecords(data.data);
          return data.data;
        } else {
          setError(data.error || 'Unknown error');
          return [];
        }
      } catch (err) {
        setError(getErrorMessage(err));
        return [];
      } finally {
        setLoading(false);
      }
    },
    [modelPath]
  );

  // Créer un enregistrement
  const create = useCallback(
    async (values: Record<string, unknown>): Promise<RecordData | null> => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/${modelPath}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
        const data: SingleRecordResponse = await res.json();

        if (data.success) {
          setRecord(data.data);
          return data.data;
        } else {
          setError(data.error || 'Unknown error');
          return null;
        }
      } catch (err) {
        setError(getErrorMessage(err));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [modelPath]
  );

  // Sauvegarder un enregistrement
  const save = useCallback(
    async (values: Record<string, unknown>): Promise<RecordData | null> => {
      if (!recordId) {
        return create(values);
      }

      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/${modelPath}/${recordId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
        const data: SingleRecordResponse = await res.json();

        if (data.success) {
          setRecord(data.data);
          return data.data;
        } else {
          setError(data.error || 'Unknown error');
          return null;
        }
      } catch (err) {
        setError(getErrorMessage(err));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [modelPath, recordId, create]
  );

  // Supprimer un enregistrement
  const remove = useCallback(
    async (id: number = recordId!): Promise<boolean> => {
      if (!id) return false;

      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/${modelPath}/${id}`, {
          method: 'DELETE',
        });

        if (res.status === 204) {
          setRecord(null);
          return true;
        } else {
          const data: SingleRecordResponse = await res.json();
          setError(data.error || 'Unknown error');
          return false;
        }
      } catch (err) {
        setError(getErrorMessage(err));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [modelPath, recordId]
  );

  // Exécuter une action métier
  const execute = useCallback(
    async (
      actionName: string,
      params: Record<string, unknown> = {}
    ): Promise<unknown> => {
      if (!recordId) {
        setError('No record selected');
        return null;
      }

      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/${modelPath}/${recordId}/action/${actionName}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
          }
        );
        const data: SingleRecordResponse = await res.json();

        if (data.success) {
          // Recharger l'enregistrement après l'action
          const refreshRes = await fetch(`${API_BASE}/${modelPath}/${recordId}`);
          const refreshData: SingleRecordResponse = await refreshRes.json();
          if (refreshData.success) {
            setRecord(refreshData.data);
          }
          return data.data;
        } else {
          setError(data.error || 'Unknown error');
          return null;
        }
      } catch (err) {
        setError(getErrorMessage(err));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [modelPath, recordId]
  );

  return {
    record,
    records,
    fields,
    loading,
    error,
    search,
    create,
    save,
    remove,
    execute,
    refresh: () => search(),
  };
}

export default useModel;
