import React, { useState, useEffect } from 'react';
import { useModel } from '../../hooks/useModel';
import { FormHeader } from './FormHeader';
import { FormSheet } from './FormSheet';
import { FormFooter } from './FormFooter';
import type { ViewArch, ValidationErrors, RecordData, FieldDefinition } from './types';

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
 * Compose les sous-composants FormHeader, FormSheet et FormFooter
 */
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

  const validateField = (fieldName: string, value: unknown): string | null => {
    const fieldDef = fields[fieldName] as FieldDefinition | undefined;
    if (!fieldDef) return null;

    if (fieldDef.required) {
      if (value === undefined || value === null || value === '') {
        return `${fieldDef.label || fieldName} est obligatoire`;
      }
    }
    return null;
  };

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

  return (
    <div className="form-view">
      <FormHeader
        buttons={arch.header?.buttons}
        statusbarField={arch.header?.statusbar?.field}
        fields={fields}
        values={values}
        onAction={handleAction}
      />

      <FormSheet
        arch={arch}
        fields={fields}
        values={values}
        errors={validationErrors}
        showErrors={showErrors}
        recordId={recordId ?? null}
        onChange={handleChange}
      />

      <FormFooter
        dirty={dirty}
        recordId={recordId ?? null}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
}

export default FormView;
