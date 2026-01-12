/**
 * Stores - Classes JS pures pour la gestion d'état
 * Sans dépendances React, testables avec injection de dépendances
 */
export { Store, withLoading } from './base.js';
export type { LoadingState } from './base.js';

export { useStore, useStoreSelector, useStoreInstance } from './useStore.js';

export { ModelStore, createModelStore } from './model.js';
export type { ModelState } from './model.js';

export {
  ViewStore,
  ActionStore,
  MenuStore,
  createViewStore,
  createActionStore,
  createMenuStore,
} from './view.js';
export type { ViewState, ActionState, MenuState } from './view.js';

export { TimesheetGridStore, createTimesheetGridStore } from './timesheet.js';
export type { TimesheetGridState, GridRow, GridCell } from './timesheet.js';
