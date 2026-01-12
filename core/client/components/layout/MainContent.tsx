import React from 'react';
import { ViewRenderer } from '../../engine/ViewRenderer';
import type { CurrentView, NavigateParams } from './types';

interface MainContentProps {
  currentView: CurrentView | null;
  onNavigate: (params: NavigateParams) => void;
}

/**
 * Contenu principal avec vue dynamique
 */
export function MainContent({
  currentView,
  onNavigate,
}: MainContentProps): React.ReactElement {
  if (!currentView) {
    return (
      <main className="app-main">
        <div className="main-welcome">
          <h2>Bienvenue dans My ERP</h2>
          <p>Selectionnez un menu pour commencer.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="app-main">
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
          defaults={currentView.defaults}
          onNavigate={onNavigate}
        />
      </div>
    </main>
  );
}
