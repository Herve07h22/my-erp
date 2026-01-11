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
   * Override pour retourner le bon type
   */
  override async create(values: Record<string, unknown>): Promise<ResPartner> {
    return (await super.create(values)) as ResPartner;
  }

  /**
   * Override pour retourner le bon type
   */
  override async browse(ids: number | number[]): Promise<ResPartner> {
    return (await super.browse(ids)) as ResPartner;
  }

  /**
   * Retourne le nom complet avec l'adresse
   */
  async nameGet(): Promise<PartnerNameGetResult[]> {
    const results: PartnerNameGetResult[] = [];
    
    for (const r of this.records) {
      let displayName = r.name as string;
      
      if (!r.is_company && r.parent_id) {
        // Résoudre le nom du parent
        const Parent = this.env.model('res.partner');
        const parent = await Parent.browse(r.parent_id as number);
        if (parent.first) {
          displayName = `${r.name} (${parent.first.name})`;
        }
      }
      
      results.push({
        id: r.id,
        name: r.name as string,
        display_name: displayName,
      });
    }
    
    return results;
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
