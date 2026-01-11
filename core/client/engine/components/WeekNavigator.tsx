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
