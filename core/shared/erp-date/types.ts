/**
 * Types partagés pour le module erp-date
 */

import type { ErpDate } from './ErpDate.js';
import type { ErpDateTime } from './ErpDateTime.js';

/** Input types connus acceptés par ErpDate (utilisé pour les factory methods) */
export type ErpDateInput = string | Date | ErpDate | null | undefined;

/** Input types connus acceptés par ErpDateTime (utilisé pour les factory methods) */
export type ErpDateTimeInput = string | Date | ErpDateTime | null | undefined;

/** Jour de début de semaine (0=Dimanche, 1=Lundi) */
export type WeekStartDay = 0 | 1;
