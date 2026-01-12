import React from 'react';
import type { Menu } from './types';

interface MenuItemProps {
  menu: Menu;
  depth: number;
  onMenuClick: (menu: Menu) => void;
}

/**
 * Element de menu recursif
 */
function MenuItem({ menu, depth, onMenuClick }: MenuItemProps): React.ReactElement {
  return (
    <li className={`menu-item depth-${depth}`}>
      <button
        className="menu-link"
        onClick={() => onMenuClick(menu)}
        disabled={!menu.action && !menu.children?.length}
      >
        {menu.label}
      </button>
      {menu.children && menu.children.length > 0 && (
        <ul className="menu-children">
          {menu.children.map((child) => (
            <MenuItem
              key={child.id}
              menu={child}
              depth={depth + 1}
              onMenuClick={onMenuClick}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

interface MenuTreeProps {
  menus: Menu[];
  onMenuClick: (menu: Menu) => void;
}

/**
 * Arbre de menus
 */
export function MenuTree({ menus, onMenuClick }: MenuTreeProps): React.ReactElement {
  return (
    <ul className="menu-root">
      {menus.map((menu) => (
        <MenuItem key={menu.id} menu={menu} depth={0} onMenuClick={onMenuClick} />
      ))}
    </ul>
  );
}
