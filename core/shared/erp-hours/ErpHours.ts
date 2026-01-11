/**
 * ErpHours - Value object immuable pour les durées en heures
 *
 * Encapsule la logique de parsing et de calcul des heures.
 * Garantit que les opérations ne produisent jamais NaN.
 * Sérialise en format 'H:MM' ou nombre décimal.
 */

export class ErpHours {
  private readonly _value: number;

  private constructor(value: number) {
    // Garantit qu'on n'a jamais NaN
    this._value = Number.isNaN(value) ? 0 : value;
    Object.freeze(this);
  }

  // ============ Factory Methods ============

  /** Crée ErpHours avec valeur zéro */
  static zero(): ErpHours {
    return new ErpHours(0);
  }

  /** Crée depuis n'importe quelle entrée (string, number, null, etc.) */
  static from(input: unknown): ErpHours {
    if (input === null || input === undefined) {
      return ErpHours.zero();
    }

    if (input instanceof ErpHours) {
      return input;
    }

    if (typeof input === 'number') {
      return new ErpHours(input);
    }

    if (typeof input === 'string') {
      return ErpHours.parse(input);
    }

    return ErpHours.zero();
  }

  /** Parse une chaîne HH:MM ou décimale */
  static parse(str: string): ErpHours {
    const trimmed = str.trim();

    if (!trimmed || trimmed === '0:00') {
      return ErpHours.zero();
    }

    // Format H:MM ou HH:MM
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      return new ErpHours(h + m / 60);
    }

    // Nombre décimal
    const num = parseFloat(trimmed);
    return new ErpHours(num);
  }

  // ============ Getters ============

  /** Retourne la valeur en heures décimales */
  toNumber(): number {
    return this._value;
  }

  /** Retourne la partie heures entières */
  get hours(): number {
    return Math.floor(Math.abs(this._value));
  }

  /** Retourne la partie minutes (0-59) */
  get minutes(): number {
    return Math.round((Math.abs(this._value) - this.hours) * 60);
  }

  // ============ Operations ============

  /** Additionne deux durées */
  add(other: ErpHours): ErpHours {
    return new ErpHours(this._value + other._value);
  }

  /** Soustrait une durée */
  subtract(other: ErpHours): ErpHours {
    return new ErpHours(this._value - other._value);
  }

  /** Multiplie par un facteur */
  multiply(factor: number): ErpHours {
    return new ErpHours(this._value * factor);
  }

  // ============ Predicates ============

  isZero(): boolean {
    return this._value === 0;
  }

  isPositive(): boolean {
    return this._value > 0;
  }

  isNegative(): boolean {
    return this._value < 0;
  }

  // ============ Formatting ============

  /** Formate en H:MM */
  format(): string {
    if (this._value === 0) return '0:00';

    const sign = this._value < 0 ? '-' : '';
    const h = this.hours;
    const m = this.minutes;

    return `${sign}${h}:${m.toString().padStart(2, '0')}`;
  }

  /** Formate en décimal avec précision */
  formatDecimal(decimals: number = 2): string {
    return this._value.toFixed(decimals);
  }

  // ============ Comparison ============

  equals(other: ErpHours): boolean {
    return this._value === other._value;
  }

  lessThan(other: ErpHours): boolean {
    return this._value < other._value;
  }

  greaterThan(other: ErpHours): boolean {
    return this._value > other._value;
  }

  // ============ Static helpers ============

  /** Somme un tableau de ErpHours */
  static sum(items: ErpHours[]): ErpHours {
    return items.reduce((acc, item) => acc.add(item), ErpHours.zero());
  }
}
