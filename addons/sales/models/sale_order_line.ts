import { BaseModel } from '../../../core/server/orm/index.js';
import type { FieldsCollection, RecordData } from '../../../core/server/orm/types.js';

interface ProductOnchangeResult {
  name?: string;
  price_unit?: number;
  product_uom?: string;
}

interface SubtotalValues {
  product_uom_qty?: number;
  price_unit?: number;
  discount?: number;
}

/**
 * Modèle Ligne de commande de vente
 * Équivalent de sale.order.line dans Odoo
 */
class SaleOrderLine extends BaseModel {
  static override _name = 'sale.order.line';
  static override _table = 'sale_order_line';
  static override _order = 'order_id, sequence, id';

  static override _fields: FieldsCollection = {
    id: { type: 'integer', primaryKey: true },
    order_id: {
      type: 'many2one',
      relation: 'sale.order',
      required: true,
      onDelete: 'CASCADE',
      label: 'Commande',
    },
    sequence: { type: 'integer', default: 10, label: 'Séquence' },
    product_id: {
      type: 'many2one',
      relation: 'product.product',
      label: 'Produit',
    },
    name: { type: 'text', required: true, label: 'Description' },
    product_uom_qty: { type: 'float', default: 1, label: 'Quantité' },
    product_uom: { type: 'string', default: 'Unité', label: 'Unité' },
    price_unit: { type: 'monetary', default: 0, label: 'Prix unitaire' },
    discount: { type: 'float', default: 0, label: 'Remise (%)' },
    price_subtotal: { type: 'monetary', default: 0, label: 'Sous-total' },
    tax_id: { type: 'string', label: 'Taxes' },
    create_date: { type: 'datetime', label: 'Date de création' },
    write_date: { type: 'datetime', label: 'Date de modification' },
  };

  /**
   * Crée une ligne avec calcul automatique du sous-total
   */
  override async create(values: Record<string, unknown>): Promise<BaseModel> {
    values.price_subtotal = this._computeSubtotal(values as SubtotalValues);
    const result = await super.create(values);
    await this._updateOrderTotals(values.order_id as number);
    return result;
  }

  /**
   * Met à jour une ligne avec recalcul du sous-total
   */
  override async write(values: Record<string, unknown>): Promise<boolean> {
    if (
      values.product_uom_qty !== undefined ||
      values.price_unit !== undefined ||
      values.discount !== undefined
    ) {
      const current = this.first;
      values.price_subtotal = this._computeSubtotal({
        product_uom_qty:
          (values.product_uom_qty as number) ??
          (current?.product_uom_qty as number) ??
          1,
        price_unit:
          (values.price_unit as number) ?? (current?.price_unit as number) ?? 0,
        discount:
          (values.discount as number) ?? (current?.discount as number) ?? 0,
      });
    }

    const result = await super.write(values);

    // Mettre à jour les totaux de la commande
    for (const record of this.records) {
      await this._updateOrderTotals(record.order_id as number);
    }

    return result;
  }

  /**
   * Supprime les lignes et met à jour les totaux
   */
  override async unlink(): Promise<boolean> {
    const orderIds = [
      ...new Set(this.records.map((r) => r.order_id as number)),
    ];
    const result = await super.unlink();

    for (const orderId of orderIds) {
      await this._updateOrderTotals(orderId);
    }

    return result;
  }

  /**
   * Calcule le sous-total d'une ligne
   */
  private _computeSubtotal(values: SubtotalValues): number {
    const qty = values.product_uom_qty || 1;
    const price = values.price_unit || 0;
    const discount = values.discount || 0;
    return qty * price * (1 - discount / 100);
  }

  /**
   * Met à jour les totaux de la commande parente
   */
  private async _updateOrderTotals(orderId: number | undefined): Promise<void> {
    if (!orderId) return;

    const Order = this.env.model('sale.order');
    const order = await Order.browse(orderId);
    if (order.length && '_computeAmounts' in order && typeof (order as { _computeAmounts: () => Promise<void> })._computeAmounts === 'function') {
      await (order as { _computeAmounts: () => Promise<void> })._computeAmounts();
    }
  }

  /**
   * Récupère les informations du produit sélectionné
   */
  async onchangeProductId(productId: number): Promise<ProductOnchangeResult> {
    if (!productId) return {};

    const Product = this.env.model('product.product');
    const product = await Product.browse(productId);

    if (!product.length) return {};

    const p = product.first as RecordData;
    return {
      name:
        (p.name as string) + (p.description ? '\n' + p.description : ''),
      price_unit: p.list_price as number,
      product_uom: p.uom_id as string,
    };
  }
}

export default SaleOrderLine;
