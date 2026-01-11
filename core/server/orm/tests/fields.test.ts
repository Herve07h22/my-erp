import { describe, it, expect } from 'vitest';
import { fieldTypes } from '../fields.js';
import { ErpDate, ErpDateTime } from '@core/shared/erp-date/index.js';

describe('fieldTypes', () => {
  describe('float.fromSQL', () => {
    it('should return number as-is', () => {
      expect(fieldTypes.float.fromSQL?.(5.5)).toBe(5.5);
      expect(fieldTypes.float.fromSQL?.(0)).toBe(0);
      expect(fieldTypes.float.fromSQL?.(-3.14)).toBe(-3.14);
    });

    it('should convert string to number', () => {
      expect(fieldTypes.float.fromSQL?.('5.5')).toBe(5.5);
      expect(fieldTypes.float.fromSQL?.('0')).toBe(0);
      expect(fieldTypes.float.fromSQL?.('-3.14')).toBe(-3.14);
    });

    it('should return 0 for null/undefined', () => {
      expect(fieldTypes.float.fromSQL?.(null)).toBe(0);
      expect(fieldTypes.float.fromSQL?.(undefined)).toBe(0);
    });

    it('should return 0 for non-numeric strings', () => {
      expect(fieldTypes.float.fromSQL?.('abc')).toBeNaN();
    });
  });

  describe('monetary.fromSQL', () => {
    it('should return number as-is', () => {
      expect(fieldTypes.monetary.fromSQL?.(100.50)).toBe(100.50);
    });

    it('should convert string to number', () => {
      expect(fieldTypes.monetary.fromSQL?.('100.50')).toBe(100.50);
    });

    it('should return 0 for null/undefined', () => {
      expect(fieldTypes.monetary.fromSQL?.(null)).toBe(0);
      expect(fieldTypes.monetary.fromSQL?.(undefined)).toBe(0);
    });
  });

  describe('integer.fromSQL', () => {
    it('should return value as-is', () => {
      expect(fieldTypes.integer.fromSQL?.(42)).toBe(42);
    });
  });

  describe('date.fromSQL', () => {
    it('should parse valid date string', () => {
      const result = fieldTypes.date.fromSQL?.('2024-01-15');
      expect(result).toBeInstanceOf(ErpDate);
      expect((result as ErpDate).toISOString()).toBe('2024-01-15');
    });

    it('should return null for null/undefined', () => {
      expect(fieldTypes.date.fromSQL?.(null)).toBeNull();
      expect(fieldTypes.date.fromSQL?.(undefined)).toBeNull();
    });
  });

  describe('datetime.fromSQL', () => {
    it('should parse valid datetime string', () => {
      const result = fieldTypes.datetime.fromSQL?.('2024-01-15T10:30:00Z');
      expect(result).toBeInstanceOf(ErpDateTime);
    });

    it('should return null for null/undefined', () => {
      expect(fieldTypes.datetime.fromSQL?.(null)).toBeNull();
      expect(fieldTypes.datetime.fromSQL?.(undefined)).toBeNull();
    });
  });

  describe('boolean.fromSQL', () => {
    it('should return value as-is', () => {
      expect(fieldTypes.boolean.fromSQL?.(true)).toBe(true);
      expect(fieldTypes.boolean.fromSQL?.(false)).toBe(false);
    });
  });

  describe('string.fromSQL', () => {
    it('should return value as-is', () => {
      expect(fieldTypes.string.fromSQL?.('hello')).toBe('hello');
    });
  });

  describe('selection.fromSQL', () => {
    it('should return value as-is', () => {
      expect(fieldTypes.selection.fromSQL?.('draft')).toBe('draft');
    });
  });
});
