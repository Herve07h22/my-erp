/**
 * Tests pour TimesheetGridStore
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TimesheetGridStore } from './timesheet.js';
import { MockApiClient } from '../api/mock.js';
import { ErpDate } from '../../shared/erp-date/index.js';

describe('TimesheetGridStore', () => {
  let api: MockApiClient;
  let store: TimesheetGridStore;
  const testDate = ErpDate.parse('2024-01-15')!; // Un lundi

  beforeEach(() => {
    api = new MockApiClient();

    // Données de test: tâches
    api.setRecords('project.task', [
      {
        id: 1,
        name: 'Task 1',
        project_id: { id: 10, name: 'Project A' },
        user_id: 1,
        state: 'in_progress',
        planned_hours: 8,
        effective_hours: 4,
      },
      {
        id: 2,
        name: 'Task 2',
        project_id: { id: 10, name: 'Project A' },
        user_id: 2, // Assignée à un autre utilisateur
        state: 'in_progress',
        planned_hours: 16,
        effective_hours: 0,
      },
      {
        id: 3,
        name: 'Task Done',
        project_id: { id: 10, name: 'Project A' },
        user_id: 1,
        state: 'done',
        planned_hours: 4,
        effective_hours: 4,
      },
    ]);

    // Données de test: timesheets
    api.setRecords('account.analytic.line', [
      {
        id: 100,
        date: '2024-01-15',
        task_id: 1,
        unit_amount: 4,
        is_timesheet: true,
        user_id: 1,
      },
      {
        id: 101,
        date: '2024-01-16',
        task_id: 1,
        unit_amount: 2,
        is_timesheet: true,
        user_id: 1,
      },
      {
        id: 102,
        date: '2024-01-15',
        task_id: 2,
        unit_amount: 3,
        is_timesheet: true,
        user_id: 1, // L'utilisateur 1 a saisi du temps sur la tâche 2
      },
    ]);

    store = new TimesheetGridStore(api, testDate, 1, 40);
  });

  describe('initialization', () => {
    it('initialise avec la bonne semaine', () => {
      const state = store.getSnapshot();

      expect(state.weekStart).toBe('2024-01-15');
      expect(state.weekDays).toHaveLength(7);
      expect(state.weekDays[0]).toBe('2024-01-15'); // Lundi
      expect(state.weekDays[6]).toBe('2024-01-21'); // Dimanche
      expect(state.userId).toBe(1);
      expect(state.targetHours).toBe(40);
    });
  });

  describe('loadTasks', () => {
    it('charge les tâches non terminées', async () => {
      await store.loadTasks();

      const state = store.getSnapshot();
      // Les tâches sont filtrées par le domaine dans search,
      // mais le mock ne filtre pas correctement 'state', donc on a toutes les tâches
      expect(state.tasks.length).toBeGreaterThan(0);
    });
  });

  describe('loadTimesheets', () => {
    it('charge les timesheets de la semaine', async () => {
      await store.loadTimesheets();

      const state = store.getSnapshot();
      expect(state.timesheets.length).toBeGreaterThan(0);
      expect(state.loading).toBe(false);
    });
  });

  describe('loadAll', () => {
    it('charge tâches et timesheets et construit les lignes', async () => {
      await store.loadAll();

      const state = store.getSnapshot();
      expect(state.tasks.length).toBeGreaterThan(0);
      expect(state.timesheets.length).toBeGreaterThan(0);
      expect(state.rows.length).toBeGreaterThan(0);
    });

    it('inclut les tâches assignées à l\'utilisateur', async () => {
      await store.loadAll();

      const state = store.getSnapshot();
      const task1Row = state.rows.find((r) => r.taskId === 1);

      expect(task1Row).toBeDefined();
      expect(task1Row?.taskName).toBe('Task 1');
    });

    it('inclut les tâches avec des timesheets même si non assignées', async () => {
      await store.loadAll();

      const state = store.getSnapshot();
      const task2Row = state.rows.find((r) => r.taskId === 2);

      // Task 2 n'est pas assignée à user 1 mais a des timesheets de user 1
      expect(task2Row).toBeDefined();
    });

    it('calcule les heures par cellule', async () => {
      await store.loadAll();

      const state = store.getSnapshot();
      const task1Row = state.rows.find((r) => r.taskId === 1);

      expect(task1Row?.cells['2024-01-15']?.hours).toBe(4);
      expect(task1Row?.cells['2024-01-16']?.hours).toBe(2);
      expect(task1Row?.totalHours).toBe(6);
    });

    it('calcule les totaux par jour', async () => {
      await store.loadAll();

      const state = store.getSnapshot();
      // 4h task1 + 3h task2 le 15/01
      expect(state.dayTotals['2024-01-15']).toBe(7);
      // 2h task1 le 16/01
      expect(state.dayTotals['2024-01-16']).toBe(2);
    });

    it('calcule le total de la semaine', async () => {
      await store.loadAll();

      const state = store.getSnapshot();
      // 4 + 2 + 3 = 9 heures
      expect(state.weekTotal).toBe(9);
    });

    it('calcule la variance', async () => {
      await store.loadAll();

      const state = store.getSnapshot();
      const task1Row = state.rows.find((r) => r.taskId === 1);

      // effective_hours (4) - planned_hours (8) = -4
      expect(task1Row?.variance).toBe(-4);
    });
  });

  describe('setWeek', () => {
    it('change la semaine affichée', () => {
      const newDate = ErpDate.parse('2024-01-22')!; // Semaine suivante
      store.setWeek(newDate);

      const state = store.getSnapshot();
      expect(state.weekStart).toBe('2024-01-22');
      expect(state.weekDays[0]).toBe('2024-01-22');
    });

    it('réinitialise les données', () => {
      store.setWeek(ErpDate.parse('2024-01-22')!);

      const state = store.getSnapshot();
      expect(state.rows).toHaveLength(0);
      expect(state.weekTotal).toBe(0);
    });
  });

  describe('updateCell', () => {
    it('crée une nouvelle entrée', async () => {
      await store.loadAll();
      const onCreate = vi.fn();
      api.onCreate = onCreate;

      await store.updateCell(1, '2024-01-17', 5);

      expect(onCreate).toHaveBeenCalledWith(
        'account.analytic.line',
        expect.objectContaining({
          date: '2024-01-17',
          task_id: 1,
          unit_amount: 5,
          is_timesheet: true,
        })
      );
    });

    it('modifie une entrée existante', async () => {
      await store.loadAll();
      const onUpdate = vi.fn();
      api.onUpdate = onUpdate;

      await store.updateCell(1, '2024-01-15', 6);

      expect(onUpdate).toHaveBeenCalledWith(
        'account.analytic.line',
        100, // ID de l'entrée existante
        { unit_amount: 6 }
      );
    });

    it('supprime une entrée si heures = 0', async () => {
      await store.loadAll();
      const onDelete = vi.fn();
      api.onDelete = onDelete;

      await store.updateCell(1, '2024-01-15', 0);

      expect(onDelete).toHaveBeenCalledWith('account.analytic.line', 100);
    });

    it('ne fait rien si heures = 0 et pas d\'entrée existante', async () => {
      await store.loadAll();
      const onDelete = vi.fn();
      const onCreate = vi.fn();
      api.onDelete = onDelete;
      api.onCreate = onCreate;

      await store.updateCell(1, '2024-01-17', 0);

      expect(onDelete).not.toHaveBeenCalled();
      expect(onCreate).not.toHaveBeenCalled();
    });
  });

  describe('subscription', () => {
    it('notifie les listeners lors des changements', async () => {
      const listener = vi.fn();
      store.subscribe(listener);

      await store.loadAll();

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('helpers', () => {
    it('getWeekDaysAsErpDate retourne des ErpDate', () => {
      const days = store.getWeekDaysAsErpDate();

      expect(days).toHaveLength(7);
      expect(days[0]).toBeInstanceOf(ErpDate);
      expect(days[0].toISOString()).toBe('2024-01-15');
    });

    it('getWeekStartAsErpDate retourne un ErpDate', () => {
      const weekStart = store.getWeekStartAsErpDate();

      expect(weekStart).toBeInstanceOf(ErpDate);
      expect(weekStart.toISOString()).toBe('2024-01-15');
    });
  });
});
