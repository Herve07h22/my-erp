import React, { useState, useCallback, useEffect } from 'react';
import { WeekNavigator } from '../components/WeekNavigator.js';
import { ViewSwitcher, ViewMode } from '../components/ViewSwitcher.js';
import { useTimesheetGrid, GridRow } from '../hooks/useTimesheetGrid.js';
import { ErpDate } from '../../../shared/erp-date/index.js';

interface ViewDefinition {
  id: string;
  model: string;
  type: string;
  arch?: unknown;
}

interface NavigateParams {
  model: string;
  viewType: string;
  recordId?: number | null;
}

interface TimesheetGridViewProps {
  model: string;
  viewDef: ViewDefinition;
  onNavigate: (params: NavigateParams) => void;
  onViewChange?: (viewType: ViewMode) => void;
}

/**
 * Formate un nombre d'heures en HH:MM
 */
function formatHours(hours: number): string {
  if (hours === 0) return '0:00';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

/**
 * Parse une chaîne HH:MM en nombre d'heures
 */
function parseHours(str: string): number {
  const trimmed = str.trim();
  if (!trimmed || trimmed === '0:00') return 0;

  // Format H:MM ou HH:MM
  if (trimmed.includes(':')) {
    const [h, m] = trimmed.split(':').map(Number);
    return (h || 0) + (m || 0) / 60;
  }

  // Nombre simple (heures décimales)
  const num = parseFloat(trimmed);
  return isNaN(num) ? 0 : num;
}

/**
 * Composant de cellule éditable pour les heures
 */
function TimeCell({
  value,
  onChange,
  isToday,
}: {
  value: number;
  onChange: (hours: number) => void;
  isToday: boolean;
}): React.ReactElement {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(formatHours(value));

  useEffect(() => {
    if (!editing) {
      setInputValue(formatHours(value));
    }
  }, [value, editing]);

  const handleBlur = (): void => {
    setEditing(false);
    const newHours = parseHours(inputValue);
    if (newHours !== value) {
      onChange(newHours);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setInputValue(formatHours(value));
      setEditing(false);
    }
  };

  return (
    <td className={`time-cell ${isToday ? 'today' : ''}`}>
      {editing ? (
        <input
          type="text"
          className="time-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      ) : (
        <button
          type="button"
          className={`time-display ${value > 0 ? 'has-value' : ''}`}
          onClick={() => setEditing(true)}
        >
          {formatHours(value)}
        </button>
      )}
    </td>
  );
}

/**
 * Vue grille hebdomadaire des feuilles de temps
 * Affiche une ligne par tâche non terminée
 */
export function TimesheetGridView({
  model,
  viewDef: _viewDef,
  onNavigate,
  onViewChange,
}: TimesheetGridViewProps): React.ReactElement {
  void _viewDef; // Sera utilisé pour la configuration future
  const [currentDate, setCurrentDate] = useState(ErpDate.today());

  const {
    rows,
    dayTotals,
    weekTotal,
    targetHours,
    loading,
    error,
    weekDays,
    updateCell,
  } = useTimesheetGrid(currentDate);

  const today = ErpDate.today();

  const handleCellChange = useCallback(
    async (row: GridRow, date: string, hours: number): Promise<void> => {
      await updateCell(row.taskId, date, hours);
    },
    [updateCell]
  );

  const handleViewChange = (view: ViewMode): void => {
    if (onViewChange) {
      onViewChange(view);
    } else if (view === 'list') {
      onNavigate({ model, viewType: 'list' });
    }
  };

  const progressPercent = Math.min(100, (weekTotal / targetHours) * 100);
  const progressColor =
    weekTotal >= targetHours ? '#34a853' : weekTotal >= targetHours * 0.8 ? '#fbbc04' : '#4285f4';

  return (
    <div className="timesheet-grid-view">
      <header className="timesheet-grid-header">
        <WeekNavigator currentDate={currentDate} onDateChange={setCurrentDate} />
        <ViewSwitcher currentView="grid" onViewChange={handleViewChange} />
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="timesheet-grid-container">
        <table className="timesheet-grid-table">
          <thead>
            <tr>
              <th className="col-index"></th>
              <th className="col-project">Projet / Tâche</th>
              {weekDays.map((day) => {
                const isToday = day.isSameDay(today);
                return (
                  <th
                    key={day.toISOString()}
                    className={`col-day ${isToday ? 'today' : ''}`}
                  >
                    <div className="day-name">{day.formatDayName()}</div>
                    <div className="day-date">
                      {day.day} {day.formatShort().split(' ')[1]}
                    </div>
                  </th>
                );
              })}
              <th className="col-total">Temps passé</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="no-records">
                  Aucune tâche en cours
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.key} className="timesheet-row">
                  <td className="col-index">
                    <span className="row-letter">
                      {String.fromCharCode(65 + index)}
                    </span>
                  </td>
                  <td className="col-project">
                    <span className="project-name">{row.projectName}</span>
                    <span className="separator">|</span>
                    <span className="task-name">{row.taskName}</span>
                    {row.variance !== 0 && (
                      <span
                        className={`variance ${row.variance > 0 ? 'positive' : 'negative'}`}
                      >
                        {row.variance > 0 ? '+' : ''}
                        {formatHours(row.variance)}
                      </span>
                    )}
                  </td>
                  {weekDays.map((day) => {
                    const dateKey = day.toISOString();
                    const cellValue = row.cells[dateKey]?.hours || 0;
                    const isToday = day.isSameDay(today);

                    return (
                      <TimeCell
                        key={dateKey}
                        value={cellValue}
                        onChange={(hours) => handleCellChange(row, dateKey, hours)}
                        isToday={isToday}
                      />
                    );
                  })}
                  <td className="col-total row-total">{formatHours(row.totalHours)}</td>
                </tr>
              ))
            )}
          </tbody>

          <tfoot>
            <tr className="totals-row">
              <td></td>
              <td></td>
              {weekDays.map((day) => {
                const dateKey = day.toISOString();
                const total = dayTotals[dateKey] || 0;
                const isToday = day.isSameDay(today);

                return (
                  <td
                    key={dateKey}
                    className={`col-day day-total ${isToday ? 'today' : ''}`}
                  >
                    {formatHours(total)}
                  </td>
                );
              })}
              <td className="col-total week-total">{formatHours(weekTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <footer className="timesheet-grid-footer">
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%`, backgroundColor: progressColor }}
            />
          </div>
          <span className="progress-label">
            {formatHours(weekTotal)} / {formatHours(targetHours)}
          </span>
        </div>
      </footer>

      {loading && <div className="loading-overlay">Chargement...</div>}
    </div>
  );
}

export default TimesheetGridView;
