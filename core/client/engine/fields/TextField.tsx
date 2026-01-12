import React, { ChangeEvent } from 'react';

interface TextFieldProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  hasError?: boolean;
  multiline?: boolean;
  rows?: number;
}

/**
 * Champ texte (string ou text)
 */
export function TextField({
  name,
  value,
  onChange,
  disabled = false,
  required = false,
  hasError = false,
  multiline = false,
  rows = 4,
}: TextFieldProps): React.ReactElement {
  const className = `field-input field-${multiline ? 'text' : 'string'}${hasError ? ' field-error' : ''}`;

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    onChange(e.target.value);
  };

  if (multiline) {
    return (
      <textarea
        id={name}
        name={name}
        value={value || ''}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        rows={rows}
        className={className}
      />
    );
  }

  return (
    <input
      type="text"
      id={name}
      name={name}
      value={value || ''}
      onChange={handleChange}
      disabled={disabled}
      required={required}
      className={className}
    />
  );
}
