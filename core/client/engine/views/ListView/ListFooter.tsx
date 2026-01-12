import React from 'react';

interface ListFooterProps {
  count: number;
}

/**
 * Pied de page de la liste avec compteur
 */
export function ListFooter({ count }: ListFooterProps): React.ReactElement {
  return (
    <footer className="list-footer">
      <span>{count} enregistrement(s)</span>
    </footer>
  );
}
