import React, { useState, useEffect, ChangeEvent } from 'react';
import { useModel } from '../hooks/useModel';
import type { RecordData, FieldDefinition } from '../hooks/useModel';
import { ViewSwitcher, ViewMode } from '../components/ViewSwitcher';
import { ErpDate, ErpDateTime } from '../../../shared/erp-date/index.js';

interface ViewArch {
  fields?: string[];
  allowGrid?: boolean;
  [key: string]: unknown;
}

interface ListViewProps {
  arch: ViewArch;
  model: string;
  onSelect?: (record: RecordData) => void;
  onNew?: () => void;
  onViewChange?: (viewType: ViewMode) => void;
}

// Modèles qui supportent la vue grille
const GRID_ENABLED_MODELS = ['account.analytic.line'];

type SearchDomain = [string, string, string][];

/**
 * Composant de vue liste
 * Affiche les enregistrements dans un tableau
 */
export function ListView({
  arch,
  model,
  onSelect,
  onNew,
  onViewChange,
}: ListViewProps): React.ReactElement {
  const { records, fields, loading, error, search, remove } = useModel(model);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchDomain, setSearchDomain] = useState<SearchDomain>([]);

  const supportsGrid = arch.allowGrid || GRID_ENABLED_MODELS.includes(model);

  useEffect(() => {
    search(searchDomain);
  }, [search, searchDomain]);

  const fieldNames = arch.fields || Object.keys(fields).slice(0, 5);

  const handleSelectAll = (e: ChangeEvent<HTMLInputElement>): void => {
    if (e.target.checked) {
      setSelectedIds(new Set(records.map((r) => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: number): void => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleRowClick = (record: RecordData): void => {
    onSelect?.(record);
  };

  const handleDelete = async (): Promise<void> => {
    if (selectedIds.size === 0) return;

    if (confirm(`Supprimer ${selectedIds.size} enregistrement(s) ?`)) {
      for (const id of selectedIds) {
        await remove(id);
      }
      setSelectedIds(new Set());
      search(searchDomain);
    }
  };

  const formatValue = (value: unknown, fieldDef?: FieldDefinition): string => {
    if (value === null || value === undefined) return '-';

    switch (fieldDef?.type) {
      case 'boolean':
        return value ? 'Oui' : 'Non';
      case 'date':
        return ErpDate.parse(value)?.formatLocale() ?? '-';
      case 'datetime':
        return ErpDateTime.parse(value)?.formatDateTime() ?? '-';
      case 'monetary':
      case 'float':
        return typeof value === 'number' ? value.toFixed(2) : String(value);
      case 'selection': {
        const opt = fieldDef.options?.find(([v]) => v === value);
        return opt ? opt[1] : String(value);
      }
      case 'many2one': {
        // Le backend retourne { id, name } pour les champs many2one
        if (typeof value === 'object' && value !== null && 'name' in value) {
          return (value as { name: string }).name;
        }
        return String(value);
      }
      default:
        return String(value);
    }
  };

  if (loading) {
    return <div className="list-loading">Chargement...</div>;
  }

  if (error) {
    return <div className="list-error">Erreur: {error}</div>;
  }

  return (
    <div className="list-view">
      <header className="list-header">
        <div className="list-actions">
          <button onClick={() => onNew?.()} className="btn btn-primary">
            Nouveau
          </button>
          <button
            onClick={handleDelete}
            disabled={selectedIds.size === 0}
            className="btn btn-danger"
          >
            Supprimer ({selectedIds.size})
          </button>
        </div>
        <div className="list-search">
          <input
            type="text"
            placeholder="Rechercher..."
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              if (value) {
                // Recherche simple sur le premier champ texte
                const textField = fieldNames.find(
                  (f) => fields[f]?.type === 'string'
                );
                if (textField) {
                  setSearchDomain([[textField, 'ilike', `%${value}%`]]);
                }
              } else {
                setSearchDomain([]);
              }
            }}
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

      <table className="list-table">
        <thead>
          <tr>
            <th className="col-checkbox">
              <input
                type="checkbox"
                onChange={handleSelectAll}
                checked={
                  selectedIds.size === records.length && records.length > 0
                }
              />
            </th>
            {fieldNames.map((fieldName) => (
              <th key={fieldName}>{fields[fieldName]?.label || fieldName}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td colSpan={fieldNames.length + 1} className="no-records">
                Aucun enregistrement
              </td>
            </tr>
          ) : (
            records.map((record) => (
              <tr
                key={record.id}
                onClick={() => handleRowClick(record)}
                className={selectedIds.has(record.id) ? 'selected' : ''}
              >
                <td
                  className="col-checkbox"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(record.id)}
                    onChange={() => handleSelectOne(record.id)}
                  />
                </td>
                {fieldNames.map((fieldName) => (
                  <td key={fieldName}>
                    {formatValue(record[fieldName], fields[fieldName])}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      <footer className="list-footer">
        <span>{records.length} enregistrement(s)</span>
      </footer>
    </div>
  );
}

export default ListView;
