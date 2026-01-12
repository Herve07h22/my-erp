import React from 'react';
import { MenuTree } from './MenuTree';
import type { Menu } from './types';

interface SidebarProps {
  menus: Menu[];
  loading: boolean;
  onMenuClick: (menu: Menu) => void;
}

/**
 * Barre laterale avec navigation par menus
 */
export function Sidebar({
  menus,
  loading,
  onMenuClick,
}: SidebarProps): React.ReactElement {
  return (
    <nav className="app-sidebar">
      {loading ? (
        <div className="sidebar-loading">Chargement...</div>
      ) : (
        <MenuTree menus={menus} onMenuClick={onMenuClick} />
      )}
    </nav>
  );
}
