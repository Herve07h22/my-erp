import React, { ChangeEvent } from 'react';
import { ErpDate, ErpDateTime } from '../../../shared/erp-date/index.js';

interface DateFieldProps {
  name: string;
  value: unknown;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  hasError?: boolean;
  withTime?: boolean;
}

/**
 * Champ date ou datetime
 */
export function DateField({
  name,
  value,
  onChange,
  disabled = false,
  required = false,
  hasError = false,
  withTime = false,
}: DateFieldProps): React.ReactElement {
  const className = `field-input field-${withTime ? 'datetime' : 'date'}${hasError ? ' field-error' : ''}`;

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    onChange(e.target.value);
  };

  if (withTime) {
    const dtValue = ErpDateTime.parse(value);
    const dtInputValue = dtValue
      ? `${dtValue.toErpDate().toISOString()}T${String(dtValue.hours).padStart(2, '0')}:${String(dtValue.minutes).padStart(2, '0')}`
      : '';

    return (
      <input
        type="datetime-local"
        id={name}
        name={name}
        value={dtInputValue}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        className={className}
      />
    );
  }

  const dateValue = ErpDate.parse(value);

  return (
    <input
      type="date"
      id={name}
      name={name}
      value={dateValue?.toISOString() ?? ''}
      onChange={handleChange}
      disabled={disabled}
      required={required}
      className={className}
    />
  );
}
