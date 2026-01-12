/**
 * Implémentation réelle du client API utilisant fetch
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
import { ApiError } from './types.js';

const API_BASE = '/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  error?: string;
}

function modelToPath(model: string): string {
  return model.replace(/\./g, '/');
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const json: ApiResponse<T> = await response.json();

  if (!json.success) {
    throw new ApiError(json.error || 'Unknown error', response.status);
  }

  return json.data;
}

async function handleSearchResponse<T>(
  response: Response
): Promise<SearchResult<T>> {
  const json: ApiResponse<T[]> = await response.json();

  if (!json.success) {
    throw new ApiError(json.error || 'Unknown error', response.status);
  }

  return {
    data: json.data,
    count: json.count,
  };
}

/**
 * Client API utilisant fetch() pour les appels HTTP
 */
export class FetchApiClient implements ApiClient {
  async search<T = RecordData>(
    model: string,
    domain: Domain = [],
    options: SearchOptions = {}
  ): Promise<SearchResult<T>> {
    const params = new URLSearchParams();

    if (domain.length) {
      params.set('domain', JSON.stringify(domain));
    }
    if (options.limit) params.set('limit', String(options.limit));
    if (options.offset) params.set('offset', String(options.offset));
    if (options.order) params.set('order', options.order);

    const path = modelToPath(model);
    const response = await fetch(`${API_BASE}/${path}?${params}`);
    return handleSearchResponse<T>(response);
  }

  async read<T = RecordData>(model: string, id: number): Promise<T> {
    const path = modelToPath(model);
    const response = await fetch(`${API_BASE}/${path}/${id}`);
    return handleResponse<T>(response);
  }

  async create<T = RecordData>(
    model: string,
    data: Partial<T>
  ): Promise<T> {
    const path = modelToPath(model);
    const response = await fetch(`${API_BASE}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<T>(response);
  }

  async update<T = RecordData>(
    model: string,
    id: number,
    data: Partial<T>
  ): Promise<T> {
    const path = modelToPath(model);
    const response = await fetch(`${API_BASE}/${path}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<T>(response);
  }

  async delete(model: string, id: number): Promise<void> {
    const path = modelToPath(model);
    const response = await fetch(`${API_BASE}/${path}/${id}`, {
      method: 'DELETE',
    });

    if (response.status !== 204) {
      const json = await response.json();
      if (!json.success) {
        throw new ApiError(json.error || 'Delete failed', response.status);
      }
    }
  }

  async execute<T = unknown>(
    model: string,
    id: number,
    action: string,
    params: Record<string, unknown> = {}
  ): Promise<T> {
    const path = modelToPath(model);
    const response = await fetch(
      `${API_BASE}/${path}/${id}/action/${action}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      }
    );
    return handleResponse<T>(response);
  }

  async getFields(model: string): Promise<FieldsCollection> {
    const path = modelToPath(model);
    const response = await fetch(`${API_BASE}/models/${path}`);
    const data = await handleResponse<{ fields: FieldsCollection }>(response);
    return data.fields;
  }

  async getDefaults(model: string): Promise<Record<string, unknown>> {
    const path = modelToPath(model);
    const response = await fetch(`${API_BASE}/${path}/defaults`);
    return handleResponse<Record<string, unknown>>(response);
  }

  async getView(model: string, type: string): Promise<ViewDefinition> {
    const path = modelToPath(model);
    const response = await fetch(`${API_BASE}/views/${path}/${type}`);
    return handleResponse<ViewDefinition>(response);
  }

  async getAction(actionId: string): Promise<ActionDefinition> {
    const response = await fetch(`${API_BASE}/actions/${actionId}`);
    return handleResponse<ActionDefinition>(response);
  }

  async getMenus(): Promise<MenuItem[]> {
    const response = await fetch(`${API_BASE}/menus`);
    return handleResponse<MenuItem[]>(response);
  }

  async uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await handleResponse<{ url: string }>(response);
    return data.url;
  }

  async uploadFiles(files: File[]): Promise<string[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const response = await fetch(`${API_BASE}/upload/multiple`, {
      method: 'POST',
      body: formData,
    });
    const data = await handleResponse<{ urls: string[] }>(response);
    return data.urls;
  }
}

// Instance singleton pour l'application
export const apiClient = new FetchApiClient();
