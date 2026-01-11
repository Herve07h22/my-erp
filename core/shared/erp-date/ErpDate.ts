/**
 * ErpDate - Value object immuable pour les dates calendaires (sans heure)
 *
 * Stocke internement année, mois, jour pour éviter les problèmes de timezone.
 * Sérialise en format ISO 'YYYY-MM-DD'.
 */

import { DEFAULT_LOCALE, ISO_DATE_PATTERN, WEEK_START_DAY } from './constants.js';
import { now } from './clock.js';
// Note: ErpDateTime importe ErpDate, mais la dépendance circulaire fonctionne
// car elle n'est utilisée qu'à l'exécution de méthodes, pas à l'initialisation
import { ErpDateTime } from './ErpDateTime.js';

export class ErpDate {
  private readonly _year: number;
  private readonly _month: number; // 1-12 (pas 0-indexé comme JS Date)
  private readonly _day: number;

  private constructor(year: number, month: number, day: number) {
    this._year = year;
    this._month = month;
    this._day = day;
    Object.freeze(this);
  }

  // ============ Factory Methods ============

  /** Crée un ErpDate pour aujourd'hui (timezone locale) */
  static today(): ErpDate {
    const date = new Date(now());
    return new ErpDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  }

  /** Crée depuis une chaîne ISO 'YYYY-MM-DD' */
  static fromISOString(isoString: string): ErpDate {
    if (!ISO_DATE_PATTERN.test(isoString)) {
      throw new Error(`Format de date invalide: "${isoString}". Attendu: YYYY-MM-DD`);
    }
    const [year, month, day] = isoString.split('-').map(Number);
    return new ErpDate(year, month, day);
  }

  /** Crée depuis un objet Date JS (utilise les composants locaux) */
  static fromDate(date: Date): ErpDate {
    return new ErpDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  }

