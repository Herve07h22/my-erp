import { describe, it, expect } from 'vitest';
import { ErpDateTime } from '../ErpDateTime.js';
import { ErpDate } from '../ErpDate.js';

describe('ErpDateTime', () => {
  describe('Factory Methods', () => {
    describe('now()', () => {
      it('returns current timestamp', () => {
        const before = Date.now();
        const now = ErpDateTime.now();
        const after = Date.now();
        expect(now.timestamp).toBeGreaterThanOrEqual(before);
        expect(now.timestamp).toBeLessThanOrEqual(after);
      });
    });

    describe('fromISOString()', () => {
      it('parses full ISO string', () => {
        const dt = ErpDateTime.fromISOString('2026-07-14T10:30:45.123Z');
        expect(dt.toISOString()).toBe('2026-07-14T10:30:45.123Z');
      });

      it('handles timezone offset', () => {
        const dt = ErpDateTime.fromISOString('2026-07-14T10:30:00+02:00');
        // Should convert to UTC
        expect(dt.toISOString()).toBe('2026-07-14T08:30:00.000Z');
      });

      it('throws on invalid format', () => {
        expect(() => ErpDateTime.fromISOString('invalid')).toThrow();
      });
    });

    describe('fromDate()', () => {
      it('creates from JS Date', () => {
        const jsDate = new Date(2026, 6, 14, 10, 30, 45);
        const dt = ErpDateTime.fromDate(jsDate);
        expect(dt.year).toBe(2026);
        expect(dt.month).toBe(7);
        expect(dt.day).toBe(14);
        expect(dt.hours).toBe(10);
        expect(dt.minutes).toBe(30);
      });
    });

    describe('from()', () => {
      it('creates from components', () => {
        const dt = ErpDateTime.from(2026, 7, 14, 10, 30, 45);
        expect(dt.year).toBe(2026);
        expect(dt.month).toBe(7);
        expect(dt.day).toBe(14);
        expect(dt.hours).toBe(10);
        expect(dt.minutes).toBe(30);
        expect(dt.seconds).toBe(45);
      });

      it('defaults time components to 0', () => {
        const dt = ErpDateTime.from(2026, 7, 14);
        expect(dt.hours).toBe(0);
        expect(dt.minutes).toBe(0);
        expect(dt.seconds).toBe(0);
      });
    });

    describe('fromErpDate()', () => {
      it('creates at specified time', () => {
        const date = ErpDate.from(2026, 7, 14);
        const dt = ErpDateTime.fromErpDate(date, 10, 30, 45);
        expect(dt.year).toBe(2026);
        expect(dt.month).toBe(7);
        expect(dt.day).toBe(14);
        expect(dt.hours).toBe(10);
        expect(dt.minutes).toBe(30);
        expect(dt.seconds).toBe(45);
      });

      it('defaults to midnight', () => {
        const date = ErpDate.from(2026, 7, 14);
        const dt = ErpDateTime.fromErpDate(date);
        expect(dt.hours).toBe(0);
        expect(dt.minutes).toBe(0);
        expect(dt.seconds).toBe(0);
      });
    });

    describe('parse()', () => {
      it('handles various inputs', () => {
        expect(ErpDateTime.parse('2026-07-14T10:30:00Z')).not.toBeNull();
        expect(ErpDateTime.parse(new Date())).not.toBeNull();
        expect(ErpDateTime.parse(ErpDateTime.now())).not.toBeNull();
      });

      it('returns null for invalid input', () => {
        expect(ErpDateTime.parse(null)).toBeNull();
        expect(ErpDateTime.parse(undefined)).toBeNull();
        expect(ErpDateTime.parse('')).toBeNull();
        expect(ErpDateTime.parse('invalid')).toBeNull();
      });

      it('returns same instance for ErpDateTime input', () => {
        const original = ErpDateTime.now();
        const parsed = ErpDateTime.parse(original);
        expect(parsed).toBe(original);
      });
    });
  });

  describe('Immutability', () => {
    it('instance is frozen', () => {
      const dt = ErpDateTime.now();
      expect(Object.isFrozen(dt)).toBe(true);
    });

    it('arithmetic methods return new instances', () => {
      const dt = ErpDateTime.from(2026, 1, 1, 12, 0, 0);
      const added = dt.addHours(1);
      expect(added).not.toBe(dt);
      expect(added.hours).toBe(13);
      expect(dt.hours).toBe(12);
    });
  });

  describe('Getters', () => {
    const dt = ErpDateTime.from(2026, 7, 14, 10, 30, 45, 123);

    it('returns correct local time components', () => {
      expect(dt.year).toBe(2026);
      expect(dt.month).toBe(7);
      expect(dt.day).toBe(14);
      expect(dt.hours).toBe(10);
      expect(dt.minutes).toBe(30);
      expect(dt.seconds).toBe(45);
      expect(dt.milliseconds).toBe(123);
    });

    it('dayOfWeek returns 0-6', () => {
      // July 14, 2026 is Tuesday
      expect(dt.dayOfWeek).toBe(2);
    });

    it('timestamp returns UTC milliseconds', () => {
      expect(typeof dt.timestamp).toBe('number');
      expect(dt.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Arithmetic', () => {
    const dt = ErpDateTime.from(2026, 7, 14, 10, 30, 0);

    it('addHours() adds hours', () => {
      const result = dt.addHours(2);
      expect(result.hours).toBe(12);
    });

    it('addMinutes() adds minutes', () => {
      const result = dt.addMinutes(45);
      expect(result.hours).toBe(11);
      expect(result.minutes).toBe(15);
    });

    it('addSeconds() adds seconds', () => {
      const result = dt.addSeconds(90);
      expect(result.minutes).toBe(31);
      expect(result.seconds).toBe(30);
    });

    it('addDays() preserves time', () => {
      const result = dt.addDays(5);
      expect(result.day).toBe(19);
      expect(result.hours).toBe(10);
      expect(result.minutes).toBe(30);
    });

    it('addMonths() preserves time', () => {
      const result = dt.addMonths(2);
      expect(result.month).toBe(9);
      expect(result.hours).toBe(10);
    });

    it('addWeeks() adds weeks', () => {
      const result = dt.addWeeks(2);
      expect(result.day).toBe(28);
    });

    it('addYears() adds years', () => {
      const result = dt.addYears(1);
      expect(result.year).toBe(2027);
    });
  });

  describe('Day Boundaries', () => {
    const dt = ErpDateTime.from(2026, 7, 14, 10, 30, 45, 123);

    it('startOfDay() returns midnight', () => {
      const start = dt.startOfDay();
      expect(start.year).toBe(2026);
      expect(start.month).toBe(7);
      expect(start.day).toBe(14);
      expect(start.hours).toBe(0);
      expect(start.minutes).toBe(0);
      expect(start.seconds).toBe(0);
      expect(start.milliseconds).toBe(0);
    });

    it('endOfDay() returns 23:59:59.999', () => {
      const end = dt.endOfDay();
      expect(end.year).toBe(2026);
      expect(end.month).toBe(7);
      expect(end.day).toBe(14);
      expect(end.hours).toBe(23);
      expect(end.minutes).toBe(59);
      expect(end.seconds).toBe(59);
      expect(end.milliseconds).toBe(999);
    });
  });

  describe('Comparison', () => {
    const dt1 = ErpDateTime.from(2026, 7, 14, 10, 30, 0);
    const dt2 = ErpDateTime.from(2026, 7, 14, 10, 30, 0);
    const dt3 = ErpDateTime.from(2026, 7, 14, 12, 0, 0);

    it('equals() compares timestamps', () => {
      expect(dt1.equals(dt2)).toBe(true);
      expect(dt1.equals(dt3)).toBe(false);
    });

    it('isBefore() compares correctly', () => {
      expect(dt1.isBefore(dt3)).toBe(true);
      expect(dt3.isBefore(dt1)).toBe(false);
    });

    it('isAfter() compares correctly', () => {
      expect(dt3.isAfter(dt1)).toBe(true);
      expect(dt1.isAfter(dt3)).toBe(false);
    });

    it('isSameDay() ignores time', () => {
      expect(dt1.isSameDay(dt3)).toBe(true);
      expect(dt1.isSameDay(ErpDateTime.from(2026, 7, 15, 10, 30, 0))).toBe(false);
    });

    it('isBetween() checks range', () => {
      const middle = ErpDateTime.from(2026, 7, 14, 11, 0, 0);
      expect(middle.isBetween(dt1, dt3)).toBe(true);
      expect(dt1.isBetween(dt1, dt3)).toBe(true);
    });

    it('compareTo() returns -1, 0, or 1', () => {
      expect(dt1.compareTo(dt2)).toBe(0);
      expect(dt1.compareTo(dt3)).toBe(-1);
      expect(dt3.compareTo(dt1)).toBe(1);
    });
  });

  describe('Difference', () => {
    const dt1 = ErpDateTime.from(2026, 7, 14, 10, 0, 0);
    const dt2 = ErpDateTime.from(2026, 7, 14, 12, 30, 0);

    it('diff() returns milliseconds', () => {
      const diffMs = dt2.diff(dt1);
      expect(diffMs).toBe(2.5 * 60 * 60 * 1000); // 2h30m in ms
    });

    it('diffIn() converts to specified unit', () => {
      expect(dt2.diffIn(dt1, 'hours')).toBe(2);
      expect(dt2.diffIn(dt1, 'minutes')).toBe(150);
      expect(dt2.diffIn(dt1, 'seconds')).toBe(9000);
    });
  });

  describe('Conversion', () => {
    const dt = ErpDateTime.from(2026, 7, 14, 10, 30, 45);

    it('toErpDate() extracts date component', () => {
      const date = dt.toErpDate();
      expect(date.year).toBe(2026);
      expect(date.month).toBe(7);
      expect(date.day).toBe(14);
    });

    it('toDate() returns JS Date', () => {
      const jsDate = dt.toDate();
      expect(jsDate instanceof Date).toBe(true);
      expect(jsDate.getFullYear()).toBe(2026);
    });

    it('toISOString() returns full ISO string', () => {
      const iso = dt.toISOString();
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('toJSON() returns same as toISOString()', () => {
      expect(dt.toJSON()).toBe(dt.toISOString());
    });

    it('JSON.stringify() uses toJSON()', () => {
      const json = JSON.stringify({ dt });
      expect(json).toContain(dt.toISOString());
    });
  });

  describe('Formatting', () => {
    const dt = ErpDateTime.from(2026, 1, 5, 14, 30, 0);

    it('formatTime() returns HH:MM', () => {
      const formatted = dt.formatTime();
      expect(formatted).toMatch(/14/);
      expect(formatted).toMatch(/30/);
    });

    it('formatDateTime() returns date and time', () => {
      const formatted = dt.formatDateTime();
      expect(formatted).toMatch(/2026/);
      expect(formatted).toMatch(/14/);
    });

    it('formatShort() includes date and time', () => {
      const formatted = dt.formatShort();
      expect(formatted.toLowerCase()).toMatch(/janv/);
      expect(formatted).toMatch(/14/);
    });

    it('format() respects locale parameter', () => {
      const formatted = dt.format({ month: 'long' }, 'en-US');
      expect(formatted).toBe('January');
    });
  });
});
