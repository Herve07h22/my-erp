import React from 'react';
import type { FieldDefinition } from './types';

interface StatusBarProps {
  fieldDef?: FieldDefinition;
  currentValue: unknown;
}

/**
 * Affiche la barre de statut avec les etapes du workflow
 */
export function StatusBar({
  fieldDef,
  currentValue,
}: StatusBarProps): React.ReactElement | null {
  if (!fieldDef?.options) return null;

  return (
    <div className="form-statusbar">
      {fieldDef.options.map(([optValue, optLabel]) => (
        <span
          key={optValue}
          className={`status-item ${currentValue === optValue ? 'active' : ''}`}
        >
          {optLabel}
        </span>
      ))}
    </div>
  );
}
