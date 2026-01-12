/**
 * ViewStore - Gestion des définitions de vues et menus
 * Classe JS pure, testable avec injection de l'API client
 */
import { Store, withLoading, type LoadingState } from './base.js';
import type {
  ApiClient,
  ViewDefinition,
  ActionDefinition,
  MenuItem,
} from '../api/types.js';

// Store pour une vue spécifique
export interface ViewState extends LoadingState {
  model: string;
  type: string;
  view: ViewDefinition | null;
}

function createViewState(model: string, type: string): ViewState {
  return withLoading({
    model,
    type,
    view: null,
  });
}

/**
 * Store pour charger une définition de vue
 */
export class ViewStore extends Store<ViewState> {
  private api: ApiClient;

  constructor(api: ApiClient, model: string, type: string) {
    super(createViewState(model, type));
    this.api = api;
  }

  async load(): Promise<ViewDefinition | null> {
    this.setState({ loading: true, error: null });

    try {
      const view = await this.api.getView(this.state.model, this.state.type);
      this.setState({ view, loading: false });
      return view;
    } catch (err) {
      this.setState({ error: (err as Error).message, loading: false });
      return null;
    }
  }
}

// Store pour une action
export interface ActionState extends LoadingState {
  actionId: string | null;
  action: ActionDefinition | null;
}

function createActionState(actionId: string | null): ActionState {
  return withLoading({
    actionId,
    action: null,
  });
}

/**
 * Store pour charger une définition d'action
 */
export class ActionStore extends Store<ActionState> {
  private api: ApiClient;

  constructor(api: ApiClient, actionId: string | null = null) {
    super(createActionState(actionId));
    this.api = api;
  }

  async load(actionId?: string): Promise<ActionDefinition | null> {
    const id = actionId ?? this.state.actionId;
    if (!id) {
      return null;
    }

    this.setState({ loading: true, error: null, actionId: id });

    try {
      const action = await this.api.getAction(id);
      this.setState({ action, loading: false });
      return action;
    } catch (err) {
      this.setState({ error: (err as Error).message, loading: false });
      return null;
    }
  }
}

// Store pour les menus
export interface MenuState extends LoadingState {
  menus: MenuItem[];
}

function createMenuState(): MenuState {
  return withLoading({
    menus: [],
  });
}

/**
 * Store pour charger les menus
 */
export class MenuStore extends Store<MenuState> {
  private api: ApiClient;
  private loaded = false;

  constructor(api: ApiClient) {
    super(createMenuState());
    this.api = api;
  }

  async load(): Promise<MenuItem[]> {
    // Ne charge qu'une fois
    if (this.loaded && this.state.menus.length > 0) {
      return this.state.menus;
    }

    this.setState({ loading: true, error: null });

    try {
      const menus = await this.api.getMenus();
      this.setState({ menus, loading: false });
      this.loaded = true;
      return menus;
    } catch (err) {
      this.setState({ error: (err as Error).message, loading: false });
      return [];
    }
  }

  /**
   * Trouve un menu par son ID (recherche récursive)
   */
  findMenu(menuId: string): MenuItem | null {
    const findInMenus = (menus: MenuItem[]): MenuItem | null => {
      for (const menu of menus) {
        if (menu.id === menuId) {
          return menu;
        }
        if (menu.children) {
          const found = findInMenus(menu.children);
          if (found) return found;
        }
      }
      return null;
    };

    return findInMenus(this.state.menus);
  }

  /**
   * Force le rechargement
   */
  async reload(): Promise<MenuItem[]> {
    this.loaded = false;
    return this.load();
  }
}

/**
 * Factories
 */
export function createViewStore(
  api: ApiClient,
  model: string,
  type: string
): ViewStore {
  return new ViewStore(api, model, type);
}

export function createActionStore(
  api: ApiClient,
  actionId?: string
): ActionStore {
  return new ActionStore(api, actionId ?? null);
}

export function createMenuStore(api: ApiClient): MenuStore {
  return new MenuStore(api);
}
