import { BaseModel } from '../../../core/server/orm/index.js';
import type { FieldsCollection, RecordData } from '../../../core/server/orm/types.js';

interface DaySummary {
  date: string;
  hours: number;
  lines: RecordData[];
}

interface ProjectSummary {
  project_id: number;
  hours: number;
}

interface WeeklySummary {
  week_start: Date;
  total_hours: number;
  by_day: DaySummary[];
  by_project: ProjectSummary[];
  lines: RecordData[];
}

/**
 * Modèle Ligne de feuille de temps
 * Équivalent de account.analytic.line (avec project_id) dans Odoo
 */
class TimesheetLine extends BaseModel {
  static override _name = 'account.analytic.line';
  static override _table = 'account_analytic_line';
  static override _order = 'date DESC, id DESC';

  static override _fields: FieldsCollection = {
    id: { type: 'integer', primaryKey: true },
    name: { type: 'string', required: true, label: 'Description' },
    date: {
      type: 'date',
      required: true,
      default: (): Date => new Date(),
      label: 'Date',
    },
    user_id: {
      type: 'many2one',
      relation: 'res.users',
      required: true,
      label: 'Employé',
    },
    project_id: {
      type: 'many2one',
      relation: 'project.project',
      label: 'Projet',
    },
    task_id: { type: 'many2one', relation: 'project.task', label: 'Tâche' },
    unit_amount: {
      type: 'float',
      default: 0,
      required: true,
      label: 'Durée (heures)',
    },
    amount: { type: 'monetary', default: 0, label: 'Montant' },
    partner_id: { type: 'many2one', relation: 'res.partner', label: 'Client' },
    company_id: { type: 'many2one', relation: 'res.company', label: 'Société' },
    is_timesheet: {
      type: 'boolean',
      default: true,
      label: 'Est une feuille de temps',
    },
    validated: { type: 'boolean', default: false, label: 'Validé' },
    validated_date: { type: 'datetime', label: 'Date de validation' },
    validated_by: {
      type: 'many2one',
      relation: 'res.users',
      label: 'Validé par',
    },
    create_date: { type: 'datetime', label: 'Date de création' },
    write_date: { type: 'datetime', label: 'Date de modification' },
  };

  /**
   * Crée une ligne de timesheet avec mise à jour des heures de la tâche
   */
  override async create(values: Record<string, unknown>): Promise<BaseModel> {
    values.is_timesheet = true;

    // Récupérer le partenaire du projet si disponible
    if (values.project_id && !values.partner_id) {
      const Project = this.env.model('project.project');
      const project = await Project.browse(values.project_id as number);
      if (project.first?.partner_id) {
        values.partner_id = project.first.partner_id;
      }
    }

    const result = await super.create(values);

    // Mettre à jour les heures de la tâche
    if (values.task_id) {
      await this._updateTaskHours(values.task_id as number);
    }

    // Mettre à jour les heures du projet
    if (values.project_id) {
      await this._updateProjectHours(values.project_id as number);
    }

    return result;
  }

  /**
   * Met à jour avec recalcul des heures
   */
  override async write(values: Record<string, unknown>): Promise<boolean> {
    const oldTaskIds = new Set(
      this.records.map((r) => r.task_id as number).filter(Boolean)
    );
    const oldProjectIds = new Set(
      this.records.map((r) => r.project_id as number).filter(Boolean)
    );

    const result = await super.write(values);

    // Recalculer les heures des anciennes et nouvelles tâches
    const taskIds = new Set([...oldTaskIds]);
    if (values.task_id) taskIds.add(values.task_id as number);

    for (const taskId of taskIds) {
      await this._updateTaskHours(taskId);
    }

    // Recalculer les heures des anciens et nouveaux projets
    const projectIds = new Set([...oldProjectIds]);
    if (values.project_id) projectIds.add(values.project_id as number);

    for (const projectId of projectIds) {
      await this._updateProjectHours(projectId);
    }

    return result;
  }

