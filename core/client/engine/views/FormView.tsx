import React, { useState, useEffect, useCallback } from 'react';
import { useModel } from '../hooks/useModel';
import { FieldRenderer } from '../fields/FieldRenderer';
import type { RecordData, FieldDefinition } from '../hooks/useModel';

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
 * Gère les appels API pour créer/supprimer les enregistrements liés
 */
function One2ManyField({
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

  // Charger les métadonnées des champs du modèle relation
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

  // Charger les enregistrements enfants
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
      // Initialiser avec la valeur par défaut du champ ou une valeur vide appropriée
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

    // Valider les champs requis
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

      // Effacer l'erreur si la valeur devient valide
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
                        ×
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
                        ✓
                      </button>
                      <button type="button" onClick={handleCancelAdd} className="btn btn-sm btn-cancel">
                        ×
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <p className="one2many-empty">Aucun élément</p>
          )}
        </>
      )}
    </div>
  );
}

interface HeaderButton {
  name: string;
  label: string;
  type?: string;
  states?: string[];
}

interface StatusBar {
  field: string;
}

interface GroupDef {
  label?: string;
  fields: string[];
}

interface NotebookTab {
  label: string;
  content?: {
    field?: string;
    fields?: string[];
    widget?: string;
    tree?: string[];
  };
}

interface FooterItem {
  field: string;
}

interface ViewArch {
  header?: {
    buttons?: HeaderButton[];
    statusbar?: StatusBar;
  };
  sheet?: {
    groups?: GroupDef[];
    notebook?: NotebookTab[];
    footer?: {
      fields?: FooterItem[];
    };
  };
  [key: string]: unknown;
}

interface FormViewProps {
  arch: ViewArch;
  model: string;
  recordId?: number | null;
  initialValues?: Record<string, unknown>;
  onSave?: (record: RecordData) => void;
  onCancel?: () => void;
}

/**
 * Composant de vue formulaire
 * Rend un formulaire basé sur une définition de vue JSON
 */
interface ValidationErrors {
  [fieldName: string]: string;
}

