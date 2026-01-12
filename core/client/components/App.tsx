import React, { useState, useEffect, useCallback } from 'react';
import { useMenus } from '../engine/hooks';
import { AppHeader } from './layout/AppHeader';
import { Sidebar } from './layout/Sidebar';
import { MainContent } from './layout/MainContent';
import type { Menu, CurrentView, NavigateParams } from './layout/types';

interface ActionResponse {
  success: boolean;
  data: {
    model: string;
    name: string;
    views?: [number, string][];
  };
}

/**
 * Construit l'URL a partir de l'etat de la vue
 */
function buildUrl(view: CurrentView): string {
  const path = `/${view.model.replace(/\./g, '/')}/${view.viewType}`;
  if (view.recordId) {
    return `${path}/${view.recordId}`;
  }
  return path;
}

/**
 * Parse l'URL pour extraire l'etat de la vue
 */
function parseUrl(pathname: string): Partial<CurrentView> | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const viewType = parts[parts.length - 1].match(/^\d+$/)
    ? parts[parts.length - 2]
    : parts[parts.length - 1];

  const recordId = parts[parts.length - 1].match(/^\d+$/)
    ? parseInt(parts[parts.length - 1], 10)
    : null;

  const modelParts = recordId ? parts.slice(0, -2) : parts.slice(0, -1);
  const model = modelParts.join('.');

  if (!model || !viewType) return null;

  return { model, viewType, recordId };
}

/**
 * Composant principal de l'application ERP
 * Compose AppHeader, Sidebar et MainContent
 */
export function App(): React.ReactElement {
  const { menus, loading: menusLoading } = useMenus();
  const [currentView, setCurrentView] = useState<CurrentView | null>(null);

  // Restaurer l'etat depuis l'URL au chargement initial
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

  // Ecouter les evenements popstate (back/forward)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent): void => {
      if (event.state) {
        setCurrentView(event.state as CurrentView);
      } else {
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

  const navigateTo = useCallback(
    (view: CurrentView, replace: boolean = false): void => {
      const url = buildUrl(view);
      if (replace) {
        window.history.replaceState(view, '', url);
      } else {
        window.history.pushState(view, '', url);
      }
      setCurrentView(view);
    },
    []
  );

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

  const handleNavigate = ({
    model,
    viewType,
    recordId,
    defaults,
  }: NavigateParams): void => {
    const view: CurrentView = {
      model,
      viewType,
      recordId: recordId ?? null,
      title: currentView?.title || model,
      defaults,
    };
    navigateTo(view);
  };

  return (
    <div className="erp-app">
      <AppHeader />

      <div className="app-container">
        <Sidebar
          menus={menus}
          loading={menusLoading}
          onMenuClick={handleMenuClick}
        />

        <MainContent currentView={currentView} onNavigate={handleNavigate} />
      </div>
    </div>
  );
}

export default App;
