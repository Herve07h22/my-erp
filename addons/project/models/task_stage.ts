import { BaseModel } from '../../../core/server/orm/index.js';
import type { FieldsCollection } from '../../../core/server/orm/types.js';

/**
 * Modèle Étape de tâche (colonnes Kanban)
 * Équivalent de project.task.type dans Odoo
 */
class ProjectTaskStage extends BaseModel {
  static override _name = 'project.task.stage';
  static override _table = 'project_task_stage';
  static override _order = 'sequence, id';

  static override _fields: FieldsCollection = {
    id: { type: 'integer', primaryKey: true },
    name: { type: 'string', required: true, label: "Nom de l'étape" },
    description: { type: 'text', label: 'Description' },
    sequence: { type: 'integer', default: 10, label: 'Séquence' },
    fold: { type: 'boolean', default: false, label: 'Replié par défaut' },
    is_closed: { type: 'boolean', default: false, label: 'Étape de clôture' },
    project_ids: {
      type: 'many2many',
      relation: 'project.project',
      label: 'Projets',
    },
    create_date: { type: 'datetime', label: 'Date de création' },
    write_date: { type: 'datetime', label: 'Date de modification' },
  };
}

export default ProjectTaskStage;