export function FormView({
  arch,
  model,
  recordId,
  initialValues,
  onSave,
  onCancel,
}: FormViewProps): React.ReactElement {
  const { record, fields, loading, error, save, execute } = useModel(
    model,
    recordId ?? null
  );
  // Utiliser initialValues pour les nouveaux enregistrements (pattern loader)
  const [values, setValues] = useState<Record<string, unknown>>(initialValues ?? {});
  const [dirty, setDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (record) {
      setValues(record);
      setDirty(false);
      setValidationErrors({});
      setShowErrors(false);
    }
  }, [record]);

  // Valider un champ et retourner l'erreur éventuelle
  const validateField = (fieldName: string, value: unknown): string | null => {
    const fieldDef = fields[fieldName];
    if (!fieldDef) return null;

    if (fieldDef.required) {
      if (value === undefined || value === null || value === '') {
        return `${fieldDef.label || fieldName} est obligatoire`;
      }
    }
    return null;
  };

  // Valider tous les champs et retourner les erreurs
  const validateAllFields = (): ValidationErrors => {
    const errors: ValidationErrors = {};
    for (const [fieldName, fieldDef] of Object.entries(fields)) {
      if (fieldDef.required) {
        const fieldError = validateField(fieldName, values[fieldName]);
        if (fieldError) {
          errors[fieldName] = fieldError;
        }
      }
    }
    return errors;
  };

  const handleChange = (fieldName: string, value: unknown): void => {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
    setDirty(true);

    // Effacer l'erreur du champ si la valeur devient valide
    if (showErrors) {
      const fieldError = validateField(fieldName, value);
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        if (fieldError) {
          newErrors[fieldName] = fieldError;
        } else {
          delete newErrors[fieldName];
        }
        return newErrors;
      });
    }
  };

  const handleAction = async (actionName: string): Promise<void> => {
    const result = await execute(actionName);
    if (result !== null) {
      setDirty(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    // Valider tous les champs requis
    const errors = validateAllFields();
    setValidationErrors(errors);
    setShowErrors(true);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const result = await save(values);
    if (result) {
      setDirty(false);
      setValidationErrors({});
      setShowErrors(false);
      onSave?.(result);
    }
  };

  const handleCancel = (): void => {
    if (record) {
      setValues(record);
      setDirty(false);
    }
    onCancel?.();
  };

  if (loading && recordId) {
    return <div className="form-loading">Chargement...</div>;
  }

  if (error) {
    return <div className="form-error">Erreur: {error}</div>;
  }

  const renderButtons = (): React.ReactElement | null => {
    if (!arch.header?.buttons) return null;

    return (
      <div className="form-buttons">
        {arch.header.buttons.map((btn) => {
          const isDisabled =
            btn.states && !btn.states.includes(values.state as string);

          return (
            <button
              key={btn.name}
              onClick={() => handleAction(btn.name)}
              disabled={isDisabled}
              className={`btn btn-${btn.type || 'secondary'}`}
            >
              {btn.label}
            </button>
          );
        })}
      </div>
    );
  };

  const renderStatusBar = (): React.ReactElement | null => {
    if (!arch.header?.statusbar) return null;

    const field = arch.header.statusbar.field;
    const fieldDef = fields[field] as FieldDefinition | undefined;

    if (!fieldDef?.options) return null;

    return (
      <div className="form-statusbar">
        {fieldDef.options.map(([optValue, optLabel]) => (
          <span
            key={optValue}
            className={`status-item ${values[field] === optValue ? 'active' : ''}`}
          >
            {optLabel}
          </span>
        ))}
      </div>
    );
  };

  const renderGroups = (): React.ReactElement | null => {
    if (!arch.sheet?.groups) return null;

    return (
      <div className="form-groups">
        {arch.sheet.groups.map((group, i) => (
          <div key={i} className="form-group">
            {group.label && <h3 className="group-label">{group.label}</h3>}
            {group.fields.map((fieldName) => (
              <FieldRenderer
                key={fieldName}
                name={fieldName}
                definition={fields[fieldName]}
                value={values[fieldName]}
                onChange={(v) => handleChange(fieldName, v)}
                error={showErrors ? validationErrors[fieldName] : undefined}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderNotebook = (): React.ReactElement | null => {
    if (!arch.sheet?.notebook) return null;

    return (
      <div className="form-notebook">
        {arch.sheet.notebook.map((tab, i) => (
          <div key={i} className="notebook-tab">
            <h4 className="tab-label">{tab.label}</h4>
            <div className="tab-content">
              {/* Rendu des champs simples (fields au pluriel) */}
              {tab.content?.fields && tab.content.fields.map((fieldName) => (
                <FieldRenderer
                  key={fieldName}
                  name={fieldName}
                  definition={fields[fieldName]}
                  value={values[fieldName]}
                  onChange={(v) => handleChange(fieldName, v)}
                  error={showErrors ? validationErrors[fieldName] : undefined}
                />
              ))}
              {/* Rendu des champs one2many */}
              {tab.content?.field && tab.content.widget === 'one2many' && (
                <One2ManyField
                  fieldName={tab.content.field}
                  definition={fields[tab.content.field]}
                  columns={tab.content.tree || []}
                  parentId={recordId ?? null}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="form-view">
      <header className="form-header">
        {renderButtons()}
        {renderStatusBar()}
      </header>

      <div className="form-sheet">
        {renderGroups()}
        {renderNotebook()}

        {arch.sheet?.footer && (
          <div className="form-footer-fields">
            {arch.sheet.footer.fields?.map((item) => (
              <FieldRenderer
                key={item.field}
                name={item.field}
                definition={fields[item.field]}
                value={values[item.field]}
                onChange={(v) => handleChange(item.field, v)}
                readonly
              />
            ))}
          </div>
        )}
      </div>

      <footer className="form-footer">
        <button
          onClick={handleSave}
          disabled={!dirty && !!recordId}
          className="btn btn-primary"
        >
          Enregistrer
        </button>
        <button onClick={handleCancel} className="btn btn-secondary">
          Annuler
        </button>
      </footer>
    </div>
  );
}

export default FormView;
