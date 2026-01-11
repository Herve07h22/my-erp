import React, { ChangeEvent } from 'react';
import type { FieldDefinition } from '../hooks/useModel';
import { Many2OneField } from './Many2OneField';
import { ImageField } from './ImageField';

interface FieldRendererProps {
  name: string;
  definition?: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  readonly?: boolean;
  error?: string;
}

/**
 * Composant de rendu dynamique des champs selon leur type
 */
export function FieldRenderer({
  name,
  definition,
  value,
  onChange,
  readonly = false,
  error,
}: FieldRendererProps): React.ReactElement {
  if (!definition) {
    return <span>{String(value)}</span>;
  }

  const { type, label, required, options, relation } = definition;
  const fieldLabel = label || name;
  const hasError = !!error;

  const commonProps = {
    id: name,
    name,
    disabled: readonly,
    required,
    className: `field-input field-${type}${hasError ? ' field-error' : ''}`,
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ): void => {
    const target = e.target as HTMLInputElement;
    const newValue = target.type === 'checkbox' ? target.checked : target.value;
    onChange(newValue);
  };

  const renderField = (): React.ReactElement => {
    switch (type) {
      case 'string':
        return (
          <input
            type="text"
            value={(value as string) || ''}
            onChange={handleChange}
            {...commonProps}
          />
        );

      case 'text':
        return (
          <textarea
            value={(value as string) || ''}
            onChange={handleChange}
            rows={4}
            {...commonProps}
          />
        );

      case 'integer':
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
            step={1}
            {...commonProps}
          />
        );

      case 'float':
      case 'monetary':
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            step={0.01}
            {...commonProps}
          />
        );

      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={(value as boolean) || false}
            onChange={handleChange}
            {...commonProps}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={
              value ? new Date(value as string).toISOString().split('T')[0] : ''
            }
            onChange={handleChange}
            {...commonProps}
          />
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            value={
              value ? new Date(value as string).toISOString().slice(0, 16) : ''
            }
            onChange={handleChange}
            {...commonProps}
          />
        );

      case 'selection':
        return (
          <select
            value={(value as string) || ''}
            onChange={handleChange}
            {...commonProps}
          >
            <option value="">-- Sélectionner --</option>
            {options?.map(([optValue, optLabel]) => (
              <option key={optValue} value={optValue}>
                {optLabel}
              </option>
            ))}
          </select>
        );

      case 'many2one': {
        // Le backend retourne { id, name } pour les many2one, extraire l'ID
        let many2oneValue: number | null = null;
        if (value !== null && value !== undefined) {
          if (
            typeof value === 'object' &&
            'id' in value &&
            typeof (value as { id: unknown }).id === 'number'
          ) {
            many2oneValue = (value as { id: number }).id;
          } else if (typeof value === 'number') {
            many2oneValue = value;
          }
        }
        return (
          <Many2OneField
            name={name}
            value={many2oneValue}
            relation={relation || ''}
            onChange={onChange as (value: number | null) => void}
            disabled={readonly}
            required={required}
            hasError={hasError}
          />
        );
      }

      case 'image': {
        // Vérifier si c'est un champ multiple (photo_urls) via le nom ou widget
        const isMultiple = name.includes('_urls') || name === 'photo_urls';
        return (
          <ImageField
            name={name}
            value={value as string | null | undefined}
            onChange={onChange as (value: string | null) => void}
            disabled={readonly}
            required={required}
            hasError={hasError}
            multiple={isMultiple}
          />
        );
      }

      default:
        return <span className="field-readonly">{JSON.stringify(value)}</span>;
    }
  };

  return (
    <div className={`field-wrapper field-${type}${hasError ? ' has-error' : ''}`}>
      <label htmlFor={name} className="field-label">
        {fieldLabel}
        {required && <span className="field-required"> *</span>}
      </label>
      {renderField()}
      {error && <span className="field-error-message">{error}</span>}
    </div>
  );
}

export default FieldRenderer;