  /**
   * Supprime avec recalcul des heures
   */
  override async unlink(): Promise<boolean> {
    const taskIds = new Set(
      this.records.map((r) => r.task_id as number).filter(Boolean)
    );
    const projectIds = new Set(
      this.records.map((r) => r.project_id as number).filter(Boolean)
    );

    const result = await super.unlink();

    for (const taskId of taskIds) {
      await this._updateTaskHours(taskId);
    }

    for (const projectId of projectIds) {
      await this._updateProjectHours(projectId);
    }

    return result;
  }

  /**
   * Valide les feuilles de temps sélectionnées
   */
  async actionValidate(): Promise<boolean> {
    await this.write({
      validated: true,
      validated_date: new Date(),
      // validated_by sera défini par le contexte utilisateur
    });
    return true;
  }

  /**
   * Refuse la validation
   */
  async actionRefuse(): Promise<boolean> {
    await this.write({
      validated: false,
      validated_date: null,
      validated_by: null,
    });
    return true;
  }

  /**
   * Met à jour les heures effectives d'une tâche
   */
  private async _updateTaskHours(taskId: number): Promise<void> {
    if (!taskId) return;

    const timesheets = await this.search([['task_id', '=', taskId]]);
    const totalHours = timesheets.records.reduce(
      (sum: number, t: RecordData) => sum + (Number(t.unit_amount) || 0),
      0
    );

    const Task = this.env.model('project.task');
    const task = await Task.browse(taskId);

    if (task.length) {
      const plannedHours = Number(task.first?.planned_hours) || 0;
      const remainingHours = Math.max(0, plannedHours - totalHours);
      const progress =
        plannedHours > 0 ? Math.min(100, (totalHours / plannedHours) * 100) : 0;

      await task.write({
        effective_hours: totalHours,
        remaining_hours: remainingHours,
        progress,
      });
    }
  }

  /**
   * Met à jour les heures totales d'un projet
   */
  private async _updateProjectHours(projectId: number): Promise<void> {
    if (!projectId) return;

    const timesheets = await this.search([['project_id', '=', projectId]]);
    const totalHours = timesheets.records.reduce(
      (sum: number, t: RecordData) => sum + (Number(t.unit_amount) || 0),
      0
    );

    const Project = this.env.model('project.project');
    const project = await Project.browse(projectId);

    if (project.length) {
      await project.write({
        total_timesheet_time: totalHours,
      });
    }
  }

  /**
   * Récupère le résumé hebdomadaire pour un utilisateur
   */
  async getWeeklySummary(userId: number, weekStart: Date): Promise<WeeklySummary> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const timesheets = await this.search([
      ['user_id', '=', userId],
      ['date', '>=', weekStart.toISOString().split('T')[0]],
      ['date', '<', weekEnd.toISOString().split('T')[0]],
    ]);

    // Grouper par jour
    const byDay: Record<string, DaySummary> = {};
    for (const ts of timesheets.records) {
      const day = ts.date as string;
      if (!byDay[day]) {
        byDay[day] = { date: day, hours: 0, lines: [] };
      }
      byDay[day].hours += Number(ts.unit_amount) || 0;
      byDay[day].lines.push(ts);
    }

    // Grouper par projet
    const byProject: Record<number, ProjectSummary> = {};
    for (const ts of timesheets.records) {
      const projectId = (ts.project_id as number) || 0;
      if (!byProject[projectId]) {
        byProject[projectId] = { project_id: projectId, hours: 0 };
      }
      byProject[projectId].hours += Number(ts.unit_amount) || 0;
    }

    const totalHours = timesheets.records.reduce(
      (sum: number, t: RecordData) => sum + (Number(t.unit_amount) || 0),
      0
    );

    return {
      week_start: weekStart,
      total_hours: totalHours,
      by_day: Object.values(byDay),
      by_project: Object.values(byProject),
      lines: timesheets.records,
    };
  }
}

export default TimesheetLine;