  /** Crée depuis des composants (year, month 1-12, day) */
  static from(year: number, month: number, day: number): ErpDate {
    // Valide via Date pour gérer les débordements (ex: 32 janvier -> 1 février)
    const d = new Date(year, month - 1, day);
    return new ErpDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  /** Parse flexible - accepte n'importe quel type, retourne null si invalide */
  static parse(value: unknown): ErpDate | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (value instanceof ErpDate) {
      return value;
    }
    if (value instanceof Date) {
      if (isNaN(value.getTime())) {
        return null;
      }
      return ErpDate.fromDate(value);
    }
    if (typeof value === 'string') {
      if (!value.trim()) {
        return null;
      }
      // Gère les ISO datetime (avec T) en extrayant la partie date
      const dateStr = value.includes('T') ? value.split('T')[0] : value;
      if (ISO_DATE_PATTERN.test(dateStr)) {
        return ErpDate.fromISOString(dateStr);
      }
      // Tente un parse via Date
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return ErpDate.fromDate(d);
      }
    }
    return null;
  }

  // ============ Getters ============

  get year(): number {
    return this._year;
  }

  get month(): number {
    return this._month;
  }

  get day(): number {
    return this._day;
  }

  /** Jour de la semaine (0=Dimanche, 1=Lundi, ..., 6=Samedi) */
  get dayOfWeek(): number {
    return this.toDate().getDay();
  }

  /** Trimestre (1-4) */
  get quarter(): number {
    return Math.ceil(this._month / 3);
  }

  /** Numéro de semaine ISO */
  get weekOfYear(): number {
    const date = this.toDate();
    const thursday = new Date(date);
    thursday.setDate(date.getDate() + (4 - (date.getDay() || 7)));
    const yearStart = new Date(thursday.getFullYear(), 0, 1);
    return Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  // ============ Arithmetic Methods ============

  addDays(days: number): ErpDate {
    const d = this.toDate();
    d.setDate(d.getDate() + days);
    return ErpDate.fromDate(d);
  }

  addWeeks(weeks: number): ErpDate {
    return this.addDays(weeks * 7);
  }

  addMonths(months: number): ErpDate {
    const d = this.toDate();
    d.setMonth(d.getMonth() + months);
    return ErpDate.fromDate(d);
  }

  addYears(years: number): ErpDate {
    const d = this.toDate();
    d.setFullYear(d.getFullYear() + years);
    return ErpDate.fromDate(d);
  }

  /** Retourne le lundi de la semaine */
  getWeekStart(): ErpDate {
    const d = this.toDate();
    const day = d.getDay();
    // Calcul pour que lundi soit le début (WEEK_START_DAY = 1)
    const diff = day === 0 ? -6 : WEEK_START_DAY - day;
    d.setDate(d.getDate() + diff);
    return ErpDate.fromDate(d);
  }

  /** Retourne le dimanche de la semaine */
  getWeekEnd(): ErpDate {
    return this.getWeekStart().addDays(6);
  }

  /** Retourne les 7 jours de la semaine (lundi à dimanche) */
  getWeekDays(): ErpDate[] {
    const start = this.getWeekStart();
    const days: ErpDate[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(start.addDays(i));
    }
    return days;
  }

  /** Premier jour du mois */
  getMonthStart(): ErpDate {
    return ErpDate.from(this._year, this._month, 1);
  }

  /** Dernier jour du mois */
  getMonthEnd(): ErpDate {
    // Le jour 0 du mois suivant = dernier jour du mois courant
    const d = new Date(this._year, this._month, 0);
    return ErpDate.fromDate(d);
  }

  /** Tous les jours du mois */
  getMonthDays(): ErpDate[] {
    const start = this.getMonthStart();
    const end = this.getMonthEnd();
    const days: ErpDate[] = [];
    let current = start;
    while (!current.isAfter(end)) {
      days.push(current);
      current = current.addDays(1);
    }
    return days;
  }

  // ============ Comparison Methods ============

  equals(other: ErpDate): boolean {
    return (
      this._year === other._year &&
      this._month === other._month &&
      this._day === other._day
    );
  }

  isSameDay(other: ErpDate): boolean {
    return this.equals(other);
  }

  isBefore(other: ErpDate): boolean {
    return this.compareTo(other) < 0;
  }

  isAfter(other: ErpDate): boolean {
    return this.compareTo(other) > 0;
  }

  isSameMonth(other: ErpDate): boolean {
    return this._year === other._year && this._month === other._month;
  }

  isSameYear(other: ErpDate): boolean {
    return this._year === other._year;
  }

  isBetween(start: ErpDate, end: ErpDate): boolean {
    return !this.isBefore(start) && !this.isAfter(end);
  }

  /** Compare pour tri: -1, 0, ou 1 */
  compareTo(other: ErpDate): -1 | 0 | 1 {
    if (this._year !== other._year) {
      return this._year < other._year ? -1 : 1;
    }
    if (this._month !== other._month) {
      return this._month < other._month ? -1 : 1;
    }
    if (this._day !== other._day) {
      return this._day < other._day ? -1 : 1;
    }
    return 0;
  }

  // ============ Serialization ============

  /** Format ISO 'YYYY-MM-DD' */
  toISOString(): string {
    const y = String(this._year).padStart(4, '0');
    const m = String(this._month).padStart(2, '0');
    const d = String(this._day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** Pour JSON.stringify */
  toJSON(): string {
    return this.toISOString();
  }

  toString(): string {
    return this.toISOString();
  }

  /** Convertit en Date JS (à minuit heure locale) */
  toDate(): Date {
    return new Date(this._year, this._month - 1, this._day);
  }

  /** Convertit en ErpDateTime à minuit */
  toErpDateTime(): ErpDateTime {
    return ErpDateTime.fromErpDate(this);
  }

  // ============ Formatting ============

  /** Format avec options Intl.DateTimeFormat */
  format(options?: Intl.DateTimeFormatOptions, locale: string = DEFAULT_LOCALE): string {
    return this.toDate().toLocaleDateString(locale, options);
  }

  /** Format court: "5 janv." */
  formatShort(locale: string = DEFAULT_LOCALE): string {
    return this.format({ day: 'numeric', month: 'short' }, locale);
  }

  /** Nom du jour: "lun." */
  formatDayName(locale: string = DEFAULT_LOCALE): string {
    return this.format({ weekday: 'short' }, locale);
  }

  /** Format long: "5 janvier 2026" */
  formatLong(locale: string = DEFAULT_LOCALE): string {
    return this.format({ day: 'numeric', month: 'long', year: 'numeric' }, locale);
  }

  /** Format localisé standard: "05/01/2026" */
  formatLocale(locale: string = DEFAULT_LOCALE): string {
    return this.toDate().toLocaleDateString(locale);
  }
}
