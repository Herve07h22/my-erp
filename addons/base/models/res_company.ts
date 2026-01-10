import { BaseModel } from '../../../core/server/orm/index.js';
import type { FieldsCollection } from '../../../core/server/orm/types.js';

/**
 * Modèle Société
 * Équivalent de res.company dans Odoo
 */
class ResCompany extends BaseModel {
  static override _name = 'res.company';
  static override _table = 'res_company';
  static override _order = 'name';

  static override _fields: FieldsCollection = {
    id: { type: 'integer', primaryKey: true },
    name: { type: 'string', required: true, label: 'Nom de la société' },
    partner_id: { type: 'many2one', relation: 'res.partner', label: 'Partenaire' },
    currency_id: { type: 'string', default: 'EUR', label: 'Devise' },
    street: { type: 'string', label: 'Rue' },
    street2: { type: 'string', label: 'Rue 2' },
    city: { type: 'string', label: 'Ville' },
    zip: { type: 'string', label: 'Code postal' },
    country: { type: 'string', label: 'Pays' },
    email: { type: 'string', label: 'Email' },
    phone: { type: 'string', label: 'Téléphone' },
    website: { type: 'string', label: 'Site web' },
    vat: { type: 'string', label: 'N° TVA' },
    logo: { type: 'text', label: 'Logo (base64)' },
    active: { type: 'boolean', default: true, label: 'Active' },
    create_date: { type: 'datetime', label: 'Date de création' },
    write_date: { type: 'datetime', label: 'Date de modification' },
  };
}

export default ResCompany;
