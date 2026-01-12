import React, { ChangeEvent } from 'react';

interface SelectionFieldProps {
  name: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  hasError?: boolean;
  placeholder?: string;
}

/**
 * Champ selection (dropdown)
 */
export function SelectionField({
  name,
  value,
  options,
  onChange,
  disabled = false,
  required = false,
  hasError = false,
  placeholder = '-- Selectionner --',
}: SelectionFieldProps): React.ReactElement {
  const className = `field-input field-selection${hasError ? ' field-error' : ''}`;

  const handleChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    onChange(e.target.value);
  };

  return (
    <select
      id={name}
      name={name}
      value={value || ''}
      onChange={handleChange}
      disabled={disabled}
      required={required}
      className={className}
    >
      <option value="">{placeholder}</option>
      {options.map(([optValue, optLabel]) => (
        <option key={optValue} value={optValue}>
          {optLabel}
        </option>
      ))}
    </select>
  );
}
