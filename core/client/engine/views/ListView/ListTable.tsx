import React, { ChangeEvent } from 'react';
import { ErpDate, ErpDateTime } from '../../../../shared/erp-date/index.js';
import type { RecordData, FieldDefinition, FieldsCollection } from './types';

interface ListTableProps {
  records: RecordData[];
  fields: FieldsCollection;
  fieldNames: string[];
  selectedIds: Set<number>;
  onSelectAll: (e: ChangeEvent<HTMLInputElement>) => void;
  onSelectOne: (id: number) => void;
  onRowClick: (record: RecordData) => void;
}

function formatValue(value: unknown, fieldDef?: FieldDefinition): string {
  if (value === null || value === undefined) return '-';

  switch (fieldDef?.type) {
    case 'boolean':
      return value ? 'Oui' : 'Non';
    case 'date':
      return ErpDate.parse(value)?.formatLocale() ?? '-';
    case 'datetime':
      return ErpDateTime.parse(value)?.formatDateTime() ?? '-';
    case 'monetary':
    case 'float':
      return typeof value === 'number' ? value.toFixed(2) : String(value);
    case 'selection': {
      const opt = fieldDef.options?.find(([v]) => v === value);
      return opt ? opt[1] : String(value);
    }
    case 'many2one': {
      if (typeof value === 'object' && value !== null && 'name' in value) {
        return (value as { name: string }).name;
      }
      return String(value);
    }
    default:
      return String(value);
  }
}

/**
 * Table d'affichage des enregistrements
 */
export function ListTable({
  records,
  fields,
  fieldNames,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onRowClick,
}: ListTableProps): React.ReactElement {
  return (
    <table className="list-table">
      <thead>
        <tr>
          <th className="col-checkbox">
            <input
              type="checkbox"
              onChange={onSelectAll}
              checked={selectedIds.size === records.length && records.length > 0}
            />
          </th>
          {fieldNames.map((fieldName) => (
            <th key={fieldName}>{fields[fieldName]?.label || fieldName}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {records.length === 0 ? (
          <tr>
            <td colSpan={fieldNames.length + 1} className="no-records">
              Aucun enregistrement
            </td>
          </tr>
        ) : (
          records.map((record) => (
            <tr
              key={record.id}
              onClick={() => onRowClick(record)}
              className={selectedIds.has(record.id) ? 'selected' : ''}
            >
              <td className="col-checkbox" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(record.id)}
                  onChange={() => onSelectOne(record.id)}
                />
              </td>
              {fieldNames.map((fieldName) => (
                <td key={fieldName}>
                  {formatValue(record[fieldName], fields[fieldName])}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
