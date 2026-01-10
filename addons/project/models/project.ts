import { BaseModel } from '../../../core/server/orm/index.js';
import type { FieldsCollection, RecordData } from '../../../core/server/orm/types.js';

/**
 * Modèle Projet
 * Équivalent de project.project dans Odoo
 */
class Project extends BaseModel {
  static override _name = 'project.project';
  static override _table = 'project_project';
  static override _order = 'sequence, name';

  static override _fields: FieldsCollection = {
    id: { type: 'integer', primaryKey: true },
    name: { type: 'string', required: true, label: 'Nom du projet' },
    description: { type: 'text', label: 'Description' },
    sequence: { type: 'integer', default: 10, label: 'Séquence' },
    active: { type: 'boolean', default: true, label: 'Actif' },
    partner_id: { type: 'many2one', relation: 'res.partner', label: 'Client' },
    user_id: {
      type: 'many2one',
      relation: 'res.users',
      label: 'Chef de projet',
    },
    date_start: { type: 'date', label: 'Date de début' },
    date_end: { type: 'date', label: 'Date de fin' },
    state: {
      type: 'selection',
      options: [
        ['draft', 'Nouveau'],
        ['open', 'En cours'],
        ['pending', 'En attente'],
        ['close', 'Clôturé'],
        ['cancelled', 'Annulé'],
      ],
      default: 'draft',
      label: 'État',
    },
    privacy_visibility: {
      type: 'selection',
      options: [
        ['followers', 'Invités uniquement'],
        ['employees', 'Tous les employés'],
        ['portal', 'Portail et employés'],
      ],
      default: 'employees',
      label: 'Visibilité',
    },
    color: { type: 'integer', default: 0, label: 'Couleur' },
    task_ids: {
      type: 'one2many',
      relation: 'project.task',
      inverse: 'project_id',
      label: 'Tâches',
    },
    task_count: { type: 'integer', compute: '_computeTaskCount', label: 'Nombre de tâches' },
    allow_timesheets: {
      type: 'boolean',
      default: true,
      label: 'Feuilles de temps',
    },
    allocated_hours: { type: 'float', default: 0, label: 'Heures allouées' },
    total_timesheet_time: {
      type: 'float',
      compute: '_computeTotalTimesheetTime',
      label: 'Temps total pointé',
    },
    create_date: { type: 'datetime', label: 'Date de création' },
    write_date: { type: 'datetime', label: 'Date de modification' },
  };

  /**
   * Ouvre le projet
   */
  async actionOpen(): Promise<boolean> {
    await this.write({ state: 'open' });
    return true;
  }

  /**
   * Met le projet en attente
   */
  async actionPending(): Promise<boolean> {
    await this.write({ state: 'pending' });
    return true;
  }

  /**
   * Clôture le projet
   */
  async actionClose(): Promise<boolean> {
    await this.write({ state: 'close' });
    return true;
  }

  /**
   * Annule le projet
   */
  async actionCancel(): Promise<boolean> {
    await this.write({ state: 'cancelled' });
    return true;
  }

  /**
   * Remet le projet en brouillon
   */
  async actionDraft(): Promise<boolean> {
    await this.write({ state: 'draft' });
    return true;
  }

  /**
   * Calcule le nombre de tâches du projet
   */
  async _computeTaskCount(record: RecordData): Promise<number> {
    const Task = this.env.model('project.task');
    return await Task.searchCount([['project_id', '=', record.id]]);
  }

  /**
   * Calcule le temps total pointé sur le projet
   */
  async _computeTotalTimesheetTime(record: RecordData): Promise<number> {
    try {
      const Timesheet = this.env.model('account.analytic.line');
      const timesheets = await Timesheet.search([
        ['project_id', '=', record.id],
      ]);
      return timesheets.records.reduce(
        (sum: number, t: RecordData) => sum + (Number(t.unit_amount) || 0),
        0
      );
    } catch {
      // Module timesheet peut ne pas être installé
      return 0;
    }
  }
}

export default Project;
