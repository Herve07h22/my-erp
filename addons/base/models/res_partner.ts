import { BaseModel } from '../../../core/server/orm/index.js';
import type { FieldsCollection } from '../../../core/server/orm/types.js';

interface PartnerNameGetResult {
  id: number;
  name: string;
  display_name: string;
}

/**
 * Modèle Partenaire (clients, fournisseurs, contacts)
 * Équivalent de res.partner dans Odoo
 */
class ResPartner extends BaseModel {
  static override _name = 'res.partner';
  static override _table = 'res_partner';
  static override _order = 'name';

  static override _fields: FieldsCollection = {
    id: { type: 'integer', primaryKey: true },
    name: { type: 'string', required: true, label: 'Nom' },
    email: { type: 'string', label: 'Email' },
    phone: { type: 'string', label: 'Téléphone' },
    mobile: { type: 'string', label: 'Mobile' },
    street: { type: 'string', label: 'Rue' },
    street2: { type: 'string', label: 'Rue 2' },
    city: { type: 'string', label: 'Ville' },
    zip: { type: 'string', label: 'Code postal' },
    country: { type: 'string', label: 'Pays' },
    vat: { type: 'string', label: 'N° TVA' },
    website: { type: 'string', label: 'Site web' },
    is_company: { type: 'boolean', default: false, label: 'Est une société' },
    company_type: {
      type: 'selection',
      options: [
        ['person', 'Individu'],
        ['company', 'Société'],
      ],
      default: 'person',
      label: 'Type',
    },
    parent_id: { type: 'many2one', relation: 'res.partner', label: 'Société parente' },
    child_ids: {
      type: 'one2many',
      relation: 'res.partner',
      inverse: 'parent_id',
      label: 'Contacts',
    },
    active: { type: 'boolean', default: true, label: 'Actif' },
    comment: { type: 'text', label: 'Notes' },
    create_date: { type: 'datetime', label: 'Date de création' },
    write_date: { type: 'datetime', label: 'Date de modification' },
  };

  /**
   * Retourne le nom complet avec l'adresse
   */
  async nameGet(): Promise<PartnerNameGetResult[]> {
    return this.records.map((r) => ({
      id: r.id,
      name: r.name as string,
      display_name: r.is_company
        ? (r.name as string)
        : `${r.name}${r.parent_id ? ' (' + r.parent_id + ')' : ''}`,
    }));
  }

  /**
   * Archive le partenaire
   */
  async actionArchive(): Promise<boolean> {
    return this.write({ active: false });
  }

  /**
   * Désarchive le partenaire
   */
  async actionUnarchive(): Promise<boolean> {
    return this.write({ active: true });
  }
}

export default ResPartner;
