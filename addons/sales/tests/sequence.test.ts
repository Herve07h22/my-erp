import { describe, it, expect, beforeEach } from 'vitest';
import { createTestEnv } from '../../../core/test-helpers/test-env.js';
import type SaleOrderModel from '../models/sale_order.js';
import type ResPartnerModel from '../../base/models/res_partner.js';

describe('sale.order - Intégration avec ir.sequence', () => {
  let env: Awaited<ReturnType<typeof createTestEnv>>['env'];
  let pool: Awaited<ReturnType<typeof createTestEnv>>['pool'];

  beforeEach(async () => {
    const testEnv = await createTestEnv('sales', ['base']);
    env = testEnv.env;
    pool = testEnv.pool;

    // Seed de la séquence sale.order
    pool.seed('ir_sequence', [
      {
        id: 1,
        name: 'Devis / Commande',
        code: 'sale.order',
        prefix: 'SO%(year)',
        suffix: '',
        padding: 5,
        number_next: 1,
        number_increment: 1,
        use_date_range: true,
        active: true,
      },
    ]);
  });

  describe('Génération automatique de référence', () => {
    it('should auto-generate name using ir.sequence', async () => {
      const Partner = env.model<typeof ResPartnerModel>('res.partner');
      const SaleOrder = env.model<typeof SaleOrderModel>('sale.order');

      const partner = await Partner.create({ name: 'Test Customer' });
      const currentYear = new Date().getFullYear();

      const order = await SaleOrder.create({
        partner_id: partner.first!.id,
      });

      expect(order.first?.name).toBe(`SO${currentYear}00001`);
    });

    it('should generate sequential names for multiple orders', async () => {
      const Partner = env.model<typeof ResPartnerModel>('res.partner');
      const SaleOrder = env.model<typeof SaleOrderModel>('sale.order');

      const partner = await Partner.create({ name: 'Test Customer' });
      const currentYear = new Date().getFullYear();

      const order1 = await SaleOrder.create({ partner_id: partner.first!.id });
      const order2 = await SaleOrder.create({ partner_id: partner.first!.id });
      const order3 = await SaleOrder.create({ partner_id: partner.first!.id });

      expect(order1.first?.name).toBe(`SO${currentYear}00001`);
      expect(order2.first?.name).toBe(`SO${currentYear}00002`);
      expect(order3.first?.name).toBe(`SO${currentYear}00003`);
    });

    it('should allow custom name override', async () => {
      const Partner = env.model<typeof ResPartnerModel>('res.partner');
      const SaleOrder = env.model<typeof SaleOrderModel>('sale.order');

      const partner = await Partner.create({ name: 'Test Customer' });

      const order = await SaleOrder.create({
        name: 'CUSTOM-001',
        partner_id: partner.first!.id,
      });

      expect(order.first?.name).toBe('CUSTOM-001');
    });

    it('should continue sequence after custom name', async () => {
      const Partner = env.model<typeof ResPartnerModel>('res.partner');
      const SaleOrder = env.model<typeof SaleOrderModel>('sale.order');

      const partner = await Partner.create({ name: 'Test Customer' });
      const currentYear = new Date().getFullYear();

      // Première commande auto-générée
      const order1 = await SaleOrder.create({ partner_id: partner.first!.id });
      expect(order1.first?.name).toBe(`SO${currentYear}00001`);

      // Commande avec nom personnalisé (n'affecte pas la séquence)
      await SaleOrder.create({
        name: 'CUSTOM-001',
        partner_id: partner.first!.id,
      });

      // Troisième commande continue la séquence
      const order3 = await SaleOrder.create({ partner_id: partner.first!.id });
      expect(order3.first?.name).toBe(`SO${currentYear}00002`);
    });
  });

  describe('Propriété _sequence', () => {
    it('should have _sequence property defined', async () => {
      const saleOrder = env.model<typeof SaleOrderModel>('sale.order');
      const ModelClass = saleOrder.constructor as typeof SaleOrderModel;

      expect(ModelClass._sequence).toBe('sale.order');
    });
  });
});
