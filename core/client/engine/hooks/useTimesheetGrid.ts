import { useState, useEffect, useCallback, useMemo } from 'react';
import { getWeekStart, getWeekDays, formatDateISO } from '../components/WeekNavigator.js';
import { ErpDate } from '../../../shared/erp-date/index.js';

const API_BASE = '/api';

/**
 * Normalise une date en format YYYY-MM-DD
 */
function normalizeDateKey(date: string | ErpDate): string {
  if (date instanceof ErpDate) {
    return date.toISOString();
  }
  const parsed = ErpDate.parse(date);
  return parsed?.toISOString() ?? '';
}

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
  date: string | ErpDate;
  task_id: number | { id: number };
  unit_amount: number;
}

export interface GridRow {
  key: string;
  projectId: number;
  projectName: string;
  taskId: number;
  taskName: string;
  plannedHours: number;
  cells: Record<string, { hours: number; entryId: number | null }>;
  totalHours: number;
  variance: number;
}

export interface TimesheetGridData {
  rows: GridRow[];
  dayTotals: Record<string, number>;
  weekTotal: number;
  targetHours: number;
}

interface UseTimesheetGridReturn extends TimesheetGridData {
  loading: boolean;
  error: string | null;
  weekStart: ErpDate;
  weekDays: ErpDate[];
  updateCell: (taskId: number, date: string, hours: number) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook pour gérer les données de la grille de feuilles de temps
 * Les lignes sont basées sur les tâches non terminées
 */
export function useTimesheetGrid(
  currentDate: ErpDate,
  userId: number = 1, // TODO: Get from auth context when implemented
  targetHours: number = 40
): UseTimesheetGridReturn {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate.toISOString()]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart.toISOString()]);
  const weekKey = formatDateISO(weekStart);

  // Charger les tâches non terminées
  const loadTasks = useCallback(async (): Promise<void> => {
    try {
      const domain = JSON.stringify([
        ['state', 'not in', ['done', 'cancelled']],
      ]);
      const res = await fetch(`${API_BASE}/project/task?domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.data);
      }
    } catch (err) {
      console.error('Erreur chargement tâches:', err);
    }
  }, []);

  // Charger les timesheets de la semaine
  const loadTimesheets = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const startDate = formatDateISO(weekStart);
      const endDate = formatDateISO(weekDays[6]);

      const domain: unknown[] = [
        ['date', '>=', startDate],
        ['date', '<=', endDate],
        ['is_timesheet', '=', true],
      ];

      if (userId) {
        domain.push(['user_id', '=', userId]);
      }

      const params = new URLSearchParams({
        domain: JSON.stringify(domain),
      });

      const res = await fetch(`${API_BASE}/account/analytic/line?${params}`);
      const data = await res.json();

      if (data.success) {
        setTimesheets(data.data);
      } else {
        setError(data.error || 'Erreur de chargement');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [weekKey, userId]);

  // Charger au montage
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadTimesheets();
  }, [loadTimesheets]);

  // Construire les lignes à partir des tâches et timesheets
  // Filtre: tâches assignées à l'utilisateur OU avec des timesheets cette semaine
  const rows = useMemo((): GridRow[] => {
    const result: GridRow[] = [];

    // Collecter les task_ids des timesheets de cette semaine
    const taskIdsWithTimesheets = new Set<number>();
    for (const ts of timesheets) {
      const tsTaskId = typeof ts.task_id === 'object' ? ts.task_id.id : ts.task_id;
      if (tsTaskId) taskIdsWithTimesheets.add(tsTaskId);
    }

    for (const task of tasks) {
      if (!task.project_id) continue;

      // Vérifier si la tâche est assignée à l'utilisateur
      const taskUserId = typeof task.user_id === 'object' ? task.user_id?.id : task.user_id;
      const isAssignedToUser = taskUserId === userId;

      // Vérifier si l'utilisateur a des timesheets sur cette tâche
      const hasTimesheets = taskIdsWithTimesheets.has(task.id);

      // Garder uniquement les tâches assignées OU avec des timesheets
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

      // Remplir les cellules avec les timesheets existants
      for (const ts of timesheets) {
        const tsTaskId = typeof ts.task_id === 'object' ? ts.task_id.id : ts.task_id;
        if (tsTaskId === task.id) {
          const dateKey = normalizeDateKey(ts.date);
          if (!row.cells[dateKey]) {
            row.cells[dateKey] = { hours: 0, entryId: null };
          }
          row.cells[dateKey].hours += ts.unit_amount;
          row.cells[dateKey].entryId = ts.id;
          row.totalHours += ts.unit_amount;
        }
      }

      row.variance = row.totalHours - row.plannedHours;
      result.push(row);
    }

    return result;
  }, [tasks, timesheets, userId]);

  // Calculer les totaux
  const { dayTotals, weekTotal } = useMemo(() => {
    const totals: Record<string, number> = {};
    let total = 0;

    for (const day of weekDays) {
      totals[formatDateISO(day)] = 0;
    }

    for (const row of rows) {
      for (const [date, cell] of Object.entries(row.cells)) {
        totals[date] = (totals[date] || 0) + cell.hours;
        total += cell.hours;
      }
    }

    return { dayTotals: totals, weekTotal: total };
  }, [rows, weekDays]);

  // Mettre à jour une cellule
  const updateCell = useCallback(
    async (taskId: number, date: string, hours: number): Promise<void> => {
      const row = rows.find((r) => r.taskId === taskId);
      if (!row) return;

      const existingCell = row.cells[date];
      const existingId = existingCell?.entryId;

      try {
        if (hours === 0 && existingId) {
          // Supprimer
          await fetch(`${API_BASE}/account/analytic/line/${existingId}`, {
            method: 'DELETE',
          });
        } else if (existingId) {
          // Modifier
          await fetch(`${API_BASE}/account/analytic/line/${existingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ unit_amount: hours }),
          });
        } else if (hours > 0) {
          // Créer
          const payload: Record<string, unknown> = {
            date,
            project_id: row.projectId,
            task_id: taskId,
            unit_amount: hours,
            name: row.taskName,
            is_timesheet: true,
          };
          if (userId) {
            payload.user_id = userId;
          }

          await fetch(`${API_BASE}/account/analytic/line`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }

        // Recharger les timesheets
        await loadTimesheets();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de sauvegarde');
      }
    },
    [rows, userId, loadTimesheets]
  );

  return {
    rows,
    dayTotals,
    weekTotal,
    targetHours,
    loading,
    error,
    weekStart,
    weekDays,
    updateCell,
    refresh: loadTimesheets,
  };
}

export default useTimesheetGrid;
