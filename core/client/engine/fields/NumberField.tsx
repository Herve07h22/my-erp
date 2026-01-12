import React, { ChangeEvent } from 'react';

interface NumberFieldProps {
  name: string;
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  required?: boolean;
  hasError?: boolean;
  integer?: boolean;
}

/**
 * Champ numerique (integer, float, monetary)
 */
export function NumberField({
  name,
  value,
  onChange,
  disabled = false,
  required = false,
  hasError = false,
  integer = false,
}: NumberFieldProps): React.ReactElement {
  const className = `field-input field-${integer ? 'integer' : 'float'}${hasError ? ' field-error' : ''}`;

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const newValue = integer
      ? parseInt(e.target.value, 10) || 0
      : parseFloat(e.target.value) || 0;
    onChange(newValue);
  };

  return (
    <input
      type="number"
      id={name}
      name={name}
      value={value ?? ''}
      onChange={handleChange}
      disabled={disabled}
      required={required}
      step={integer ? 1 : 0.01}
      className={className}
    />
  );
}
