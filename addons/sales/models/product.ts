import { BaseModel } from '../../../core/server/orm/index.js';
import type { FieldsCollection } from '../../../core/server/orm/types.js';

interface MarginResult {
  id: number;
  margin: number;
  margin_percent: number;
}

/**
 * Modèle Produit
 * Équivalent de product.product dans Odoo
 */
class Product extends BaseModel {
  static override _name = 'product.product';
  static override _table = 'product_product';
  static override _order = 'name';

  static override _fields: FieldsCollection = {
    id: { type: 'integer', primaryKey: true },
    name: { type: 'string', required: true, label: 'Nom' },
    description: { type: 'text', label: 'Description' },
    default_code: { type: 'string', label: 'Référence interne' },
    barcode: { type: 'string', label: 'Code-barres' },
    list_price: { type: 'monetary', default: 0, label: 'Prix de vente' },
    standard_price: { type: 'monetary', default: 0, label: 'Coût' },
    type: {
      type: 'selection',
      options: [
        ['consu', 'Consommable'],
        ['service', 'Service'],
        ['product', 'Produit stockable'],
      ],
      default: 'consu',
      label: 'Type de produit',
    },
    categ_id: {
      type: 'many2one',
      relation: 'product.category',
      label: 'Catégorie',
    },
    uom_id: { type: 'string', default: 'Unité', label: 'Unité de mesure' },
    active: { type: 'boolean', default: true, label: 'Actif' },
    sale_ok: { type: 'boolean', default: true, label: 'Peut être vendu' },
    purchase_ok: { type: 'boolean', default: true, label: 'Peut être acheté' },
    image: { type: 'text', label: 'Image (base64)' },
    create_date: { type: 'datetime', label: 'Date de création' },
    write_date: { type: 'datetime', label: 'Date de modification' },
  };

  /**
   * Calcule la marge
   */
  getMargin(): MarginResult[] {
    return this.records.map((r) => ({
      id: r.id,
      margin: (r.list_price as number) - (r.standard_price as number),
      margin_percent:
        (r.list_price as number) > 0
          ? (((r.list_price as number) - (r.standard_price as number)) /
              (r.list_price as number)) *
            100
          : 0,
    }));
  }
}

export default Product;
