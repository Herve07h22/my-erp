import React from 'react';
import { StatusBar } from './StatusBar';
import type { HeaderButton, FieldsCollection } from './types';

interface FormHeaderProps {
  buttons?: HeaderButton[];
  statusbarField?: string;
  fields: FieldsCollection;
  values: Record<string, unknown>;
  onAction: (actionName: string) => void;
}

/**
 * En-tete du formulaire avec boutons d'action et barre de statut
 */
export function FormHeader({
  buttons,
  statusbarField,
  fields,
  values,
  onAction,
}: FormHeaderProps): React.ReactElement {
  return (
    <header className="form-header">
      {buttons && buttons.length > 0 && (
        <div className="form-buttons">
          {buttons.map((btn) => {
            const isDisabled =
              btn.states && !btn.states.includes(values.state as string);

            return (
              <button
                key={btn.name}
                onClick={() => onAction(btn.name)}
                disabled={isDisabled}
                className={`btn btn-${btn.type || 'secondary'}`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      )}
      {statusbarField && (
        <StatusBar
          fieldDef={fields[statusbarField]}
          currentValue={values[statusbarField]}
        />
      )}
    </header>
  );
}
