/**
 * TimesheetGridStore - Gestion de la grille de feuilles de temps
 * Classe JS pure, testable avec injection de l'API client
 */
import { Store, withLoading, type LoadingState } from './base.js';
import type { ApiClient, Domain, RecordData } from '../api/types.js';
import { ErpDate } from '../../shared/erp-date/index.js';
import { ErpHours } from '../../shared/erp-hours/index.js';

// Types de données
interface TaskData {
  id: number;
  name: string;
  project_id: { id: number; name: string } | null;
  user_id: { id: number; name: string } | number | null;
  planned_hours: number;
  effective_hours: number;
}

interface TimesheetEntry {
  id: number;
  date: string;
  task_id: number | { id: number };
  unit_amount: number;
}

export interface GridCell {
  hours: number;
  entryId: number | null;
}

export interface GridRow {
  key: string;
  projectId: number;
  projectName: string;
  taskId: number;
  taskName: string;
  plannedHours: number;
  cells: Record<string, GridCell>;
  totalHours: number;
  variance: number;
}

export interface TimesheetGridState extends LoadingState {
  tasks: TaskData[];
  timesheets: TimesheetEntry[];
  rows: GridRow[];
  dayTotals: Record<string, number>;
  weekTotal: number;
  weekStart: string;
  weekDays: string[];
  userId: number;
  targetHours: number;
}

function normalizeDateKey(date: string | ErpDate): string {
  if (date instanceof ErpDate) {
    return date.toISOString();
  }
  const parsed = ErpDate.parse(date);
  return parsed?.toISOString() ?? '';
}

function createInitialState(
  currentDate: ErpDate,
  userId: number,
  targetHours: number
): TimesheetGridState {
  const weekStart = currentDate.getWeekStart();
  const weekDays = weekStart.getWeekDays().map((d) => d.toISOString());

  return withLoading({
    tasks: [],
    timesheets: [],
    rows: [],
    dayTotals: {},
    weekTotal: 0,
    weekStart: weekStart.toISOString(),
    weekDays,
    userId,
    targetHours,
  });
}

/**
 * Store pour gérer la grille de feuilles de temps
 */
export class TimesheetGridStore extends Store<TimesheetGridState> {
  private api: ApiClient;

  constructor(
    api: ApiClient,
    currentDate: ErpDate,
    userId: number = 1,
    targetHours: number = 40
  ) {
    super(createInitialState(currentDate, userId, targetHours));
    this.api = api;
  }

  /**
   * Change la semaine affichée
   */
  setWeek(currentDate: ErpDate): void {
    const weekStart = currentDate.getWeekStart();
    const weekDays = weekStart.getWeekDays().map((d) => d.toISOString());

    this.setState({
      weekStart: weekStart.toISOString(),
      weekDays,
      rows: [],
      dayTotals: {},
      weekTotal: 0,
    });
  }

  /**
   * Charge les tâches non terminées
   */
  async loadTasks(): Promise<TaskData[]> {
    try {
      const domain: Domain = [['state', 'not in', ['done', 'cancelled']]];
      const result = await this.api.search<TaskData>('project.task', domain);
      this.setState({ tasks: result.data });
      this.rebuildRows();
      return result.data;
    } catch (err) {
      this.setState({ error: (err as Error).message });
      return [];
    }
  }

  /**
   * Charge les timesheets de la semaine
   */
  async loadTimesheets(): Promise<TimesheetEntry[]> {
    this.setState({ loading: true, error: null });

    try {
      const { weekStart, weekDays, userId } = this.state;
      const endDate = weekDays[6];

      const domain: Domain = [
        ['date', '>=', weekStart],
        ['date', '<=', endDate],
        ['is_timesheet', '=', true],
      ];

      if (userId) {
        domain.push(['user_id', '=', userId]);
      }

      const result = await this.api.search<TimesheetEntry>(
        'account.analytic.line',
        domain
      );

      this.setState({ timesheets: result.data, loading: false });
      this.rebuildRows();
      return result.data;
    } catch (err) {
      this.setState({ error: (err as Error).message, loading: false });
      return [];
    }
  }

  /**
   * Charge toutes les données (tâches + timesheets)
   */
  async loadAll(): Promise<void> {
    await this.loadTasks();
    await this.loadTimesheets();
  }

