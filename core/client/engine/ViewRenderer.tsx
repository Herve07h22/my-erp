import React from 'react';
import { FormView } from './views/FormView';
import { ListView } from './views/ListView';
import { TimesheetGridView } from './views/TimesheetGridView';
import { useView } from './hooks/useView';
import type { RecordData } from './hooks/useModel';

interface ViewComponents {
  [key: string]: React.ComponentType<ViewProps>;
}

interface NavigateParams {
  model: string;
  viewType: string;
  recordId?: number | null;
  defaults?: Record<string, unknown>;
}

interface ViewProps {
  arch: ViewArch;
  model: string;
  recordId?: number | null;
  initialValues?: Record<string, unknown>;
  onSelect?: (record: RecordData) => void;
  onNew?: () => void;
  onSave?: (record: RecordData) => void;
  onCancel?: () => void;
  onViewChange?: (viewType: string) => void;
}

interface ViewArch {
  [key: string]: unknown;
}

interface ViewRendererProps {
  model: string;
  viewType: string;
  recordId: number | null;
  defaults?: Record<string, unknown>;
  onNavigate?: (params: NavigateParams) => void;
}

const viewComponents: ViewComponents = {
  form: FormView,
  list: ListView,
  // kanban: KanbanView, // À implémenter
  // calendar: CalendarView, // À implémenter
};

// Vues spéciales avec leur propre interface
const specialViews: Record<string, boolean> = {
  grid: true,
};

/**
 * Composant principal de rendu des vues
 * Charge la définition de vue et rend le composant approprié
 */
export function ViewRenderer({
  model,
  viewType,
  recordId,
  defaults,
  onNavigate,
}: ViewRendererProps): React.ReactElement {
  const { view, loading, error } = useView(model, viewType);

  const handleSelect = (record: RecordData): void => {
    onNavigate?.({ model, viewType: 'form', recordId: record.id });
  };

  const handleNew = async (): Promise<void> => {
    // Charger les defaults avant de naviguer (pattern loader)
    try {
      const modelPath = model.replace(/\./g, '/');
      const res = await fetch(`/api/${modelPath}/defaults`);
      const data = await res.json();
      const loadedDefaults = data.success ? data.data : {};
      onNavigate?.({ model, viewType: 'form', recordId: null, defaults: loadedDefaults });
    } catch {
      // En cas d'erreur, naviguer sans defaults
      onNavigate?.({ model, viewType: 'form', recordId: null });
    }
  };

  const handleSave = (): void => {
    onNavigate?.({ model, viewType: 'list' });
  };

  const handleCancel = (): void => {
    onNavigate?.({ model, viewType: 'list' });
  };

  const handleViewChange = (newViewType: string): void => {
    onNavigate?.({ model, viewType: newViewType });
  };

  if (loading) {
    return <div className="view-loading">Chargement de la vue...</div>;
  }

  if (error) {
    return <div className="view-error">Erreur: {error}</div>;
  }

  // Gestion des vues spéciales (grid, etc.)
  if (specialViews[viewType]) {
    if (viewType === 'grid') {
      return (
        <div className={`view-container view-${viewType}`}>
          <TimesheetGridView
            model={model}
            viewDef={view || { id: '', model, type: 'grid', arch: {} }}
            onNavigate={(params) => onNavigate?.(params)}
            onViewChange={(newViewType) => onNavigate?.({ model, viewType: newViewType })}
          />
        </div>
      );
    }
    return (
      <div className="view-error">Type de vue non supporté: {viewType}</div>
    );
  }

  const ViewComponent = viewComponents[viewType];

  if (!ViewComponent) {
    return (
      <div className="view-error">Type de vue non supporté: {viewType}</div>
    );
  }

  // Si pas de vue définie, utiliser une architecture par défaut
  const arch: ViewArch = (view?.arch as ViewArch) || {};

  return (
    <div className={`view-container view-${viewType}`}>
      <ViewComponent
        arch={arch}
        model={model}
        recordId={recordId}
        initialValues={defaults}
        onSelect={handleSelect}
        onNew={handleNew}
        onSave={handleSave}
        onCancel={handleCancel}
        onViewChange={handleViewChange}
      />
    </div>
  );
}

export default ViewRenderer;
