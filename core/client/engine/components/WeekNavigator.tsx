import React from 'react';
import { ErpDate } from '../../../shared/erp-date/index.js';

export type PeriodType = 'week' | 'month';

interface WeekNavigatorProps {
  currentDate: ErpDate;
  onDateChange: (date: ErpDate) => void;
  periodType?: PeriodType;
  onPeriodChange?: (type: PeriodType) => void;
}

/**
 * Retourne le lundi de la semaine contenant la date donnée
 */
export function getWeekStart(date: ErpDate): ErpDate {
  return date.getWeekStart();
}

/**
 * Formate une date en français court (ex: "5 janv.")
 */
export function formatShortDate(date: ErpDate): string {
  return date.formatShort();
}

/**
 * Formate le nom du jour en français abrégé (ex: "lun.")
 */
export function formatDayName(date: ErpDate): string {
  return date.formatDayName();
}

/**
 * Retourne les 7 jours de la semaine à partir du lundi
 */
export function getWeekDays(weekStart: ErpDate): ErpDate[] {
  return weekStart.getWeekDays();
}

/**
 * Vérifie si deux dates sont le même jour
 */
export function isSameDay(date1: ErpDate, date2: ErpDate): boolean {
  return date1.isSameDay(date2);
}

/**
 * Formate une date en ISO (YYYY-MM-DD)
 */
export function formatDateISO(date: ErpDate): string {
  return date.toISOString();
}

/**
 * Composant de navigation temporelle pour les feuilles de temps
 */
export function WeekNavigator({
  currentDate,
  onDateChange,
  periodType = 'week',
  onPeriodChange,
}: WeekNavigatorProps): React.ReactElement {
  const weekStart = currentDate.getWeekStart();
  const weekEnd = weekStart.addDays(6);

  const handleToday = (): void => {
    onDateChange(ErpDate.today());
  };

  const handlePrevious = (): void => {
    const newDate =
      periodType === 'week' ? currentDate.addWeeks(-1) : currentDate.addMonths(-1);
    onDateChange(newDate);
  };

  const handleNext = (): void => {
    const newDate =
      periodType === 'week' ? currentDate.addWeeks(1) : currentDate.addMonths(1);
    onDateChange(newDate);
  };

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    if (onPeriodChange) {
      onPeriodChange(e.target.value as PeriodType);
    }
  };

  return (
    <div className="week-navigator">
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={handleToday}
      >
        Aujourd'hui
      </button>

      <div className="week-navigator-arrows">
        <button
          type="button"
          className="btn btn-icon"
          onClick={handlePrevious}
          title="Période précédente"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </button>

        <select
          className="period-select"
          value={periodType}
          onChange={handlePeriodChange}
        >
          <option value="week">Semaine</option>
          <option value="month">Mois</option>
        </select>

        <button
          type="button"
          className="btn btn-icon"
          onClick={handleNext}
          title="Période suivante"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </button>
      </div>

      <span className="week-navigator-label">
        {weekStart.formatShort()} - {weekEnd.formatShort()}
      </span>
    </div>
  );
}

export default WeekNavigator;
