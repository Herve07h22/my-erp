/**
 * ErpDateTime - Value object immuable pour les timestamps (date + heure)
 *
 * Stocke internement un timestamp UTC en millisecondes.
 * Sérialise en format ISO 8601 complet.
 */

import { DEFAULT_LOCALE } from './constants.js';
import { now as clockNow } from './clock.js';
import { ErpDate } from './ErpDate.js';

export class ErpDateTime {
  private readonly _timestamp: number; // millisecondes UTC depuis epoch

  private constructor(timestamp: number) {
    this._timestamp = timestamp;
    Object.freeze(this);
  }

  // ============ Factory Methods ============

  /** Crée un ErpDateTime pour l'instant présent */
  static now(): ErpDateTime {
    return new ErpDateTime(clockNow());
  }

  /** Crée depuis une chaîne ISO 8601 */
  static fromISOString(isoString: string): ErpDateTime {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      throw new Error(`Format datetime invalide: "${isoString}"`);
    }
    return new ErpDateTime(d.getTime());
  }

  /** Crée depuis un objet Date JS */
  static fromDate(date: Date): ErpDateTime {
    return new ErpDateTime(date.getTime());
  }

  /** Crée depuis des composants (timezone locale) */
  static from(
    year: number,
    month: number,
    day: number,
    hours: number = 0,
    minutes: number = 0,
    seconds: number = 0,
    milliseconds: number = 0
  ): ErpDateTime {
    const d = new Date(year, month - 1, day, hours, minutes, seconds, milliseconds);
    return new ErpDateTime(d.getTime());
  }

  /** Crée depuis un ErpDate à l'heure spécifiée (défaut: minuit) */
  static fromErpDate(
    date: ErpDate,
    hours: number = 0,
    minutes: number = 0,
    seconds: number = 0
  ): ErpDateTime {
    return ErpDateTime.from(date.year, date.month, date.day, hours, minutes, seconds);
  }

  /** Parse flexible - accepte n'importe quel type, retourne null si invalide */
  static parse(value: unknown): ErpDateTime | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (value instanceof ErpDateTime) {
      return value;
    }
    if (value instanceof Date) {
      if (isNaN(value.getTime())) {
        return null;
      }
      return ErpDateTime.fromDate(value);
    }
    if (typeof value === 'string') {
      if (!value.trim()) {
        return null;
      }
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return new ErpDateTime(d.getTime());
      }
    }
    return null;
  }

  // ============ Getters (timezone locale) ============

  private _toLocalDate(): Date {
    return new Date(this._timestamp);
  }

  get year(): number {
    return this._toLocalDate().getFullYear();
  }

  get month(): number {
    return this._toLocalDate().getMonth() + 1; // 1-12
  }

  get day(): number {
    return this._toLocalDate().getDate();
  }

  get hours(): number {
    return this._toLocalDate().getHours();
  }

  get minutes(): number {
    return this._toLocalDate().getMinutes();
  }

  get seconds(): number {
    return this._toLocalDate().getSeconds();
  }

  get milliseconds(): number {
    return this._toLocalDate().getMilliseconds();
  }

  get dayOfWeek(): number {
    return this._toLocalDate().getDay();
  }

  get timestamp(): number {
    return this._timestamp;
  }

  // ============ Arithmetic Methods ============

  addMilliseconds(ms: number): ErpDateTime {
    return new ErpDateTime(this._timestamp + ms);
  }

  addSeconds(seconds: number): ErpDateTime {
    return this.addMilliseconds(seconds * 1000);
  }

  addMinutes(minutes: number): ErpDateTime {
    return this.addMilliseconds(minutes * 60 * 1000);
  }

  addHours(hours: number): ErpDateTime {
    return this.addMilliseconds(hours * 60 * 60 * 1000);
  }

  addDays(days: number): ErpDateTime {
    const d = this._toLocalDate();
    d.setDate(d.getDate() + days);
    return new ErpDateTime(d.getTime());
  }

  addWeeks(weeks: number): ErpDateTime {
    return this.addDays(weeks * 7);
  }

  addMonths(months: number): ErpDateTime {
    const d = this._toLocalDate();
    d.setMonth(d.getMonth() + months);
    return new ErpDateTime(d.getTime());
  }

  addYears(years: number): ErpDateTime {
    const d = this._toLocalDate();
    d.setFullYear(d.getFullYear() + years);
    return new ErpDateTime(d.getTime());
  }

  /** Retourne minuit du même jour */
  startOfDay(): ErpDateTime {
    return ErpDateTime.from(this.year, this.month, this.day, 0, 0, 0, 0);
  }

  /** Retourne 23:59:59.999 du même jour */
  endOfDay(): ErpDateTime {
    return ErpDateTime.from(this.year, this.month, this.day, 23, 59, 59, 999);
  }

  // ============ Comparison Methods ============

  equals(other: ErpDateTime): boolean {
    return this._timestamp === other._timestamp;
  }

  isBefore(other: ErpDateTime): boolean {
    return this._timestamp < other._timestamp;
  }

  isAfter(other: ErpDateTime): boolean {
    return this._timestamp > other._timestamp;
  }

  isSameDay(other: ErpDateTime): boolean {
    return (
      this.year === other.year &&
      this.month === other.month &&
      this.day === other.day
    );
  }

  isBetween(start: ErpDateTime, end: ErpDateTime): boolean {
    return this._timestamp >= start._timestamp && this._timestamp <= end._timestamp;
  }

  compareTo(other: ErpDateTime): -1 | 0 | 1 {
    if (this._timestamp < other._timestamp) return -1;
    if (this._timestamp > other._timestamp) return 1;
    return 0;
  }

  // ============ Difference Methods ============

  /** Différence en millisecondes */
  diff(other: ErpDateTime): number {
    return this._timestamp - other._timestamp;
  }

  /** Différence dans l'unité spécifiée */
  diffIn(other: ErpDateTime, unit: 'days' | 'hours' | 'minutes' | 'seconds'): number {
    const diffMs = this.diff(other);
    switch (unit) {
      case 'seconds':
        return Math.floor(diffMs / 1000);
      case 'minutes':
        return Math.floor(diffMs / (60 * 1000));
      case 'hours':
        return Math.floor(diffMs / (60 * 60 * 1000));
      case 'days':
        return Math.floor(diffMs / (24 * 60 * 60 * 1000));
    }
  }

  // ============ Conversion ============

  /** Extrait la partie date */
  toErpDate(): ErpDate {
    return ErpDate.from(this.year, this.month, this.day);
  }

  /** Convertit en Date JS */
  toDate(): Date {
    return new Date(this._timestamp);
  }

  /** Format ISO 8601 complet */
  toISOString(): string {
    return this.toDate().toISOString();
  }

  /** Pour JSON.stringify */
  toJSON(): string {
    return this.toISOString();
  }

  toString(): string {
    return this.toISOString();
  }

  // ============ Formatting ============

  /** Format avec options Intl.DateTimeFormat */
  format(options?: Intl.DateTimeFormatOptions, locale: string = DEFAULT_LOCALE): string {
    return this.toDate().toLocaleString(locale, options);
  }

  /** Format court: "5 janv. 14:30" */
  formatShort(locale: string = DEFAULT_LOCALE): string {
    return this.format(
      { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
      locale
    );
  }

  /** Format long: "5 janvier 2026 14:30:00" */
  formatLong(locale: string = DEFAULT_LOCALE): string {
    return this.format(
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      },
      locale
    );
  }

  /** Heure seule: "14:30" */
  formatTime(locale: string = DEFAULT_LOCALE): string {
    return this.format({ hour: '2-digit', minute: '2-digit' }, locale);
  }

  /** Date et heure: "05/01/2026 14:30" */
  formatDateTime(locale: string = DEFAULT_LOCALE): string {
    return this.toDate().toLocaleString(locale);
  }
}
