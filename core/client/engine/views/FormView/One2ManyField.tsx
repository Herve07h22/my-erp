import React, { useState, useEffect, useCallback } from 'react';
import { FieldRenderer } from '../../fields/FieldRenderer';
import type { FieldDefinition, RecordData } from '../../hooks/useModel';

const API_BASE = '/api';

interface RelationFields {
  [fieldName: string]: FieldDefinition;
}

interface One2ManyFieldProps {
  fieldName: string;
  definition?: FieldDefinition;
  columns: string[];
  parentId: number | null;
}

/**
 * Composant pour afficher et éditer les champs one2many
 */
export function One2ManyField({
  fieldName,
  definition,
  columns,
  parentId,
}: One2ManyFieldProps): React.ReactElement {
  const [records, setRecords] = useState<RecordData[]>([]);
  const [loading, setLoading] = useState(false);
  const [newRecord, setNewRecord] = useState<Record<string, unknown> | null>(null);
  const [relationFields, setRelationFields] = useState<RelationFields>({});
  const [newRecordErrors, setNewRecordErrors] = useState<Record<string, string>>({});

  const fieldLabel = definition?.label || fieldName;
  const relation = definition?.relation || '';
  const inverse = definition?.inverse || 'parent_id';
  const relationPath = relation.replace(/\./g, '/');

  useEffect(() => {
    const fetchRelationFields = async () => {
      if (!relation) return;
      try {
        const res = await fetch(`${API_BASE}/models/${relationPath}`);
        const data = await res.json();
        if (data.success && data.data?.fields) {
          setRelationFields(data.data.fields);
        }
      } catch (err) {
        console.error('Failed to load relation fields:', err);
      }
    };
    fetchRelationFields();
  }, [relation, relationPath]);

  const loadChildren = useCallback(async () => {
    if (!parentId || !relation) return;

    setLoading(true);
    try {
      const domain = JSON.stringify([[inverse, '=', parentId]]);
      const res = await fetch(`${API_BASE}/${relationPath}?domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load children:', err);
    } finally {
      setLoading(false);
    }
  }, [parentId, relation, inverse, relationPath]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  const handleStartAdd = (): void => {
    const empty: Record<string, unknown> = {};
    columns.forEach((col) => {
      const fieldDef = relationFields[col];
      if (fieldDef?.default !== undefined) {
        empty[col] = typeof fieldDef.default === 'function' ? fieldDef.default() : fieldDef.default;
      } else if (fieldDef?.type === 'many2one') {
        empty[col] = null;
      } else if (fieldDef?.type === 'integer' || fieldDef?.type === 'float') {
        empty[col] = 0;
      } else {
        empty[col] = '';
      }
    });
    setNewRecord(empty);
    setNewRecordErrors({});
  };

  const handleCancelAdd = (): void => {
    setNewRecord(null);
  };

  const handleSaveNew = async (): Promise<void> => {
    if (!newRecord || !parentId) return;

    const errors: Record<string, string> = {};
    for (const col of columns) {
      const fieldDef = relationFields[col];
      if (fieldDef?.required) {
        const value = newRecord[col];
        if (value === undefined || value === null || value === '') {
          errors[col] = `${fieldDef.label || col} est obligatoire`;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setNewRecordErrors(errors);
      return;
    }

    try {
      const payload = {
        ...newRecord,
        [inverse]: parentId,
      };
      const res = await fetch(`${API_BASE}/${relationPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setNewRecord(null);
        setNewRecordErrors({});
        loadChildren();
      }
    } catch (err) {
      console.error('Failed to create record:', err);
    }
  };

  const handleRemove = async (id: number): Promise<void> => {
    if (!confirm('Supprimer ce contact ?')) return;

    try {
      const res = await fetch(`${API_BASE}/${relationPath}/${id}`, {
        method: 'DELETE',
      });
      if (res.status === 204) {
        loadChildren();
      }
    } catch (err) {
      console.error('Failed to delete record:', err);
    }
  };

  const handleNewRecordChange = (column: string, value: unknown): void => {
    if (newRecord) {
      setNewRecord({ ...newRecord, [column]: value });

      if (newRecordErrors[column]) {
        const fieldDef = relationFields[column];
        const isValid = !(value === undefined || value === null || value === '');
        if (isValid || !fieldDef?.required) {
          setNewRecordErrors((prev) => {
            const updated = { ...prev };
            delete updated[column];
            return updated;
          });
        }
      }
    }
  };

  if (!parentId) {
    return (
      <div className="one2many-field">
        <div className="one2many-header">
          <strong>{fieldLabel}</strong>
        </div>
        <p className="one2many-empty">Enregistrez d'abord pour ajouter des contacts</p>
      </div>
    );
  }

  return (
    <div className="one2many-field">
      <div className="one2many-header">
        <strong>{fieldLabel}</strong>
        {!newRecord && (
          <button type="button" onClick={handleStartAdd} className="btn btn-sm btn-add">
            + Ajouter
          </button>
        )}
      </div>
      {loading ? (
        <p>Chargement...</p>
      ) : (
        <>
          {records.length > 0 || newRecord ? (
            <table className="one2many-table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec.id}>
                    {columns.map((col) => (
                      <td key={col}>{String(rec[col] || '')}</td>
                    ))}
                    <td>
                      <button
                        type="button"
                        onClick={() => handleRemove(rec.id)}
                        className="btn btn-sm btn-remove"
                      >
                        x
                      </button>
                    </td>
                  </tr>
                ))}
                {newRecord && (
                  <tr className="new-record-row">
                    {columns.map((col) => (
                      <td key={col}>
                        <FieldRenderer
                          name={col}
                          definition={relationFields[col]}
                          value={newRecord[col]}
                          onChange={(v) => handleNewRecordChange(col, v)}
                          error={newRecordErrors[col]}
                        />
                      </td>
                    ))}
                    <td>
                      <button type="button" onClick={handleSaveNew} className="btn btn-sm btn-save">
                        Ok
                      </button>
                      <button type="button" onClick={handleCancelAdd} className="btn btn-sm btn-cancel">
                        x
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <p className="one2many-empty">Aucun element</p>
          )}
        </>
      )}
    </div>
  );
}
