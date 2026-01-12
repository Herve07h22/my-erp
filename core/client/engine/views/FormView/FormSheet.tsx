import React from 'react';
import { FieldRenderer } from '../../fields/FieldRenderer';
import { FormGroup } from './FormGroup';
import { Notebook } from './Notebook';
import type { ViewArch, FieldsCollection, ValidationErrors } from './types';

interface FormSheetProps {
  arch: ViewArch;
  fields: FieldsCollection;
  values: Record<string, unknown>;
  errors: ValidationErrors;
  showErrors: boolean;
  recordId: number | null;
  onChange: (fieldName: string, value: unknown) => void;
}

/**
 * Corps du formulaire avec groupes, onglets et footer
 */
export function FormSheet({
  arch,
  fields,
  values,
  errors,
  showErrors,
  recordId,
  onChange,
}: FormSheetProps): React.ReactElement {
  return (
    <div className="form-sheet">
      {/* Groupes de champs */}
      {arch.sheet?.groups && (
        <div className="form-groups">
          {arch.sheet.groups.map((group, i) => (
            <FormGroup
              key={i}
              group={group}
              fields={fields}
              values={values}
              errors={errors}
              showErrors={showErrors}
              onChange={onChange}
            />
          ))}
        </div>
      )}

      {/* Onglets */}
      {arch.sheet?.notebook && (
        <Notebook
          tabs={arch.sheet.notebook}
          fields={fields}
          values={values}
          errors={errors}
          showErrors={showErrors}
          recordId={recordId}
          onChange={onChange}
        />
      )}

      {/* Champs en lecture seule en bas */}
      {arch.sheet?.footer?.fields && (
        <div className="form-footer-fields">
          {arch.sheet.footer.fields.map((item) => (
            <FieldRenderer
              key={item.field}
              name={item.field}
              definition={fields[item.field]}
              value={values[item.field]}
              onChange={(v) => onChange(item.field, v)}
              readonly
            />
          ))}
        </div>
      )}
    </div>
  );
}
