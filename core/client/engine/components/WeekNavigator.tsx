import React from 'react';

export type PeriodType = 'week' | 'month';

interface WeekNavigatorProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  periodType?: PeriodType;
  onPeriodChange?: (type: PeriodType) => void;
}

/**
 * Retourne le lundi de la semaine contenant la date donnée
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Formate une date en français court (ex: "5 janv.")
 */
function formatShortDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/**
 * Formate le nom du jour en français abrégé (ex: "lun.")
 */
function formatDayName(date: Date): string {
  return date.toLocaleDateString('fr-FR', { weekday: 'short' });
}

/**
 * Retourne les 7 jours de la semaine à partir du lundi
 */
export function getWeekDays(weekStart: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    days.push(day);
  }
  return days;
}

/**
 * Vérifie si deux dates sont le même jour
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Formate une date en ISO (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
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
  const weekStart = getWeekStart(currentDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const handleToday = (): void => {
    onDateChange(new Date());
  };

  const handlePrevious = (): void => {
    const newDate = new Date(currentDate);
    if (periodType === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    onDateChange(newDate);
  };

  const handleNext = (): void => {
    const newDate = new Date(currentDate);
    if (periodType === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
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
        {formatShortDate(weekStart)} - {formatShortDate(weekEnd)}
      </span>
    </div>
  );
}

export { getWeekStart, formatShortDate, formatDayName };
export default WeekNavigator;
