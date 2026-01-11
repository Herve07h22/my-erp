import { describe, it, expect, beforeEach } from 'vitest';
import { createTestEnv } from '../../../core/test-helpers/test-env.js';
import IrSequence from '../models/ir_sequence.js';

describe('ir.sequence - Séquences automatiques', () => {
  let env: Awaited<ReturnType<typeof createTestEnv>>['env'];
  let pool: Awaited<ReturnType<typeof createTestEnv>>['pool'];

  beforeEach(async () => {
    const testEnv = await createTestEnv('base');
    env = testEnv.env;
    pool = testEnv.pool;

    // Seed des séquences de test
    pool.seed('ir_sequence', [
      {
        id: 1,
        name: 'Test Sequence',
        code: 'test.sequence',
        prefix: 'TEST',
        suffix: '',
        padding: 5,
        number_next: 1,
        number_increment: 1,
        use_date_range: false,
        active: true,
      },
      {
        id: 2,
        name: 'Year Sequence',
        code: 'year.sequence',
        prefix: 'YR%(year)',
        suffix: '',
        padding: 4,
        number_next: 1,
        number_increment: 1,
        use_date_range: true,
        active: true,
      },
      {
        id: 3,
        name: 'Full Date Sequence',
        code: 'date.sequence',
        prefix: 'D%(year)%(month)%(day)-',
        suffix: '',
        padding: 3,
        number_next: 1,
        number_increment: 1,
        use_date_range: true,
        active: true,
      },
      {
        id: 4,
        name: 'Inactive Sequence',
        code: 'inactive.sequence',
        prefix: 'INACTIVE',
        suffix: '',
        padding: 5,
        number_next: 1,
        number_increment: 1,
        use_date_range: false,
        active: false,
      },
    ]);
  });

  describe('nextByCode', () => {
    it('should generate sequential numbers', async () => {
      const Sequence = env.model<typeof IrSequence>('ir.sequence');

      const first = await Sequence.nextByCode('test.sequence');
      expect(first).toBe('TEST00001');

      const second = await Sequence.nextByCode('test.sequence');
      expect(second).toBe('TEST00002');

      const third = await Sequence.nextByCode('test.sequence');
      expect(third).toBe('TEST00003');
    });

    it('should interpolate year in prefix', async () => {
      const Sequence = env.model<typeof IrSequence>('ir.sequence');
      const currentYear = new Date().getFullYear();

      const result = await Sequence.nextByCode('year.sequence');
      expect(result).toBe(`YR${currentYear}0001`);
    });

    it('should interpolate full date in prefix', async () => {
      const Sequence = env.model<typeof IrSequence>('ir.sequence');
      const testDate = new Date(2025, 5, 15); // 15 juin 2025

      const result = await Sequence.nextByCode('date.sequence', testDate);
      expect(result).toBe('D20250615-001');
    });

    it('should throw error for non-existent sequence', async () => {
      const Sequence = env.model<typeof IrSequence>('ir.sequence');

      await expect(Sequence.nextByCode('nonexistent.sequence')).rejects.toThrow(
        'Séquence avec le code "nonexistent.sequence" non trouvée'
      );
    });

    it('should not use inactive sequences', async () => {
      const Sequence = env.model<typeof IrSequence>('ir.sequence');

      await expect(Sequence.nextByCode('inactive.sequence')).rejects.toThrow(
        'Séquence avec le code "inactive.sequence" non trouvée'
      );
    });

    it('should respect padding setting', async () => {
      const Sequence = env.model<typeof IrSequence>('ir.sequence');

      // year.sequence a un padding de 4
      const result = await Sequence.nextByCode('year.sequence');
      const numberPart = result.replace(/\D/g, '').slice(-4);
      expect(numberPart).toBe('0001');
    });
  });

  describe('previewByCode', () => {
    it('should return preview without incrementing', async () => {
      const Sequence = env.model<typeof IrSequence>('ir.sequence');

      const preview1 = await Sequence.previewByCode('test.sequence');
      expect(preview1).toBe('TEST00001');

      const preview2 = await Sequence.previewByCode('test.sequence');
      expect(preview2).toBe('TEST00001'); // Toujours la même valeur

      // Maintenant on incrémente vraiment
      const actual = await Sequence.nextByCode('test.sequence');
      expect(actual).toBe('TEST00001');

      // Le preview suivant doit être différent
      const preview3 = await Sequence.previewByCode('test.sequence');
      expect(preview3).toBe('TEST00002');
    });

    it('should return null for non-existent sequence', async () => {
      const Sequence = env.model<typeof IrSequence>('ir.sequence');

      const result = await Sequence.previewByCode('nonexistent.sequence');
      expect(result).toBeNull();
    });

    it('should interpolate date in preview', async () => {
      const Sequence = env.model<typeof IrSequence>('ir.sequence');
      const currentYear = new Date().getFullYear();

      const preview = await Sequence.previewByCode('year.sequence');
      expect(preview).toBe(`YR${currentYear}0001`);
    });
  });

  describe('CRUD operations', () => {
    it('should create a new sequence', async () => {
      const Sequence = env.model<typeof IrSequence>('ir.sequence');

      const seq = await Sequence.create({
        name: 'Custom Sequence',
        code: 'custom.sequence',
        prefix: 'CUST',
        padding: 6,
        number_next: 100,
      });

      expect(seq.first?.name).toBe('Custom Sequence');
      expect(seq.first?.code).toBe('custom.sequence');

      // Utiliser la nouvelle séquence
      const value = await Sequence.nextByCode('custom.sequence');
      expect(value).toBe('CUST000100');
    });
  });
});
