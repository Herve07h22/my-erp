import { describe, it, expect, afterEach } from 'vitest';
import { ErpDate, ErpDateTime, setClock, resetClock, setFixedDate } from '../index.js';

describe('Clock injection', () => {
  afterEach(() => {
    resetClock();
  });

  describe('setClock', () => {
    it('allows setting a custom clock function', () => {
      // Fixer au 15 janvier 2026 à 10:30:00
      const fixedTime = new Date(2026, 0, 15, 10, 30, 0).getTime();
      setClock(() => fixedTime);

      const today = ErpDate.today();
      expect(today.year).toBe(2026);
      expect(today.month).toBe(1);
      expect(today.day).toBe(15);

      const now = ErpDateTime.now();
      expect(now.year).toBe(2026);
      expect(now.month).toBe(1);
      expect(now.day).toBe(15);
      expect(now.hours).toBe(10);
      expect(now.minutes).toBe(30);
    });

    it('affects ErpDate.today()', () => {
      setClock(() => new Date(2030, 5, 20).getTime()); // 20 juin 2030

      const today = ErpDate.today();
      expect(today.toISOString()).toBe('2030-06-20');
    });

    it('affects ErpDateTime.now()', () => {
      setClock(() => new Date(2030, 5, 20, 14, 45, 30).getTime());

      const now = ErpDateTime.now();
      expect(now.year).toBe(2030);
      expect(now.month).toBe(6);
      expect(now.day).toBe(20);
      expect(now.hours).toBe(14);
      expect(now.minutes).toBe(45);
    });
  });

  describe('resetClock', () => {
    it('resets to real time', () => {
      const fixedTime = new Date(2000, 0, 1).getTime();
      setClock(() => fixedTime);

      expect(ErpDate.today().year).toBe(2000);

      resetClock();

      const realYear = new Date().getFullYear();
      expect(ErpDate.today().year).toBe(realYear);
    });
  });

  describe('setFixedDate', () => {
    it('accepts Date object', () => {
      setFixedDate(new Date(2025, 11, 25)); // 25 décembre 2025

      expect(ErpDate.today().toISOString()).toBe('2025-12-25');
    });

    it('accepts ISO string', () => {
      setFixedDate('2024-07-04T12:00:00');

      const today = ErpDate.today();
      expect(today.year).toBe(2024);
      expect(today.month).toBe(7);
      expect(today.day).toBe(4);
    });
  });

  describe('Test scenarios', () => {
    it('can test week start calculation for a specific date', () => {
      // Mercredi 15 janvier 2026
      setFixedDate('2026-01-15T10:00:00');

      const today = ErpDate.today();
      const weekStart = today.getWeekStart();

      // Le lundi devrait être le 12 janvier
      expect(weekStart.toISOString()).toBe('2026-01-12');
    });

    it('can test month boundaries', () => {
      // Dernier jour de février 2024 (année bissextile)
      setFixedDate('2024-02-29T00:00:00');

      const today = ErpDate.today();
      expect(today.day).toBe(29);

      const tomorrow = today.addDays(1);
      expect(tomorrow.month).toBe(3);
      expect(tomorrow.day).toBe(1);
    });

    it('can test year boundaries', () => {
      // Réveillon
      setFixedDate('2025-12-31T23:59:00');

      const today = ErpDate.today();
      const tomorrow = today.addDays(1);

      expect(today.year).toBe(2025);
      expect(tomorrow.year).toBe(2026);
      expect(tomorrow.month).toBe(1);
      expect(tomorrow.day).toBe(1);
    });

    it('supports multiple consecutive time advances', () => {
      let currentTime = new Date(2026, 0, 1).getTime();
      setClock(() => currentTime);

      expect(ErpDate.today().toISOString()).toBe('2026-01-01');

      // Avancer de 10 jours
      currentTime += 10 * 24 * 60 * 60 * 1000;
      expect(ErpDate.today().toISOString()).toBe('2026-01-11');

      // Avancer encore de 20 jours
      currentTime += 20 * 24 * 60 * 60 * 1000;
      expect(ErpDate.today().toISOString()).toBe('2026-01-31');
    });
  });
});
