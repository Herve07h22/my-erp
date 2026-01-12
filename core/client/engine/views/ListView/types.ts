import type { RecordData, FieldDefinition } from '../../hooks/useModel';

export interface ViewArch {
  fields?: string[];
  allowGrid?: boolean;
  [key: string]: unknown;
}

export interface FieldsCollection {
  [fieldName: string]: FieldDefinition;
}

export type SearchDomain = [string, string, string][];

export type { RecordData, FieldDefinition };
