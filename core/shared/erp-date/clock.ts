/**
 * Horloge injectable pour les tests
 *
 * Par défaut, utilise Date.now() en production.
 * Peut être remplacée dans les tests pour contrôler le temps.
 *
 * @example
 * ```typescript
 * // Dans un test
 * import { setClock, resetClock } from '@core/shared/erp-date';
 *
 * beforeEach(() => {
 *   // Fixer la date au 15 janvier 2026
 *   setClock(() => new Date(2026, 0, 15).getTime());
 * });
 *
 * afterEach(() => {
 *   resetClock();
 * });
 *
 * it('should use the fixed date', () => {
 *   const today = ErpDate.today();
 *   expect(today.toISOString()).toBe('2026-01-15');
 * });
 * ```
 */

/** Type de la fonction d'horloge */
export type ClockFn = () => number;

/** Horloge par défaut (production) */
const defaultClock: ClockFn = () => Date.now();

/** Horloge actuelle */
let currentClock: ClockFn = defaultClock;

/**
 * Obtient le timestamp actuel via l'horloge configurée
 */
export function now(): number {
  return currentClock();
}

/**
 * Remplace l'horloge (pour les tests)
 * @param clock Fonction retournant un timestamp en millisecondes
 */
export function setClock(clock: ClockFn): void {
  currentClock = clock;
}

/**
 * Réinitialise l'horloge à sa valeur par défaut
 */
export function resetClock(): void {
  currentClock = defaultClock;
}

/**
 * Fixe l'horloge à une date précise (helper pour les tests)
 * @param date Date à utiliser comme "maintenant"
 */
export function setFixedDate(date: Date | string): void {
  const timestamp = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  setClock(() => timestamp);
}
