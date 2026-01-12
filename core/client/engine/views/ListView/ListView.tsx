import React, { useState, useEffect, ChangeEvent } from 'react';
import { useModel } from '../../hooks/useModel';
import { ListHeader } from './ListHeader';
import { ListTable } from './ListTable';
import { ListFooter } from './ListFooter';
import type { ViewArch, SearchDomain, RecordData } from './types';
import type { ViewMode } from '../../components/ViewSwitcher';

interface ListViewProps {
  arch: ViewArch;
  model: string;
  onSelect?: (record: RecordData) => void;
  onNew?: () => void;
  onViewChange?: (viewType: ViewMode) => void;
}

// Modeles qui supportent la vue grille
const GRID_ENABLED_MODELS = ['account.analytic.line'];

/**
 * Composant de vue liste
 * Compose ListHeader, ListTable et ListFooter
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
  const fieldNames = arch.fields || Object.keys(fields).slice(0, 5);

  useEffect(() => {
    search(searchDomain);
  }, [search, searchDomain]);

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

  const handleSearch = (value: string): void => {
    if (value) {
      const textField = fieldNames.find((f) => fields[f]?.type === 'string');
      if (textField) {
        setSearchDomain([[textField, 'ilike', `%${value}%`]]);
      }
    } else {
      setSearchDomain([]);
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
      <ListHeader
        selectedCount={selectedIds.size}
        supportsGrid={supportsGrid}
        onNew={() => onNew?.()}
        onDelete={handleDelete}
        onSearch={handleSearch}
        onViewChange={onViewChange}
      />

      <ListTable
        records={records}
        fields={fields}
        fieldNames={fieldNames}
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onSelectOne={handleSelectOne}
        onRowClick={handleRowClick}
      />

      <ListFooter count={records.length} />
    </div>
  );
}

export default ListView;
