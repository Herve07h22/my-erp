import React, { ChangeEvent } from 'react';

interface BooleanFieldProps {
  name: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  required?: boolean;
  hasError?: boolean;
}

/**
 * Champ booleen (checkbox)
 */
export function BooleanField({
  name,
  value,
  onChange,
  disabled = false,
  required = false,
  hasError = false,
}: BooleanFieldProps): React.ReactElement {
  const className = `field-input field-boolean${hasError ? ' field-error' : ''}`;

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    onChange(e.target.checked);
  };

  return (
    <input
      type="checkbox"
      id={name}
      name={name}
      checked={value || false}
      onChange={handleChange}
      disabled={disabled}
      required={required}
      className={className}
    />
  );
}
