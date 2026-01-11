/**
 * Constantes pour le module erp-date
 */

import type { WeekStartDay } from './types.js';

/** Locale par défaut pour le formatage */
export const DEFAULT_LOCALE = 'fr-FR';

/** La semaine commence le lundi (convention ISO/européenne) */
export const WEEK_START_DAY: WeekStartDay = 1;

/** Pattern regex pour les dates ISO (YYYY-MM-DD) */
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Pattern regex pour les datetime ISO */
export const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
