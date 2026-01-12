import React, { ChangeEvent } from 'react';
import { ViewSwitcher, ViewMode } from '../../components/ViewSwitcher';

interface ListHeaderProps {
  selectedCount: number;
  supportsGrid: boolean;
  onNew: () => void;
  onDelete: () => void;
  onSearch: (value: string) => void;
  onViewChange?: (viewType: ViewMode) => void;
}

/**
 * En-tete de la liste avec recherche et actions
 */
export function ListHeader({
  selectedCount,
  supportsGrid,
  onNew,
  onDelete,
  onSearch,
  onViewChange,
}: ListHeaderProps): React.ReactElement {
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>): void => {
    onSearch(e.target.value);
  };

  return (
    <header className="list-header">
      <div className="list-actions">
        <button onClick={onNew} className="btn btn-primary">
          Nouveau
        </button>
        <button
          onClick={onDelete}
          disabled={selectedCount === 0}
          className="btn btn-danger"
        >
          Supprimer ({selectedCount})
        </button>
      </div>
      <div className="list-search">
        <input
          type="text"
          placeholder="Rechercher..."
          onChange={handleSearchChange}
          className="search-input"
        />
      </div>
      {supportsGrid && onViewChange && (
        <ViewSwitcher
          currentView="list"
          onViewChange={onViewChange}
          availableViews={['list', 'grid']}
        />
      )}
    </header>
  );
}
