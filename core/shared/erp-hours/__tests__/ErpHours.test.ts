import { describe, it, expect } from 'vitest';
import { ErpHours } from '../ErpHours.js';

describe('ErpHours', () => {
  describe('Factory methods', () => {
    describe('zero()', () => {
      it('should create zero hours', () => {
        expect(ErpHours.zero().toNumber()).toBe(0);
      });
    });

    describe('from()', () => {
      it('should handle numbers', () => {
        expect(ErpHours.from(5.5).toNumber()).toBe(5.5);
        expect(ErpHours.from(0).toNumber()).toBe(0);
        expect(ErpHours.from(-2.5).toNumber()).toBe(-2.5);
      });

      it('should handle numeric strings', () => {
        expect(ErpHours.from('5.5').toNumber()).toBe(5.5);
        expect(ErpHours.from('0').toNumber()).toBe(0);
      });

      it('should handle null/undefined', () => {
        expect(ErpHours.from(null).toNumber()).toBe(0);
        expect(ErpHours.from(undefined).toNumber()).toBe(0);
      });

      it('should handle NaN', () => {
        expect(ErpHours.from(NaN).toNumber()).toBe(0);
      });

      it('should handle ErpHours instance', () => {
        const hours = ErpHours.from(5);
        expect(ErpHours.from(hours).toNumber()).toBe(5);
        expect(ErpHours.from(hours)).toBe(hours); // Same instance
      });
    });

    describe('parse()', () => {
      it('should parse HH:MM format', () => {
        expect(ErpHours.parse('2:30').toNumber()).toBe(2.5);
        expect(ErpHours.parse('8:00').toNumber()).toBe(8);
        expect(ErpHours.parse('0:45').toNumber()).toBe(0.75);
      });

      it('should parse H:MM format', () => {
        expect(ErpHours.parse('1:30').toNumber()).toBe(1.5);
      });

      it('should handle malformed HH:MM gracefully', () => {
        expect(ErpHours.parse('5:').toNumber()).toBe(5);
        expect(ErpHours.parse(':30').toNumber()).toBe(0.5);
        expect(ErpHours.parse(':').toNumber()).toBe(0);
        expect(ErpHours.parse('::').toNumber()).toBe(0);
      });

      it('should parse decimal format', () => {
        expect(ErpHours.parse('5.5').toNumber()).toBe(5.5);
        expect(ErpHours.parse('8').toNumber()).toBe(8);
      });

      it('should handle empty string', () => {
        expect(ErpHours.parse('').toNumber()).toBe(0);
        expect(ErpHours.parse('   ').toNumber()).toBe(0);
      });

      it('should handle 0:00', () => {
        expect(ErpHours.parse('0:00').toNumber()).toBe(0);
      });

      it('should handle invalid strings', () => {
        expect(ErpHours.parse('abc').toNumber()).toBe(0);
      });
    });
  });

  describe('Getters', () => {
    it('should return hours and minutes components', () => {
      const h = ErpHours.from(2.5);
      expect(h.hours).toBe(2);
      expect(h.minutes).toBe(30);
    });

    it('should handle negative values', () => {
      const h = ErpHours.from(-2.5);
      expect(h.hours).toBe(2);
      expect(h.minutes).toBe(30);
    });
  });

  describe('Operations', () => {
    describe('add()', () => {
      it('should add two durations', () => {
        const a = ErpHours.from(5);
        const b = ErpHours.from(3.5);
        expect(a.add(b).toNumber()).toBe(8.5);
      });

      it('should handle adding zero', () => {
        const a = ErpHours.from(5);
        expect(a.add(ErpHours.zero()).toNumber()).toBe(5);
      });
    });

    describe('subtract()', () => {
      it('should subtract two durations', () => {
        const a = ErpHours.from(8);
        const b = ErpHours.from(3);
        expect(a.subtract(b).toNumber()).toBe(5);
      });

      it('should allow negative results', () => {
        const a = ErpHours.from(3);
        const b = ErpHours.from(8);
        expect(a.subtract(b).toNumber()).toBe(-5);
      });
    });

    describe('multiply()', () => {
      it('should multiply by a factor', () => {
        const h = ErpHours.from(4);
        expect(h.multiply(2).toNumber()).toBe(8);
        expect(h.multiply(0.5).toNumber()).toBe(2);
      });
    });
  });

  describe('Predicates', () => {
    it('should correctly identify zero', () => {
      expect(ErpHours.zero().isZero()).toBe(true);
      expect(ErpHours.from(0).isZero()).toBe(true);
      expect(ErpHours.from(1).isZero()).toBe(false);
    });

    it('should correctly identify positive', () => {
      expect(ErpHours.from(5).isPositive()).toBe(true);
      expect(ErpHours.from(0).isPositive()).toBe(false);
      expect(ErpHours.from(-1).isPositive()).toBe(false);
    });

    it('should correctly identify negative', () => {
      expect(ErpHours.from(-5).isNegative()).toBe(true);
      expect(ErpHours.from(0).isNegative()).toBe(false);
      expect(ErpHours.from(1).isNegative()).toBe(false);
    });
  });

  describe('Formatting', () => {
    describe('format()', () => {
      it('should format to H:MM', () => {
        expect(ErpHours.from(2.5).format()).toBe('2:30');
        expect(ErpHours.from(8).format()).toBe('8:00');
        expect(ErpHours.from(0).format()).toBe('0:00');
      });

      it('should handle negative values', () => {
        expect(ErpHours.from(-2.5).format()).toBe('-2:30');
      });

      it('should handle large values', () => {
        expect(ErpHours.from(100).format()).toBe('100:00');
      });
    });

    describe('formatDecimal()', () => {
      it('should format as decimal', () => {
        expect(ErpHours.from(2.5).formatDecimal()).toBe('2.50');
        expect(ErpHours.from(2.5).formatDecimal(1)).toBe('2.5');
      });
    });
  });

  describe('Comparison', () => {
    it('should compare equality', () => {
      expect(ErpHours.from(5).equals(ErpHours.from(5))).toBe(true);
      expect(ErpHours.from(5).equals(ErpHours.from(3))).toBe(false);
    });

    it('should compare less than', () => {
      expect(ErpHours.from(3).lessThan(ErpHours.from(5))).toBe(true);
      expect(ErpHours.from(5).lessThan(ErpHours.from(3))).toBe(false);
    });

    it('should compare greater than', () => {
      expect(ErpHours.from(5).greaterThan(ErpHours.from(3))).toBe(true);
      expect(ErpHours.from(3).greaterThan(ErpHours.from(5))).toBe(false);
    });
  });

  describe('Static helpers', () => {
    describe('sum()', () => {
      it('should sum an array of ErpHours', () => {
        const items = [
          ErpHours.from(2),
          ErpHours.from(3.5),
          ErpHours.from(4.5),
        ];
        expect(ErpHours.sum(items).toNumber()).toBe(10);
      });

      it('should return zero for empty array', () => {
        expect(ErpHours.sum([]).toNumber()).toBe(0);
      });
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle timesheet accumulation', () => {
      // Simulating the timesheet grid accumulation pattern
      const timesheets = [
        { unit_amount: '2.5' },  // String from API
        { unit_amount: 3 },      // Number
        { unit_amount: '4:30' }, // HH:MM format
      ];

      let total = ErpHours.zero();
      for (const ts of timesheets) {
        total = total.add(ErpHours.from(ts.unit_amount));
      }

      expect(total.toNumber()).toBe(10); // 2.5 + 3 + 4.5 = 10
      expect(total.format()).toBe('10:00');
    });

    it('should never produce NaN', () => {
      // All these edge cases should return valid numbers, not NaN
      const edgeCases = [
        ErpHours.from(NaN),
        ErpHours.from(null),
        ErpHours.from(undefined),
        ErpHours.parse(''),
        ErpHours.parse('invalid'),
        ErpHours.parse(':'),
        ErpHours.from({} as unknown),
      ];

      for (const h of edgeCases) {
        expect(Number.isNaN(h.toNumber())).toBe(false);
      }
    });
  });
});
