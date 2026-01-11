import { describe, it, expect, beforeEach } from 'vitest';
import { createTestEnv } from '../../../core/test-helpers/test-env.js';
import ResPartner from '../../base/models/res_partner.js';
import SaleOrder from '../models/sale_order.js';

describe('Sales Addon - Model Actions', () => {
  let env: Awaited<ReturnType<typeof createTestEnv>>['env'];

  beforeEach(async () => {
    const testEnv = await createTestEnv('sales', ['base']);
    env = testEnv.env;
  });

  describe('sale.order - actionConfirm', () => {
    it('should confirm a draft order', async () => {
      const ResPartner = env.model<ResPartner>('res.partner');
      const SaleOrder = env.model<SaleOrder>('sale.order');
      const partner = await ResPartner.create({
        name: 'Test Customer',
      });

      const order = await SaleOrder.create({
        name: 'SO20240001',
        partner_id: partner.first!.id as number,
        state: 'draft',
      });

      const result = await order.actionConfirm();
      expect(result).toBe(true);

      const updated = await env.model<typeof SaleOrder>('sale.order').browse(order.first!.id as number);
      expect(updated.first?.state).toBe('sale');
    });

    it('should confirm a sent quotation', async () => {
      const ResPartner = env.model<ResPartner>('res.partner');
      const SaleOrder = env.model<SaleOrder>('sale.order');
      const partner = await ResPartner.create({
        name: 'Test Customer',
      });

      const order = await SaleOrder.create({
        name: 'SO20240001',
        partner_id: partner.first!.id as number,
        state: 'sent',
      });

      const result = await order.actionConfirm();
      expect(result).toBe(true);

      const updated = await env.model<typeof SaleOrder>('sale.order').browse(order.first!.id as number);
      expect(updated.first?.state).toBe('sale');
    });

    it('should throw error when confirming non-draft/sent order', async () => {
      const ResPartner = env.model<ResPartner>('res.partner');
      const SaleOrder = env.model<SaleOrder>('sale.order');
      const partner = await ResPartner.create({
        name: 'Test Customer',
      });

      const order = await SaleOrder.create({
        name: 'SO20240001',
        partner_id: partner.first!.id as number,
        state: 'sale',
      });

      await expect(order.actionConfirm()).rejects.toThrow(
        'Seuls les devis peuvent être confirmés'
      );
    });
  });

  describe('sale.order - actionSendQuotation', () => {
    it('should send a quotation', async () => {
      const ResPartner = env.model<ResPartner>('res.partner');
      const SaleOrder = env.model<SaleOrder>('sale.order');
      const partner = await ResPartner.create({
        name: 'Test Customer',
      });

      const order = await SaleOrder.create({
        name: 'SO20240001',
        partner_id: partner.first!.id as number,
        state: 'draft',
      });

      const result = await order.actionSendQuotation();
      expect(result).toBe(true);

      const updated = await env.model<typeof SaleOrder>('sale.order').browse(order.first!.id as number);
      expect(updated.first?.state).toBe('sent');
    });
  });

  describe('sale.order - actionCancel', () => {
    it('should cancel an order', async () => {
      const ResPartner = env.model<ResPartner>('res.partner');
      const SaleOrder = env.model<SaleOrder>('sale.order');
      const partner = await ResPartner.create({
        name: 'Test Customer',
      });

      const order = await SaleOrder.create({
        name: 'SO20240001',
        partner_id: partner.first!.id as number,
        state: 'draft',
      });

      const result = await order.actionCancel();
      expect(result).toBe(true);

      const updated = await env.model<typeof SaleOrder>('sale.order').browse(order.first!.id as number);
      expect(updated.first?.state).toBe('cancel');
    });
  });

  describe('sale.order - actionDraft', () => {
    it('should set order back to draft', async () => {
      const ResPartner = env.model<ResPartner>('res.partner');
      const SaleOrder = env.model<SaleOrder>('sale.order');
      const partner = await ResPartner.create({
        name: 'Test Customer',
      });

      const order = await SaleOrder.create({
        name: 'SO20240001',
        partner_id: partner.first!.id as number,
        state: 'sent',
      });

      const result = await order.actionDraft();
      expect(result).toBe(true);

      const updated = await env.model<typeof SaleOrder>('sale.order').browse(order.first!.id as number);
      expect(updated.first?.state).toBe('draft');
    });
  });

  describe('sale.order - actionDone', () => {
    it('should lock an order', async () => {
      const ResPartner = env.model<ResPartner>('res.partner');
      const SaleOrder = env.model<SaleOrder>('sale.order');
      const partner = await ResPartner.create({
        name: 'Test Customer',
      });

      const order = await SaleOrder.create({
        name: 'SO20240001',
        partner_id: partner.first!.id as number,
        state: 'sale',
      });

      const result = await order.actionDone();
      expect(result).toBe(true);

      const updated = await env.model<typeof SaleOrder>('sale.order').browse(order.first!.id as number);
      expect(updated.first?.state).toBe('done');
    });
  });

  describe('sale.order - _computeAmounts', () => {
    it('should compute amounts from order lines', async () => {
      const ResPartner = env.model<ResPartner>('res.partner');
      const SaleOrder = env.model<SaleOrder>('sale.order');
      const partner = await ResPartner.create({
        name: 'Test Customer',
      });

      const order = await SaleOrder.create({
        name: 'SO20240001',
        partner_id: partner.first!.id as number,
        state: 'draft',
      });

      // Créer des lignes de commande
      const OrderLine = env.model('sale.order.line');
      await OrderLine.create({
        order_id: order.first!.id as number,
        product_id: 1,
        price_unit: 100,
        product_uom_qty: 2,
        price_subtotal: 200,
      });

      await OrderLine.create({
        order_id: order.first!.id as number,
        product_id: 2,
        price_unit: 50,
        product_uom_qty: 3,
        price_subtotal: 150,
      });

      // Recalculer les montants
      await order._computeAmounts();

      const updated = await env.model<typeof SaleOrder>('sale.order').browse(order.first!.id as number);
      expect(updated.first?.amount_untaxed).toBe(350);
      expect(updated.first?.amount_tax).toBe(70); // 20% de 350
      expect(updated.first?.amount_total).toBe(420);
    });
  });

  describe('sale.order - create with auto name generation', () => {
    it('should generate name automatically if not provided', async () => {
      const ResPartner = env.model<ResPartner>('res.partner');
      const SaleOrder = env.model<SaleOrder>('sale.order');
      const partner = await ResPartner.create({
        name: 'Test Customer',
      });

      const order = await SaleOrder.create({
        partner_id: partner.first!.id as number,
        // name not provided
      });

      expect(order.first?.name).toBeDefined();
      expect(String(order.first?.name)).toMatch(/^SO\d{4}\d{5}$/);
    });
  });
});
