/**
 * Module erp-date - Value objects pour la gestion des dates
 *
 * @example
 * ```typescript
 * import { ErpDate, ErpDateTime } from '@core/shared/erp-date';
 *
 * const today = ErpDate.today();
 * const weekStart = today.getWeekStart();
 * const formatted = today.formatShort(); // "11 janv."
 *
 * const now = ErpDateTime.now();
 * const dateOnly = now.toErpDate();
 * ```
 */

export { ErpDate } from './ErpDate.js';
export { ErpDateTime } from './ErpDateTime.js';
export { DEFAULT_LOCALE, WEEK_START_DAY, ISO_DATE_PATTERN, ISO_DATETIME_PATTERN } from './constants.js';
export type { ErpDateInput, ErpDateTimeInput, WeekStartDay } from './types.js';

// Clock injectable pour les tests
export { setClock, resetClock, setFixedDate } from './clock.js';
export type { ClockFn } from './clock.js';
