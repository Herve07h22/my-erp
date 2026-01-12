import React from 'react';
import type { FieldDefinition } from '../hooks/useModel';
import { TextField } from './TextField';
import { NumberField } from './NumberField';
import { BooleanField } from './BooleanField';
import { DateField } from './DateField';
import { SelectionField } from './SelectionField';
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
 * Delegue aux composants de champs specifiques
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

  const renderField = (): React.ReactElement => {
    switch (type) {
      case 'string':
        return (
          <TextField
            name={name}
            value={(value as string) || ''}
            onChange={onChange as (v: string) => void}
            disabled={readonly}
            required={required}
            hasError={hasError}
          />
        );

      case 'text':
        return (
          <TextField
            name={name}
            value={(value as string) || ''}
            onChange={onChange as (v: string) => void}
            disabled={readonly}
            required={required}
            hasError={hasError}
            multiline
          />
        );

      case 'integer':
        return (
          <NumberField
            name={name}
            value={(value as number) ?? null}
            onChange={onChange as (v: number) => void}
            disabled={readonly}
            required={required}
            hasError={hasError}
            integer
          />
        );

      case 'float':
      case 'monetary':
        return (
          <NumberField
            name={name}
            value={(value as number) ?? null}
            onChange={onChange as (v: number) => void}
            disabled={readonly}
            required={required}
            hasError={hasError}
          />
        );

      case 'boolean':
        return (
          <BooleanField
            name={name}
            value={(value as boolean) || false}
            onChange={onChange as (v: boolean) => void}
            disabled={readonly}
            required={required}
            hasError={hasError}
          />
        );

      case 'date':
        return (
          <DateField
            name={name}
            value={value}
            onChange={onChange as (v: string) => void}
            disabled={readonly}
            required={required}
            hasError={hasError}
          />
        );

      case 'datetime':
        return (
          <DateField
            name={name}
            value={value}
            onChange={onChange as (v: string) => void}
            disabled={readonly}
            required={required}
            hasError={hasError}
            withTime
          />
        );

      case 'selection':
        return (
          <SelectionField
            name={name}
            value={(value as string) || ''}
            options={options || []}
            onChange={onChange as (v: string) => void}
            disabled={readonly}
            required={required}
            hasError={hasError}
          />
        );

      case 'many2one': {
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
