import React, { useState, useEffect, useCallback } from 'react';
import { useMenus } from '../engine/hooks';
import { ViewRenderer } from '../engine/ViewRenderer';

interface Menu {
  id: string;
  label: string;
  action?: string;
  children?: Menu[];
}

interface CurrentView {
  model: string;
  viewType: string;
  recordId: number | null;
  title: string;
}

interface NavigateParams {
  model: string;
  viewType: string;
  recordId?: number | null;
}

interface ActionResponse {
  success: boolean;
  data: {
    model: string;
    name: string;
    views?: [number, string][];
  };
}

/**
 * Construit l'URL à partir de l'état de la vue
 */
function buildUrl(view: CurrentView): string {
  const path = `/${view.model.replace(/\./g, '/')}/${view.viewType}`;
  if (view.recordId) {
    return `${path}/${view.recordId}`;
  }
  return path;
}

/**
 * Parse l'URL pour extraire l'état de la vue
 */
function parseUrl(pathname: string): Partial<CurrentView> | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  // Format: /res/partner/list ou /res/partner/form/123
  const viewType = parts[parts.length - 1].match(/^\d+$/)
    ? parts[parts.length - 2]
    : parts[parts.length - 1];

  const recordId = parts[parts.length - 1].match(/^\d+$/)
    ? parseInt(parts[parts.length - 1], 10)
    : null;

  const modelParts = recordId
    ? parts.slice(0, -2)
    : parts.slice(0, -1);

  const model = modelParts.join('.');

  if (!model || !viewType) return null;

  return { model, viewType, recordId };
}

/**
 * Composant principal de l'application ERP
 */
export function App(): React.ReactElement {
  const { menus, loading: menusLoading } = useMenus();
  const [currentView, setCurrentView] = useState<CurrentView | null>(null);

  // Restaurer l'état depuis l'URL au chargement initial
  useEffect(() => {
    const parsed = parseUrl(window.location.pathname);
    if (parsed && parsed.model) {
      setCurrentView({
        model: parsed.model,
        viewType: parsed.viewType || 'list',
        recordId: parsed.recordId ?? null,
        title: parsed.model,
      });
    }
  }, []);

  // Écouter les événements popstate (back/forward du navigateur)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent): void => {
      if (event.state) {
        setCurrentView(event.state as CurrentView);
      } else {
        // Pas d'état dans l'historique, parser l'URL
        const parsed = parseUrl(window.location.pathname);
        if (parsed && parsed.model) {
          setCurrentView({
            model: parsed.model,
            viewType: parsed.viewType || 'list',
            recordId: parsed.recordId ?? null,
            title: parsed.model,
          });
        } else {
          setCurrentView(null);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = useCallback((view: CurrentView, replace: boolean = false): void => {
    const url = buildUrl(view);
    if (replace) {
      window.history.replaceState(view, '', url);
    } else {
      window.history.pushState(view, '', url);
    }
    setCurrentView(view);
  }, []);

  const handleMenuClick = async (menu: Menu): Promise<void> => {
    if (menu.action) {
      try {
        const res = await fetch(`/api/actions/${menu.action}`);
        const data: ActionResponse = await res.json();

        if (data.success) {
          const action = data.data;
          const view: CurrentView = {
            model: action.model,
            viewType: action.views?.[0]?.[1] || 'list',
            recordId: null,
            title: action.name,
          };
          navigateTo(view);
        }
      } catch (err) {
        console.error('Failed to load action:', err);
      }
    }
  };

  const handleNavigate = ({ model, viewType, recordId }: NavigateParams): void => {
    const view: CurrentView = {
      model,
      viewType,
      recordId: recordId ?? null,
      title: currentView?.title || model,
    };
    navigateTo(view);
  };

  const renderMenu = (menu: Menu, depth: number = 0): React.ReactElement => {
    return (
      <li key={menu.id} className={`menu-item depth-${depth}`}>
        <button
          className="menu-link"
          onClick={() => handleMenuClick(menu)}
          disabled={!menu.action && !menu.children?.length}
        >
          {menu.label}
        </button>
        {menu.children && menu.children.length > 0 && (
          <ul className="menu-children">
            {menu.children.map((child) => renderMenu(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="erp-app">
      <header className="app-header">
        <h1 className="app-title">My ERP</h1>
        <div className="app-user">
          <span>Utilisateur</span>
        </div>
      </header>

      <div className="app-container">
        <nav className="app-sidebar">
          {menusLoading ? (
            <div className="sidebar-loading">Chargement...</div>
          ) : (
            <ul className="menu-root">{menus.map((menu: Menu) => renderMenu(menu))}</ul>
          )}
        </nav>

        <main className="app-main">
          {currentView ? (
            <>
              <div className="main-header">
                <h2>{currentView.title}</h2>
                <div className="breadcrumb">
                  <span>{currentView.model}</span>
                  <span>/</span>
                  <span>{currentView.viewType}</span>
                  {currentView.recordId && (
                    <>
                      <span>/</span>
                      <span>#{currentView.recordId}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="main-content">
                <ViewRenderer
                  model={currentView.model}
                  viewType={currentView.viewType}
                  recordId={currentView.recordId}
                  onNavigate={handleNavigate}
                />
              </div>
            </>
          ) : (
            <div className="main-welcome">
              <h2>Bienvenue dans My ERP</h2>
              <p>Sélectionnez un menu pour commencer.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
