import React from 'react';

/**
 * En-tete de l'application
 */
export function AppHeader(): React.ReactElement {
  return (
    <header className="app-header">
      <h1 className="app-title">My ERP</h1>
      <div className="app-user">
        <span>Utilisateur</span>
      </div>
    </header>
  );
}
