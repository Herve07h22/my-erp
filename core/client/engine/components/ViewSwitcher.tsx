import React from 'react';

export type ViewMode = 'list' | 'grid';

interface ViewSwitcherProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  availableViews?: ViewMode[];
}

/**
 * Sélecteur de mode d'affichage Liste/Grille
 */
export function ViewSwitcher({
  currentView,
  onViewChange,
  availableViews = ['list', 'grid'],
}: ViewSwitcherProps): React.ReactElement {
  return (
    <div className="view-switcher">
      {availableViews.includes('list') && (
        <button
          type="button"
          className={`view-switcher-btn ${currentView === 'list' ? 'active' : ''}`}
          onClick={() => onViewChange('list')}
          title="Vue Liste"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="1" y="2" width="14" height="2" rx="0.5" />
            <rect x="1" y="7" width="14" height="2" rx="0.5" />
            <rect x="1" y="12" width="14" height="2" rx="0.5" />
          </svg>
        </button>
      )}
      {availableViews.includes('grid') && (
        <button
          type="button"
          className={`view-switcher-btn ${currentView === 'grid' ? 'active' : ''}`}
          onClick={() => onViewChange('grid')}
          title="Vue Grille"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="1" y="1" width="6" height="6" rx="1" />
            <rect x="9" y="1" width="6" height="6" rx="1" />
            <rect x="1" y="9" width="6" height="6" rx="1" />
            <rect x="9" y="9" width="6" height="6" rx="1" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default ViewSwitcher;
