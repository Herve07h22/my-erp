import { useState, useEffect } from 'react';

const API_BASE = '/api';

export interface ViewDefinition {
  id: string;
  model: string;
  type: string;
  arch?: unknown;
  [key: string]: unknown;
}

export interface ActionDefinition {
  id: string;
  model: string;
  name: string;
  views?: [number, string][];
  [key: string]: unknown;
}

export interface Menu {
  id: string;
  label: string;
  action?: string;
  children?: Menu[];
  sequence?: number;
}

interface ViewResponse {
  success: boolean;
  data: ViewDefinition;
  error?: string;
}

interface ActionResponse {
  success: boolean;
  data: ActionDefinition;
  error?: string;
}

interface MenusResponse {
  success: boolean;
  data: Menu[];
  error?: string;
}

interface UseViewReturn {
  view: ViewDefinition | null;
  loading: boolean;
  error: string | null;
}

interface UseActionReturn {
  action: ActionDefinition | null;
  loading: boolean;
  error: string | null;
}

interface UseMenusReturn {
  menus: Menu[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook pour charger les définitions de vues
 */
export function useView(modelName: string, viewType: string): UseViewReturn {
  const [view, setView] = useState<ViewDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const modelPath = modelName.replace(/\./g, '/');

  useEffect(() => {
    async function loadView(): Promise<void> {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/views/${modelPath}/${viewType}`);
        const data: ViewResponse = await res.json();

        if (data.success) {
          setView(data.data);
        } else {
          setError(data.error || 'Unknown error');
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    loadView();
  }, [modelPath, viewType]);

  return { view, loading, error };
}

/**
 * Hook pour charger une action
 */
export function useAction(actionId: string | null): UseActionReturn {
  const [action, setAction] = useState<ActionDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!actionId) {
      setLoading(false);
      return;
    }

    async function loadAction(): Promise<void> {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/actions/${actionId}`);
        const data: ActionResponse = await res.json();

        if (data.success) {
          setAction(data.data);
        } else {
          setError(data.error || 'Unknown error');
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    loadAction();
  }, [actionId]);

  return { action, loading, error };
}

/**
 * Hook pour charger les menus
 */
export function useMenus(): UseMenusReturn {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMenus(): Promise<void> {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/menus`);
        const data: MenusResponse = await res.json();

        if (data.success) {
          setMenus(data.data);
        } else {
          setError(data.error || 'Unknown error');
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    loadMenus();
  }, []);

  return { menus, loading, error };
}

export default useView;
