import { BaseModel } from '../../../core/server/orm/index.js';
import type { FieldsCollection, RecordData } from '../../../core/server/orm/types.js';

/**
 * Modèle Tâche
 * Équivalent de project.task dans Odoo
 */
class ProjectTask extends BaseModel {
  static override _name = 'project.task';
  static override _table = 'project_task';
  static override _order = 'priority DESC, sequence, date_deadline, id';

  static override _fields: FieldsCollection = {
    id: { type: 'integer', primaryKey: true },
    name: { type: 'string', required: true, label: 'Titre' },
    description: { type: 'text', label: 'Description' },
    sequence: { type: 'integer', default: 10, label: 'Séquence' },
    priority: {
      type: 'selection',
      options: [
        ['0', 'Normal'],
        ['1', 'Important'],
      ],
      default: '0',
      label: 'Priorité',
    },
    project_id: {
      type: 'many2one',
      relation: 'project.project',
      required: true,
      label: 'Projet',
    },
    user_ids: { type: 'many2many', relation: 'res.users', label: 'Assigné à' },
    user_id: { type: 'many2one', relation: 'res.users', label: 'Assigné à' },
    partner_id: { type: 'many2one', relation: 'res.partner', label: 'Client' },
    stage_id: {
      type: 'many2one',
      relation: 'project.task.stage',
      label: 'Étape',
    },
    stage_name: { type: 'string', label: "Nom de l'étape" },
    state: {
      type: 'selection',
      options: [
        ['draft', 'Nouveau'],
        ['open', 'En cours'],
        ['pending', 'En attente'],
        ['done', 'Terminé'],
        ['cancelled', 'Annulé'],
      ],
      default: 'draft',
      label: 'État',
    },
    kanban_state: {
      type: 'selection',
      options: [
        ['normal', 'Gris'],
        ['done', 'Vert'],
        ['blocked', 'Rouge'],
      ],
      default: 'normal',
      label: 'État Kanban',
    },
    date_deadline: { type: 'date', label: 'Date limite' },
    date_assign: { type: 'datetime', label: "Date d'assignation" },
    date_end: { type: 'datetime', label: 'Date de fin' },
    planned_hours: { type: 'float', default: 0, label: 'Heures planifiées' },
    effective_hours: { type: 'float', default: 0, label: 'Heures effectives' },
    remaining_hours: { type: 'float', default: 0, label: 'Heures restantes' },
    progress: { type: 'float', default: 0, label: 'Progression (%)' },
    timesheet_ids: {
      type: 'one2many',
      relation: 'account.analytic.line',
      inverse: 'task_id',
      label: 'Feuilles de temps',
    },
    parent_id: {
      type: 'many2one',
      relation: 'project.task',
      label: 'Tâche parente',
    },
    child_ids: {
      type: 'one2many',
      relation: 'project.task',
      inverse: 'parent_id',
      label: 'Sous-tâches',
    },
    tag_ids: { type: 'many2many', relation: 'project.tag', label: 'Tags' },
    color: { type: 'integer', default: 0, label: 'Couleur' },
    active: { type: 'boolean', default: true, label: 'Active' },
    create_date: { type: 'datetime', label: 'Date de création' },
    write_date: { type: 'datetime', label: 'Date de modification' },
  };

  /**
   * Override pour retourner le bon type
   */
  override async create(values: Record<string, unknown>): Promise<ProjectTask> {
    return (await super.create(values)) as ProjectTask;
  }

  /**
   * Override pour retourner le bon type
   */
  override async browse(ids: number | number[]): Promise<ProjectTask> {
    return (await super.browse(ids)) as ProjectTask;
  }

  /**
   * Démarre la tâche
   */
  async actionStart(): Promise<boolean> {
    await this.write({
      state: 'open',
      date_assign: new Date(),
    });
    return true;
  }

  /**
   * Met la tâche en attente
   */
  async actionPending(): Promise<boolean> {
    await this.write({ state: 'pending' });
    return true;
  }

  /**
   * Termine la tâche
   */
  async actionDone(): Promise<boolean> {
    await this.write({
      state: 'done',
      date_end: new Date(),
      progress: 100,
    });
    return true;
  }

  /**
   * Annule la tâche
   */
  async actionCancel(): Promise<boolean> {
    await this.write({ state: 'cancelled' });
    return true;
  }

  /**
   * Recalcule les heures
   */
  async _computeHours(): Promise<void> {
    for (const record of this.records) {
      let effectiveHours = 0;

      try {
        const Timesheet = this.env.model('account.analytic.line');
        const timesheets = await Timesheet.search([
          ['task_id', '=', record.id],
        ]);
        effectiveHours = timesheets.records.reduce(
          (sum: number, t: RecordData) => sum + (Number(t.unit_amount) || 0),
          0
        );
      } catch {
        // Module timesheet peut ne pas être installé
      }

      const plannedHours = Number(record.planned_hours) || 0;
      const remainingHours = Math.max(0, plannedHours - effectiveHours);
      const progress =
        plannedHours > 0
          ? Math.min(100, (effectiveHours / plannedHours) * 100)
          : 0;

      await this._wrap([record]).write({
        effective_hours: effectiveHours,
        remaining_hours: remainingHours,
        progress,
      });
    }
  }
}

export default ProjectTask;
