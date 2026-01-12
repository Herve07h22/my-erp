export interface Menu {
  id: string;
  label: string;
  action?: string;
  children?: Menu[];
}

export interface CurrentView {
  model: string;
  viewType: string;
  recordId: number | null;
  title: string;
  defaults?: Record<string, unknown>;
}

export interface NavigateParams {
  model: string;
  viewType: string;
  recordId?: number | null;
  defaults?: Record<string, unknown>;
}
