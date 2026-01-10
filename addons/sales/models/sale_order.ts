import { BaseModel } from '../../../core/server/orm/index.js';
import type { FieldsCollection, RecordData } from '../../../core/server/orm/types.js';

/**
 * Modèle Commande de vente
 * Équivalent de sale.order dans Odoo
 */
class SaleOrder extends BaseModel {
  static override _name = 'sale.order';
  static override _table = 'sale_order';
  static override _order = 'date_order DESC, id DESC';

  static override _fields: FieldsCollection = {
    id: { type: 'integer', primaryKey: true },
    name: { type: 'string', required: true, label: 'Référence' },
    partner_id: {
      type: 'many2one',
      relation: 'res.partner',
      required: true,
      label: 'Client',
    },
    date_order: {
      type: 'datetime',
      default: (): Date => new Date(),
      label: 'Date de commande',
    },
    validity_date: { type: 'date', label: 'Date de validité' },
    state: {
      type: 'selection',
      options: [
        ['draft', 'Devis'],
        ['sent', 'Devis envoyé'],
        ['sale', 'Bon de commande'],
        ['done', 'Verrouillé'],
        ['cancel', 'Annulé'],
      ],
      default: 'draft',
      label: 'État',
    },
    user_id: { type: 'many2one', relation: 'res.users', label: 'Commercial' },
    amount_untaxed: { type: 'monetary', default: 0, label: 'Montant HT' },
    amount_tax: { type: 'monetary', default: 0, label: 'Taxes' },
    amount_total: { type: 'monetary', default: 0, label: 'Total' },
    note: { type: 'text', label: 'Notes' },
    payment_term: { type: 'string', label: 'Conditions de paiement' },
    origin: { type: 'string', label: "Document d'origine" },
    client_order_ref: { type: 'string', label: 'Référence client' },
    line_ids: {
      type: 'one2many',
      relation: 'sale.order.line',
      inverse: 'order_id',
      label: 'Lignes de commande',
    },
    create_date: { type: 'datetime', label: 'Date de création' },
    write_date: { type: 'datetime', label: 'Date de modification' },
  };

  /**
   * Génère une nouvelle référence de commande
   */
  private async _generateName(): Promise<string> {
    const year = new Date().getFullYear();
    const result = await this.env.pool.query(
      `SELECT COUNT(*) as count FROM sale_order WHERE name LIKE $1`,
      [`SO${year}%`]
    );
    const count = parseInt(result.rows[0].count as string, 10) + 1;
    return `SO${year}${String(count).padStart(5, '0')}`;
  }

  /**
   * Crée une commande avec génération automatique du nom
   */
  override async create(values: Record<string, unknown>): Promise<BaseModel> {
    if (!values.name) {
      values.name = await this._generateName();
    }
    return super.create(values);
  }

  /**
   * Confirme le devis en commande
   */
  async actionConfirm(): Promise<boolean> {
    for (const record of this.records) {
      if (record.state !== 'draft' && record.state !== 'sent') {
        throw new Error('Seuls les devis peuvent être confirmés');
      }
    }
    await this.write({ state: 'sale' });
    await this._computeAmounts();
    return true;
  }

  /**
   * Envoie le devis par email
   */
  async actionSendQuotation(): Promise<boolean> {
    await this.write({ state: 'sent' });
    // TODO: Implémenter l'envoi d'email
    return true;
  }

  /**
   * Annule la commande
   */
  async actionCancel(): Promise<boolean> {
    await this.write({ state: 'cancel' });
    return true;
  }

  /**
   * Remet en brouillon
   */
  async actionDraft(): Promise<boolean> {
    await this.write({ state: 'draft' });
    return true;
  }

  /**
   * Verrouille la commande
   */
  async actionDone(): Promise<boolean> {
    await this.write({ state: 'done' });
    return true;
  }

  /**
   * Recalcule les montants de la commande
   */
  async _computeAmounts(): Promise<void> {
    for (const record of this.records) {
      const lines = await this.env.model('sale.order.line').search([
        ['order_id', '=', record.id],
      ]);

      let amount_untaxed = 0;
      let amount_tax = 0;

      for (const line of lines.records) {
        amount_untaxed += (line.price_subtotal as number) || 0;
        amount_tax += ((line.price_subtotal as number) || 0) * 0.2; // TVA 20% par défaut
      }

      await this._wrap([record]).write({
        amount_untaxed,
        amount_tax,
        amount_total: amount_untaxed + amount_tax,
      });
    }
  }
}

export default SaleOrder;
