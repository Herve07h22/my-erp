import express, { Router, Request, Response } from 'express';

export interface ViewDefinition {
  id: string;
  model: string;
  type: string;
  arch?: unknown;
  [key: string]: unknown;
}

export interface ActionDefinition {
  id: string;
  model?: string;
  [key: string]: unknown;
}

export interface MenuDefinition {
  id: string;
  label: string;
  parent?: string;
  sequence?: number;
  action?: string;
  children?: MenuNode[];
}

export interface MenuNode extends MenuDefinition {
  children: MenuNode[];
}

export interface ViewDefinitions {
  views?: ViewDefinition[];
  actions?: ActionDefinition[];
  menus?: MenuDefinition[];
}

/**
 * Service de gestion des vues
 * Stocke et sert les définitions de vues pour le frontend
 */
export class ViewService {
  private views: Map<string, ViewDefinition> = new Map();
  private actions: Map<string, ActionDefinition> = new Map();
  private menus: MenuDefinition[] = [];

  /**
   * Enregistre les vues d'un module
   */
  registerViews(viewDefinitions: ViewDefinitions | null): void {
    if (!viewDefinitions) return;

    // Enregistrer les vues
    if (viewDefinitions.views) {
      for (const view of viewDefinitions.views) {
        const key = `${view.model}:${view.type}:${view.id}`;
        this.views.set(key, view);
        this.views.set(view.id, view);
      }
    }

    // Enregistrer les actions
    if (viewDefinitions.actions) {
      for (const action of viewDefinitions.actions) {
        this.actions.set(action.id, action);
      }
    }

    // Enregistrer les menus
    if (viewDefinitions.menus) {
      this.menus.push(...viewDefinitions.menus);
    }
  }

  /**
   * Récupère une vue par son ID
   */
  getView(viewId: string): ViewDefinition | undefined {
    return this.views.get(viewId);
  }

  /**
   * Récupère la vue par défaut d'un modèle pour un type donné
   */
  getViewForModel(modelName: string, viewType: string): ViewDefinition | null {
    for (const [, view] of this.views) {
      if (view.model === modelName && view.type === viewType) {
        return view;
      }
    }
    return null;
  }

  /**
   * Récupère une action par son ID
   */
  getAction(actionId: string): ActionDefinition | undefined {
    return this.actions.get(actionId);
  }

  /**
   * Récupère l'arbre des menus
   */
  getMenus(): MenuNode[] {
    // Construire la hiérarchie des menus
    const menuMap = new Map<string, MenuNode>();
    const roots: MenuNode[] = [];

    // Premier passage : créer tous les menus
    for (const menu of this.menus) {
      menuMap.set(menu.id, { ...menu, children: [] });
    }

    // Deuxième passage : construire la hiérarchie
    for (const menu of this.menus) {
      const menuNode = menuMap.get(menu.id)!;
      if (menu.parent) {
        const parent = menuMap.get(menu.parent);
        if (parent) {
          parent.children.push(menuNode);
        }
      } else {
        roots.push(menuNode);
      }
    }

    // Trier par séquence
    const sortBySequence = (a: MenuNode, b: MenuNode): number =>
      (a.sequence || 0) - (b.sequence || 0);
    roots.sort(sortBySequence);
    for (const menu of menuMap.values()) {
      menu.children.sort(sortBySequence);
    }

    return roots;
  }

  /**
   * Crée le routeur Express pour les vues
   */
  createRouter(): Router {
    const router = express.Router();

    // Récupérer une vue spécifique (wildcard pour supporter les modèles avec points/slashes)
    // Ex: /api/views/res/partner/list -> model=res.partner, type=list
    router.get('/api/views/*', (req: Request, res: Response) => {
      const parts = req.params[0].split('/');
      const viewType = parts.pop()!; // Dernier segment = type de vue
      const modelName = parts.join('.'); // Le reste = nom du modèle

      if (!modelName) {
        // Liste toutes les vues
        const views = [...this.views.values()].filter((v) => v.model);
        return res.json({ success: true, data: views });
      }

      if (!viewType || viewType === modelName) {
        // Liste des vues d'un modèle
        const views: ViewDefinition[] = [];
        for (const view of this.views.values()) {
          if (view.model === modelName) {
            views.push(view);
          }
        }
        return res.json({ success: true, data: views });
      }

      // Vue spécifique
      const view = this.getViewForModel(modelName, viewType);

      if (!view) {
        return res.status(404).json({
          success: false,
          error: `View not found for ${modelName}/${viewType}`,
        });
      }

      res.json({ success: true, data: view });
    });

    // Récupérer une action
    router.get('/api/actions/:id', (req: Request, res: Response) => {
      const action = this.getAction(req.params.id);

      if (!action) {
        return res.status(404).json({
          success: false,
          error: 'Action not found',
        });
      }

      res.json({ success: true, data: action });
    });

    // Récupérer les menus
    router.get('/api/menus', (_req: Request, res: Response) => {
      res.json({ success: true, data: this.getMenus() });
    });

    return router;
  }
}
