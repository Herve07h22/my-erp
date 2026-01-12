/**
 * Classe de base pour les stores
 * Implémente le pattern observable compatible avec useSyncExternalStore
 */

type Listener = () => void;

/**
 * Store de base avec pattern observable
 * Compatible avec React useSyncExternalStore
 */
export abstract class Store<TState> {
  private listeners = new Set<Listener>();
  protected state: TState;

  constructor(initialState: TState) {
    this.state = initialState;
  }

  /**
   * Abonne un listener aux changements d'état
   * Retourne une fonction pour se désabonner
   */
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Retourne l'état actuel (snapshot immutable)
   */
  getSnapshot = (): TState => {
    return this.state;
  };

  /**
   * Met à jour l'état et notifie les listeners
   */
  protected setState(updater: Partial<TState> | ((prev: TState) => TState)): void {
    if (typeof updater === 'function') {
      this.state = updater(this.state);
    } else {
      this.state = { ...this.state, ...updater };
    }
    this.notify();
  }

  /**
   * Notifie tous les listeners d'un changement
   */
  protected notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

/**
 * État de chargement commun à tous les stores
 */
export interface LoadingState {
  loading: boolean;
  error: string | null;
}

/**
 * Helper pour créer un état initial avec loading
 */
export function withLoading<T>(state: T): T & LoadingState {
  return {
    ...state,
    loading: false,
    error: null,
  };
}
