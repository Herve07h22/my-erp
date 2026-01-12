import type { FieldDefinition, RecordData } from '../../hooks/useModel';

export interface HeaderButton {
  name: string;
  label: string;
  type?: string;
  states?: string[];
}

export interface StatusBarDef {
  field: string;
}

export interface GroupDef {
  label?: string;
  fields: string[];
}

export interface NotebookTab {
  label: string;
  content?: {
    field?: string;
    fields?: string[];
    widget?: string;
    tree?: string[];
  };
}

export interface FooterItem {
  field: string;
}

export interface ViewArch {
  header?: {
    buttons?: HeaderButton[];
    statusbar?: StatusBarDef;
  };
  sheet?: {
    groups?: GroupDef[];
    notebook?: NotebookTab[];
    footer?: {
      fields?: FooterItem[];
    };
  };
  [key: string]: unknown;
}

export interface ValidationErrors {
  [fieldName: string]: string;
}

export interface FieldsCollection {
  [fieldName: string]: FieldDefinition;
}

export type { FieldDefinition, RecordData };
