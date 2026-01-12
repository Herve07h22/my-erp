/**
 * Hook bridge entre les stores et React
 * Utilise useSyncExternalStore pour une intégration optimale
 */
import { useSyncExternalStore, useCallback, useMemo } from 'react';
import type { Store } from './base.js';

/**
 * Hook pour s'abonner à un store et obtenir son état
 * Re-render automatique quand l'état change
 *
 * @example
 * const state = useStore(modelStore);
 * // state contient { records, loading, error, ... }
 */
export function useStore<TState>(store: Store<TState>): TState {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

/**
 * Hook pour s'abonner à une partie spécifique de l'état d'un store
 * Évite les re-renders inutiles si la partie sélectionnée n'a pas changé
 *
 * @example
 * const records = useStoreSelector(modelStore, (state) => state.records);
 */
export function useStoreSelector<TState, TSelected>(
  store: Store<TState>,
  selector: (state: TState) => TSelected
): TSelected {
  // Mémoïse le snapshot sélectionné pour éviter les re-renders
  const getSnapshot = useCallback(() => {
    return selector(store.getSnapshot());
  }, [store, selector]);

  return useSyncExternalStore(store.subscribe, getSnapshot);
}

/**
 * Hook pour créer une instance de store mémoïsée
 * Utile quand le store dépend de paramètres (ex: modelName)
 *
 * @example
 * const store = useStoreInstance(
 *   () => new ModelStore(api, 'res.partner'),
 *   [api, 'res.partner']
 * );
 */
export function useStoreInstance<TStore>(
  factory: () => TStore,
  deps: unknown[]
): TStore {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, deps);
}
