import React from 'react';

interface FormFooterProps {
  dirty: boolean;
  recordId: number | null;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * Pied de page du formulaire avec boutons Enregistrer/Annuler
 */
export function FormFooter({
  dirty,
  recordId,
  onSave,
  onCancel,
}: FormFooterProps): React.ReactElement {
  return (
    <footer className="form-footer">
      <button
        onClick={onSave}
        disabled={!dirty && !!recordId}
        className="btn btn-primary"
      >
        Enregistrer
      </button>
      <button onClick={onCancel} className="btn btn-secondary">
        Annuler
      </button>
    </footer>
  );
}