  /**
   * Reconstruit les lignes à partir des tâches et timesheets
   */
  private rebuildRows(): void {
    const { tasks, timesheets, userId, weekDays } = this.state;
    const rows: GridRow[] = [];

    // Collecter les task_ids des timesheets
    const taskIdsWithTimesheets = new Set<number>();
    for (const ts of timesheets) {
      const tsTaskId = typeof ts.task_id === 'object' ? ts.task_id.id : ts.task_id;
      if (tsTaskId) taskIdsWithTimesheets.add(tsTaskId);
    }

    for (const task of tasks) {
      if (!task.project_id) continue;

      const taskUserId =
        typeof task.user_id === 'object' ? task.user_id?.id : task.user_id;
      const isAssignedToUser = taskUserId === userId;
      const hasTimesheets = taskIdsWithTimesheets.has(task.id);

      if (!isAssignedToUser && !hasTimesheets) continue;

      const row: GridRow = {
        key: `task-${task.id}`,
        projectId: task.project_id.id,
        projectName: task.project_id.name,
        taskId: task.id,
        taskName: task.name,
        plannedHours: task.planned_hours || 0,
        cells: {},
        totalHours: 0,
        variance: 0,
      };

      // Remplir les cellules
      for (const ts of timesheets) {
        const tsTaskId = typeof ts.task_id === 'object' ? ts.task_id.id : ts.task_id;
        if (tsTaskId === task.id) {
          const dateKey = normalizeDateKey(ts.date);
          if (!row.cells[dateKey]) {
            row.cells[dateKey] = { hours: 0, entryId: null };
          }
          const amount = ErpHours.from(ts.unit_amount);
          row.cells[dateKey].hours = ErpHours.from(row.cells[dateKey].hours)
            .add(amount)
            .toNumber();
          row.cells[dateKey].entryId = ts.id;
          row.totalHours = ErpHours.from(row.totalHours).add(amount).toNumber();
        }
      }

      row.variance = (task.effective_hours || 0) - row.plannedHours;
      rows.push(row);
    }

    // Calculer les totaux
    const dayTotals: Record<string, number> = {};
    let weekTotal = ErpHours.zero();

    for (const day of weekDays) {
      dayTotals[day] = 0;
    }

    for (const row of rows) {
      for (const [date, cell] of Object.entries(row.cells)) {
        const cellHours = ErpHours.from(cell.hours);
        dayTotals[date] = ErpHours.from(dayTotals[date] || 0)
          .add(cellHours)
          .toNumber();
        weekTotal = weekTotal.add(cellHours);
      }
    }

    this.setState({ rows, dayTotals, weekTotal: weekTotal.toNumber() });
  }

  /**
   * Met à jour une cellule (créer/modifier/supprimer une entrée)
   */
  async updateCell(taskId: number, date: string, hours: number): Promise<void> {
    const row = this.state.rows.find((r) => r.taskId === taskId);
    if (!row) return;

    const existingCell = row.cells[date];
    const existingId = existingCell?.entryId;

    try {
      if (hours === 0 && existingId) {
        // Supprimer
        await this.api.delete('account.analytic.line', existingId);
      } else if (existingId) {
        // Modifier
        await this.api.update('account.analytic.line', existingId, {
          unit_amount: hours,
        });
      } else if (hours > 0) {
        // Créer
        const payload: RecordData = {
          id: 0, // sera ignoré par l'API
          date,
          project_id: row.projectId,
          task_id: taskId,
          unit_amount: hours,
          name: row.taskName,
          is_timesheet: true,
        };
        if (this.state.userId) {
          payload.user_id = this.state.userId;
        }
        await this.api.create('account.analytic.line', payload);
      }

      // Recharger les timesheets
      await this.loadTimesheets();
    } catch (err) {
      this.setState({ error: (err as Error).message });
    }
  }

  /**
   * Rafraîchit les données
   */
  async refresh(): Promise<void> {
    await this.loadTimesheets();
  }

  /**
   * Retourne les jours de la semaine sous forme d'ErpDate
   */
  getWeekDaysAsErpDate(): ErpDate[] {
    return this.state.weekDays.map((d) => ErpDate.parse(d)!);
  }

  /**
   * Retourne le début de semaine sous forme d'ErpDate
   */
  getWeekStartAsErpDate(): ErpDate {
    return ErpDate.parse(this.state.weekStart)!;
  }
}

/**
 * Factory pour créer un TimesheetGridStore
 */
export function createTimesheetGridStore(
  api: ApiClient,
  currentDate: ErpDate,
  userId?: number,
  targetHours?: number
): TimesheetGridStore {
  return new TimesheetGridStore(api, currentDate, userId, targetHours);
}
