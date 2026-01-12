import React from 'react';
import { FieldRenderer } from '../../fields/FieldRenderer';
import { One2ManyField } from './One2ManyField';
import type { NotebookTab, FieldsCollection, ValidationErrors } from './types';

interface NotebookProps {
  tabs: NotebookTab[];
  fields: FieldsCollection;
  values: Record<string, unknown>;
  errors?: ValidationErrors;
  showErrors: boolean;
  recordId: number | null;
  onChange: (fieldName: string, value: unknown) => void;
}

/**
 * Onglets du formulaire avec contenu dynamique
 */
export function Notebook({
  tabs,
  fields,
  values,
  errors = {},
  showErrors,
  recordId,
  onChange,
}: NotebookProps): React.ReactElement {
  return (
    <div className="form-notebook">
      {tabs.map((tab, i) => (
        <div key={i} className="notebook-tab">
          <h4 className="tab-label">{tab.label}</h4>
          <div className="tab-content">
            {/* Champs simples */}
            {tab.content?.fields &&
              tab.content.fields.map((fieldName) => (
                <FieldRenderer
                  key={fieldName}
                  name={fieldName}
                  definition={fields[fieldName]}
                  value={values[fieldName]}
                  onChange={(v) => onChange(fieldName, v)}
                  error={showErrors ? errors[fieldName] : undefined}
                />
              ))}
            {/* Champs one2many */}
            {tab.content?.field && tab.content.widget === 'one2many' && (
              <One2ManyField
                fieldName={tab.content.field}
                definition={fields[tab.content.field]}
                columns={tab.content.tree || []}
                parentId={recordId}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
