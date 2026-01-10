import { BaseModel } from '../../../core/server/orm/index.js';
import type { FieldsCollection } from '../../../core/server/orm/types.js';

/**
 * Modèle Tag de projet
 * Équivalent de project.tags dans Odoo
 */
class ProjectTag extends BaseModel {
  static override _name = 'project.tag';
  static override _table = 'project_tag';
  static override _order = 'name';

  static override _fields: FieldsCollection = {
    id: { type: 'integer', primaryKey: true },
    name: { type: 'string', required: true, label: 'Nom' },
    color: { type: 'integer', default: 0, label: 'Couleur' },
  };
}

export default ProjectTag;
