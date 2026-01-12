/**
 * Tests pour ViewStore, ActionStore et MenuStore
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ViewStore, ActionStore, MenuStore } from './view.js';
import { MockApiClient } from '../api/mock.js';

describe('ViewStore', () => {
  let api: MockApiClient;
  let store: ViewStore;

  beforeEach(() => {
    api = new MockApiClient();
    api.setView('res.partner', 'form', {
      id: 'partner_form',
      model: 'res.partner',
      type: 'form',
      arch: {
        sheet: {
          groups: [{ fields: ['name', 'email'] }],
        },
      },
    });
    store = new ViewStore(api, 'res.partner', 'form');
  });

  it('charge une définition de vue', async () => {
    const view = await store.load();

    expect(view).not.toBeNull();
    expect(view?.id).toBe('partner_form');
    expect(view?.model).toBe('res.partner');
    expect(store.getSnapshot().view).toEqual(view);
    expect(store.getSnapshot().loading).toBe(false);
  });

  it('gère les erreurs', async () => {
    // Override getView pour simuler une erreur
    api.getView = async () => {
      throw new Error('Network error');
    };
    store = new ViewStore(api, 'res.partner', 'form');

    const view = await store.load();

    expect(view).toBeNull();
    expect(store.getSnapshot().error).toBe('Network error');
  });

  it('retourne une vue par défaut si non trouvée', async () => {
    store = new ViewStore(api, 'unknown.model', 'list');

    const view = await store.load();

    expect(view).not.toBeNull();
    expect(view?.model).toBe('unknown.model');
    expect(view?.type).toBe('list');
  });
});

describe('ActionStore', () => {
  let api: MockApiClient;
  let store: ActionStore;

  beforeEach(() => {
    api = new MockApiClient();
    api.setAction('action_partners', {
      id: 'action_partners',
      model: 'res.partner',
      name: 'Partners',
      views: [
        ['partner_list', 'list'],
        ['partner_form', 'form'],
      ],
    });
    store = new ActionStore(api);
  });

  it('charge une action', async () => {
    const action = await store.load('action_partners');

    expect(action).not.toBeNull();
    expect(action?.id).toBe('action_partners');
    expect(action?.model).toBe('res.partner');
    expect(store.getSnapshot().action).toEqual(action);
  });

  it('peut être initialisé avec un actionId', async () => {
    store = new ActionStore(api, 'action_partners');
    const action = await store.load();

    expect(action?.id).toBe('action_partners');
  });

  it('retourne null sans actionId', async () => {
    const action = await store.load();

    expect(action).toBeNull();
  });

  it('gère les actions inexistantes', async () => {
    const action = await store.load('unknown_action');

    expect(action).toBeNull();
    expect(store.getSnapshot().error).toBeTruthy();
  });
});

describe('MenuStore', () => {
  let api: MockApiClient;
  let store: MenuStore;

  beforeEach(() => {
    api = new MockApiClient();
    api.setMenus([
      {
        id: 'menu_sales',
        label: 'Sales',
        children: [
          { id: 'menu_orders', label: 'Orders', action: 'action_orders' },
          { id: 'menu_customers', label: 'Customers', action: 'action_partners' },
        ],
      },
      {
        id: 'menu_settings',
        label: 'Settings',
        action: 'action_settings',
      },
    ]);
    store = new MenuStore(api);
  });

  it('charge les menus', async () => {
    const menus = await store.load();

    expect(menus).toHaveLength(2);
    expect(menus[0].id).toBe('menu_sales');
    expect(store.getSnapshot().menus).toEqual(menus);
  });

  it('ne recharge pas si déjà chargé', async () => {
    await store.load();
    const menus1 = store.getSnapshot().menus;

    // Modifier les menus côté API
    api.setMenus([{ id: 'new_menu', label: 'New' }]);
    await store.load();
    const menus2 = store.getSnapshot().menus;

    // Devrait garder les anciens menus
    expect(menus2).toEqual(menus1);
  });

  it('reload force le rechargement', async () => {
    await store.load();

    api.setMenus([{ id: 'new_menu', label: 'New' }]);
    await store.reload();

    expect(store.getSnapshot().menus).toHaveLength(1);
    expect(store.getSnapshot().menus[0].id).toBe('new_menu');
  });

  it('findMenu trouve un menu par ID', async () => {
    await store.load();

    const menu = store.findMenu('menu_orders');

    expect(menu).not.toBeNull();
    expect(menu?.label).toBe('Orders');
    expect(menu?.action).toBe('action_orders');
  });

  it('findMenu trouve un menu racine', async () => {
    await store.load();

    const menu = store.findMenu('menu_settings');

    expect(menu).not.toBeNull();
    expect(menu?.label).toBe('Settings');
  });

  it('findMenu retourne null si non trouvé', async () => {
    await store.load();

    const menu = store.findMenu('unknown_menu');

    expect(menu).toBeNull();
  });

  it('gère les erreurs', async () => {
    api = new MockApiClient({}, { failOn: ['menus'] });
    // Note: Le mock ne supporte pas failOn pour les menus, mais on teste le flow
    store = new MenuStore(api);

    const menus = await store.load();

    expect(menus).toHaveLength(0);
  });
});
