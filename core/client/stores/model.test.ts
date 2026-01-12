/**
 * Tests pour ModelStore
 * Démonstration de la testabilité via injection de dépendances
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModelStore } from './model.js';
import { MockApiClient } from '../api/mock.js';

describe('ModelStore', () => {
  let api: MockApiClient;
  let store: ModelStore;

  beforeEach(() => {
    api = new MockApiClient();
    store = new ModelStore(api, 'res.partner');

    // Données de test
    api.setRecords('res.partner', [
      { id: 1, name: 'Alice', email: 'alice@test.com' },
      { id: 2, name: 'Bob', email: 'bob@test.com' },
      { id: 3, name: 'Charlie', email: 'charlie@test.com' },
    ]);

    api.setFields('res.partner', {
      id: { type: 'integer', label: 'ID' },
      name: { type: 'string', label: 'Name', required: true },
      email: { type: 'string', label: 'Email' },
    });
  });

  describe('loadFields', () => {
    it('charge les métadonnées du modèle', async () => {
      const fields = await store.loadFields();

      expect(fields).toHaveProperty('name');
      expect(fields.name.type).toBe('string');
      expect(store.getSnapshot().fields).toEqual(fields);
    });

    it('gère les erreurs', async () => {
      api = new MockApiClient({}, { failOn: ['res.partner'] });
      store = new ModelStore(api, 'res.partner');

      await store.loadFields();

      expect(store.getSnapshot().error).toBeTruthy();
    });
  });

  describe('loadRecord', () => {
    it('charge un enregistrement par ID', async () => {
      const record = await store.loadRecord(1);

      expect(record).toEqual({ id: 1, name: 'Alice', email: 'alice@test.com' });
      expect(store.getSnapshot().record).toEqual(record);
      expect(store.getSnapshot().loading).toBe(false);
    });

    it('gère les enregistrements inexistants', async () => {
      const record = await store.loadRecord(999);

      expect(record).toBeNull();
      expect(store.getSnapshot().error).toBeTruthy();
    });
  });

  describe('search', () => {
    it('recherche tous les enregistrements', async () => {
      const records = await store.search();

      expect(records).toHaveLength(3);
      expect(store.getSnapshot().records).toEqual(records);
      expect(store.getSnapshot().count).toBe(3);
    });

    it('filtre avec un domaine', async () => {
      const records = await store.search([['name', '=', 'Alice']]);

      expect(records).toHaveLength(1);
      expect(records[0].name).toBe('Alice');
    });

    it('supporte la pagination', async () => {
      const records = await store.search([], { limit: 2, offset: 1 });

      expect(records).toHaveLength(2);
      expect(records[0].name).toBe('Bob');
    });
  });

  describe('create', () => {
    it('crée un nouvel enregistrement', async () => {
      const record = await store.create({ name: 'David', email: 'david@test.com' });

      expect(record).toMatchObject({ name: 'David', email: 'david@test.com' });
      expect(record?.id).toBeDefined();
      expect(store.getSnapshot().record).toEqual(record);
    });

    it('appelle le callback onCreate', async () => {
      const onCreate = vi.fn();
      api.onCreate = onCreate;

      await store.create({ name: 'David' });

      expect(onCreate).toHaveBeenCalledWith('res.partner', { name: 'David' });
    });
  });

  describe('save', () => {
    it('met à jour un enregistrement existant', async () => {
      await store.loadRecord(1);
      const record = await store.save({ name: 'Alice Updated' });

      expect(record?.name).toBe('Alice Updated');
      expect(store.getSnapshot().record?.name).toBe('Alice Updated');
    });

    it('crée si pas d\'enregistrement courant', async () => {
      const record = await store.save({ name: 'New Partner' });

      expect(record?.id).toBeDefined();
      expect(record?.name).toBe('New Partner');
    });

    it('peut sauvegarder un ID spécifique', async () => {
      const onUpdate = vi.fn();
      api.onUpdate = onUpdate;

      await store.save({ name: 'Updated' }, 2);

      expect(onUpdate).toHaveBeenCalledWith('res.partner', 2, { name: 'Updated' });
    });
  });

  describe('remove', () => {
    it('supprime un enregistrement', async () => {
      await store.loadRecord(1);
      const result = await store.remove();

      expect(result).toBe(true);
      expect(store.getSnapshot().record).toBeNull();
    });

    it('supprime de la liste', async () => {
      await store.search();
      expect(store.getSnapshot().records).toHaveLength(3);

      await store.remove(2);

      expect(store.getSnapshot().records).toHaveLength(2);
      expect(store.getSnapshot().records.find((r) => r.id === 2)).toBeUndefined();
    });

    it('retourne false sans enregistrement', async () => {
      const result = await store.remove();

      expect(result).toBe(false);
      expect(store.getSnapshot().error).toBeTruthy();
    });
  });

  describe('execute', () => {
    it('exécute une action et recharge', async () => {
      const onExecute = vi.fn();
      api.onExecute = onExecute;

      await store.loadRecord(1);
      await store.execute('actionConfirm', { note: 'test' });

      expect(onExecute).toHaveBeenCalledWith('res.partner', 1, 'actionConfirm');
      expect(store.getSnapshot().record).toBeDefined();
    });

    it('retourne null sans enregistrement', async () => {
      const result = await store.execute('actionConfirm');

      expect(result).toBeNull();
      expect(store.getSnapshot().error).toBeTruthy();
    });
  });

  describe('subscription', () => {
    it('notifie les listeners lors des changements', async () => {
      const listener = vi.fn();
      store.subscribe(listener);

      await store.search();

      expect(listener).toHaveBeenCalled();
    });

    it('permet de se désabonner', async () => {
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);

      unsubscribe();
      await store.search();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('clearRecord', () => {
    it('réinitialise l\'enregistrement courant', async () => {
      await store.loadRecord(1);
      expect(store.getSnapshot().record).not.toBeNull();

      store.clearRecord();

      expect(store.getSnapshot().record).toBeNull();
    });
  });

  describe('clearError', () => {
    it('efface l\'erreur', async () => {
      await store.loadRecord(999); // Provoque une erreur
      expect(store.getSnapshot().error).toBeTruthy();

      store.clearError();

      expect(store.getSnapshot().error).toBeNull();
    });
  });
});
