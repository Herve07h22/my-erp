import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ErpDate } from '../ErpDate.js';

describe('ErpDate', () => {
  describe('Factory Methods', () => {
    describe('today()', () => {
      it('returns current local date', () => {
        const today = ErpDate.today();
        const now = new Date();
        expect(today.year).toBe(now.getFullYear());
        expect(today.month).toBe(now.getMonth() + 1);
        expect(today.day).toBe(now.getDate());
      });
    });

    describe('fromISOString()', () => {
      it('parses YYYY-MM-DD format', () => {
        const date = ErpDate.fromISOString('2026-01-15');
        expect(date.year).toBe(2026);
        expect(date.month).toBe(1);
        expect(date.day).toBe(15);
      });

      it('throws on invalid format', () => {
        expect(() => ErpDate.fromISOString('2026/01/15')).toThrow();
        expect(() => ErpDate.fromISOString('15-01-2026')).toThrow();
        expect(() => ErpDate.fromISOString('invalid')).toThrow();
      });
    });

    describe('fromDate()', () => {
      it('extracts local date from JS Date', () => {
        const jsDate = new Date(2026, 5, 20); // June 20, 2026
        const date = ErpDate.fromDate(jsDate);
        expect(date.year).toBe(2026);
        expect(date.month).toBe(6);
        expect(date.day).toBe(20);
      });
    });

    describe('from()', () => {
      it('creates date from components', () => {
        const date = ErpDate.from(2026, 12, 25);
        expect(date.year).toBe(2026);
        expect(date.month).toBe(12);
        expect(date.day).toBe(25);
      });

      it('handles overflow (normalizes invalid dates)', () => {
        const date = ErpDate.from(2026, 1, 32); // Jan 32 -> Feb 1
        expect(date.month).toBe(2);
        expect(date.day).toBe(1);
      });
    });

    describe('parse()', () => {
      it('handles string input', () => {
        const date = ErpDate.parse('2026-03-10');
        expect(date).not.toBeNull();
        expect(date!.toISOString()).toBe('2026-03-10');
      });

      it('handles Date input', () => {
        const jsDate = new Date(2026, 2, 10); // March 10
        const date = ErpDate.parse(jsDate);
        expect(date).not.toBeNull();
        expect(date!.month).toBe(3);
      });

      it('handles ErpDate input (returns same instance)', () => {
        const original = ErpDate.from(2026, 5, 5);
        const parsed = ErpDate.parse(original);
        expect(parsed).toBe(original);
      });

      it('handles ISO datetime string (extracts date part)', () => {
        const date = ErpDate.parse('2026-07-14T10:30:00.000Z');
        expect(date).not.toBeNull();
        expect(date!.toISOString()).toBe('2026-07-14');
      });

      it('returns null for null/undefined', () => {
        expect(ErpDate.parse(null)).toBeNull();
        expect(ErpDate.parse(undefined)).toBeNull();
      });

      it('returns null for empty string', () => {
        expect(ErpDate.parse('')).toBeNull();
        expect(ErpDate.parse('   ')).toBeNull();
      });

      it('returns null for invalid Date', () => {
        expect(ErpDate.parse(new Date('invalid'))).toBeNull();
      });
    });
  });

  describe('Immutability', () => {
    it('instance is frozen', () => {
      const date = ErpDate.from(2026, 1, 1);
      expect(Object.isFrozen(date)).toBe(true);
    });

    it('arithmetic methods return new instances', () => {
      const date = ErpDate.from(2026, 1, 15);
      const added = date.addDays(5);
      expect(added).not.toBe(date);
    });

    it('original instance unchanged after arithmetic', () => {
      const date = ErpDate.from(2026, 1, 15);
      date.addDays(5);
      expect(date.day).toBe(15);
    });
  });

  describe('Getters', () => {
    const date = ErpDate.from(2026, 7, 14); // Tuesday, July 14, 2026

    it('year returns correct year', () => {
      expect(date.year).toBe(2026);
    });

    it('month returns 1-12 (not 0-indexed)', () => {
      expect(date.month).toBe(7);
    });

    it('day returns day of month', () => {
      expect(date.day).toBe(14);
    });

    it('dayOfWeek returns 0-6 (0=Sunday)', () => {
      // July 14, 2026 is a Tuesday
      expect(date.dayOfWeek).toBe(2);
    });

    it('quarter returns 1-4', () => {
      expect(ErpDate.from(2026, 1, 15).quarter).toBe(1);
      expect(ErpDate.from(2026, 4, 15).quarter).toBe(2);
      expect(ErpDate.from(2026, 7, 15).quarter).toBe(3);
      expect(ErpDate.from(2026, 10, 15).quarter).toBe(4);
    });

    it('weekOfYear returns correct ISO week', () => {
      // January 1, 2026 is Thursday, week 1
      expect(ErpDate.from(2026, 1, 1).weekOfYear).toBe(1);
    });
  });

  describe('Arithmetic', () => {
    describe('addDays()', () => {
      it('adds positive days', () => {
        const date = ErpDate.from(2026, 1, 15);
        const result = date.addDays(5);
        expect(result.day).toBe(20);
      });

      it('subtracts with negative', () => {
        const date = ErpDate.from(2026, 1, 15);
        const result = date.addDays(-5);
        expect(result.day).toBe(10);
      });

      it('handles month boundary', () => {
        const date = ErpDate.from(2026, 1, 30);
        const result = date.addDays(5);
        expect(result.month).toBe(2);
        expect(result.day).toBe(4);
      });

      it('handles year boundary', () => {
        const date = ErpDate.from(2025, 12, 30);
        const result = date.addDays(5);
        expect(result.year).toBe(2026);
        expect(result.month).toBe(1);
        expect(result.day).toBe(4);
      });
    });

    describe('addWeeks()', () => {
      it('adds weeks', () => {
        const date = ErpDate.from(2026, 1, 1);
        const result = date.addWeeks(2);
        expect(result.day).toBe(15);
      });
    });

    describe('addMonths()', () => {
      it('adds months', () => {
        const date = ErpDate.from(2026, 1, 15);
        const result = date.addMonths(3);
        expect(result.month).toBe(4);
      });

      it('handles day overflow (Jan 31 + 1 month)', () => {
        const date = ErpDate.from(2026, 1, 31);
        const result = date.addMonths(1);
        // Feb 2026 has 28 days, JS Date rolls over to March
        expect(result.month).toBe(3);
        expect(result.day).toBe(3);
      });
    });

    describe('addYears()', () => {
      it('adds years', () => {
        const date = ErpDate.from(2026, 6, 15);
        const result = date.addYears(2);
        expect(result.year).toBe(2028);
      });

      it('handles leap year (Feb 29 + 1 year)', () => {
        const date = ErpDate.from(2024, 2, 29); // Leap year
        const result = date.addYears(1);
        // 2025 is not a leap year
        expect(result.month).toBe(3);
        expect(result.day).toBe(1);
      });
    });
  });

  describe('Week Operations', () => {
    it('getWeekStart() returns Monday', () => {
      // July 14, 2026 is Tuesday
      const date = ErpDate.from(2026, 7, 14);
      const weekStart = date.getWeekStart();
      expect(weekStart.toISOString()).toBe('2026-07-13'); // Monday
      expect(weekStart.dayOfWeek).toBe(1); // Monday = 1
    });

    it('getWeekStart() handles Sunday correctly', () => {
      // July 19, 2026 is Sunday
      const date = ErpDate.from(2026, 7, 19);
      const weekStart = date.getWeekStart();
      expect(weekStart.toISOString()).toBe('2026-07-13'); // Previous Monday
    });

    it('getWeekEnd() returns Sunday', () => {
      const date = ErpDate.from(2026, 7, 14);
      const weekEnd = date.getWeekEnd();
      expect(weekEnd.dayOfWeek).toBe(0); // Sunday = 0
      expect(weekEnd.toISOString()).toBe('2026-07-19');
    });

    it('getWeekDays() returns 7 consecutive days', () => {
      const date = ErpDate.from(2026, 7, 14);
      const days = date.getWeekDays();
      expect(days).toHaveLength(7);
    });

    it('getWeekDays() starts from Monday', () => {
      const date = ErpDate.from(2026, 7, 14);
      const days = date.getWeekDays();
      expect(days[0].dayOfWeek).toBe(1); // Monday
      expect(days[6].dayOfWeek).toBe(0); // Sunday
    });
  });

  describe('Month Operations', () => {
    it('getMonthStart() returns first day', () => {
      const date = ErpDate.from(2026, 7, 14);
      const start = date.getMonthStart();
      expect(start.toISOString()).toBe('2026-07-01');
    });

    it('getMonthEnd() returns last day', () => {
      const date = ErpDate.from(2026, 7, 14);
      const end = date.getMonthEnd();
      expect(end.toISOString()).toBe('2026-07-31');
    });

    it('getMonthEnd() handles February correctly', () => {
      const date = ErpDate.from(2026, 2, 10);
      const end = date.getMonthEnd();
      expect(end.day).toBe(28);
    });

    it('getMonthEnd() handles February leap year', () => {
      const date = ErpDate.from(2024, 2, 10);
      const end = date.getMonthEnd();
      expect(end.day).toBe(29);
    });

    it('getMonthDays() returns all days in month', () => {
      const date = ErpDate.from(2026, 2, 15);
      const days = date.getMonthDays();
      expect(days).toHaveLength(28);
      expect(days[0].day).toBe(1);
      expect(days[27].day).toBe(28);
    });
  });

  describe('Comparison', () => {
    const date1 = ErpDate.from(2026, 5, 15);
    const date2 = ErpDate.from(2026, 5, 15);
    const date3 = ErpDate.from(2026, 5, 20);

    it('equals() returns true for same date', () => {
      expect(date1.equals(date2)).toBe(true);
    });

    it('equals() returns false for different dates', () => {
      expect(date1.equals(date3)).toBe(false);
    });

    it('isBefore() compares correctly', () => {
      expect(date1.isBefore(date3)).toBe(true);
      expect(date3.isBefore(date1)).toBe(false);
      expect(date1.isBefore(date2)).toBe(false);
    });

    it('isAfter() compares correctly', () => {
      expect(date3.isAfter(date1)).toBe(true);
      expect(date1.isAfter(date3)).toBe(false);
    });

    it('isSameDay() is alias for equals', () => {
      expect(date1.isSameDay(date2)).toBe(true);
      expect(date1.isSameDay(date3)).toBe(false);
    });

    it('isSameMonth() ignores day', () => {
      expect(date1.isSameMonth(date3)).toBe(true);
      expect(date1.isSameMonth(ErpDate.from(2026, 6, 15))).toBe(false);
    });

    it('isSameYear() ignores month and day', () => {
      expect(date1.isSameYear(ErpDate.from(2026, 12, 31))).toBe(true);
      expect(date1.isSameYear(ErpDate.from(2025, 5, 15))).toBe(false);
    });

    it('isBetween() includes boundaries', () => {
      const start = ErpDate.from(2026, 5, 10);
      const end = ErpDate.from(2026, 5, 20);
      const middle = ErpDate.from(2026, 5, 15);

      expect(middle.isBetween(start, end)).toBe(true);
      expect(start.isBetween(start, end)).toBe(true);
      expect(end.isBetween(start, end)).toBe(true);
      expect(ErpDate.from(2026, 5, 5).isBetween(start, end)).toBe(false);
    });

    it('compareTo() returns -1, 0, or 1', () => {
      expect(date1.compareTo(date2)).toBe(0);
      expect(date1.compareTo(date3)).toBe(-1);
      expect(date3.compareTo(date1)).toBe(1);
    });
  });

  describe('Serialization', () => {
    const date = ErpDate.from(2026, 1, 5);

    it('toISOString() returns YYYY-MM-DD', () => {
      expect(date.toISOString()).toBe('2026-01-05');
    });

    it('toJSON() returns same as toISOString()', () => {
      expect(date.toJSON()).toBe('2026-01-05');
    });

    it('JSON.stringify() uses toJSON()', () => {
      expect(JSON.stringify({ date })).toBe('{"date":"2026-01-05"}');
    });

    it('toDate() returns JS Date at midnight local', () => {
      const jsDate = date.toDate();
      expect(jsDate.getFullYear()).toBe(2026);
      expect(jsDate.getMonth()).toBe(0);
      expect(jsDate.getDate()).toBe(5);
      expect(jsDate.getHours()).toBe(0);
    });

    it('toErpDateTime() returns ErpDateTime at midnight', () => {
      const dateTime = date.toErpDateTime();
      expect(dateTime.year).toBe(2026);
      expect(dateTime.month).toBe(1);
      expect(dateTime.day).toBe(5);
      expect(dateTime.hours).toBe(0);
      expect(dateTime.minutes).toBe(0);
    });

    it('toString() returns ISO string', () => {
      expect(date.toString()).toBe('2026-01-05');
    });
  });

  describe('Formatting', () => {
    const date = ErpDate.from(2026, 1, 5); // Monday, January 5

    it('formatShort() returns "5 janv." format (fr-FR)', () => {
      const formatted = date.formatShort();
      expect(formatted).toMatch(/5/);
      expect(formatted.toLowerCase()).toMatch(/janv/);
    });

    it('formatDayName() returns "lun." format (fr-FR)', () => {
      const formatted = date.formatDayName();
      expect(formatted.toLowerCase()).toMatch(/lun/);
    });

    it('formatLong() returns full date', () => {
      const formatted = date.formatLong();
      expect(formatted).toMatch(/2026/);
      expect(formatted.toLowerCase()).toMatch(/janvier/);
    });

    it('format() uses custom options', () => {
      const formatted = date.format({ year: 'numeric' });
      expect(formatted).toBe('2026');
    });

    it('format() respects locale parameter', () => {
      const formatted = date.format({ month: 'long' }, 'en-US');
      expect(formatted).toBe('January');
    });
  });

  describe('Edge Cases', () => {
    it('handles leap year correctly', () => {
      const date = ErpDate.from(2024, 2, 29);
      expect(date.toISOString()).toBe('2024-02-29');
    });

    it('handles year transitions', () => {
      const dec31 = ErpDate.from(2025, 12, 31);
      const jan1 = dec31.addDays(1);
      expect(jan1.year).toBe(2026);
      expect(jan1.month).toBe(1);
      expect(jan1.day).toBe(1);
    });
  });
});
