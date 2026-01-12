import React from 'react';
import { FieldRenderer } from '../../fields/FieldRenderer';
import type { GroupDef, FieldsCollection, ValidationErrors } from './types';

interface FormGroupProps {
  group: GroupDef;
  fields: FieldsCollection;
  values: Record<string, unknown>;
  errors?: ValidationErrors;
  showErrors: boolean;
  onChange: (fieldName: string, value: unknown) => void;
}

/**
 * Groupe de champs dans un formulaire
 */
export function FormGroup({
  group,
  fields,
  values,
  errors = {},
  showErrors,
  onChange,
}: FormGroupProps): React.ReactElement {
  return (
    <div className="form-group">
      {group.label && <h3 className="group-label">{group.label}</h3>}
      {group.fields.map((fieldName) => (
        <FieldRenderer
          key={fieldName}
          name={fieldName}
          definition={fields[fieldName]}
          value={values[fieldName]}
          onChange={(v) => onChange(fieldName, v)}
          error={showErrors ? errors[fieldName] : undefined}
        />
      ))}
    </div>
  );
}
