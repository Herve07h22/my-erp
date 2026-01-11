import type { QueryResult, QueryResultRow } from 'pg';
import type { Queryable, RecordData } from '../server/orm/types.js';

/**
 * Mock du pool PostgreSQL pour les tests
 * Simule les opérations CRUD en mémoire sans base de données réelle
 */
export class MockPool implements Queryable {
  private tables: Map<string, RecordData[]> = new Map();
  private nextIds: Map<string, number> = new Map();

  /**
   * Exécute une requête SQL simulée
   */
  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: unknown[] = []
  ): Promise<QueryResult<T>> {
    const normalizedSql = sql.trim().replace(/\s+/g, ' ');

    // INSERT
    if (normalizedSql.match(/^INSERT INTO/i)) {
      return Promise.resolve(this.handleInsert(normalizedSql, params) as QueryResult<T>);
    }

    // COUNT (doit être avant SELECT car c'est un cas spécial de SELECT)
    if (normalizedSql.match(/^SELECT\s+COUNT/i)) {
      return Promise.resolve(this.handleCount(normalizedSql, params) as QueryResult<T>);
    }

    // SELECT
    if (normalizedSql.match(/^SELECT/i)) {
      return Promise.resolve(this.handleSelect(normalizedSql, params) as QueryResult<T>);
    }

    // UPDATE
    if (normalizedSql.match(/^UPDATE/i)) {
      return Promise.resolve(this.handleUpdate(normalizedSql, params) as QueryResult<T>);
    }

    // DELETE
    if (normalizedSql.match(/^DELETE FROM/i)) {
      return Promise.resolve(this.handleDelete(normalizedSql, params) as QueryResult<T>);
    }

    throw new Error(`Unsupported SQL operation: ${normalizedSql.substring(0, 50)}`);
  }

  /**
   * Gère les INSERT
   */
  private handleInsert(sql: string, params: unknown[]): QueryResult {
    const match = sql.match(
      /INSERT INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)\s*(?:RETURNING\s+(.+))?/i
    );

    if (!match) {
      throw new Error(`Invalid INSERT SQL: ${sql}`);
    }

    const [, tableName, columnsStr, valuesStr, returning] = match;
    const columns = columnsStr.split(',').map((c) => c.trim());
    const placeholders = valuesStr.split(',').map((v) => v.trim());

    // Récupérer ou créer la table
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, []);
      this.nextIds.set(tableName, 1);
    }

    const table = this.tables.get(tableName)!;
    const nextId = this.nextIds.get(tableName)!;

    // Créer l'enregistrement
    const record: RecordData = { id: nextId };
    for (let i = 0; i < columns.length; i++) {
      const placeholder = placeholders[i];
      const paramIndex = this.extractParamIndex(placeholder);
      if (paramIndex !== null) {
        record[columns[i]] = params[paramIndex - 1];
      } else {
        // Valeur littérale
        record[columns[i]] = this.parseLiteral(placeholder);
      }
    }

    table.push(record);
    this.nextIds.set(tableName, nextId + 1);

    const rows = returning ? [record] : [];
    return {
      rows: rows as QueryResultRow[],
      rowCount: 1,
      command: 'INSERT',
      oid: 0,
      fields: [],
    };
  }

  /**
   * Gère les SELECT
   */
  private handleSelect(sql: string, params: unknown[]): QueryResult {
    const match = sql.match(
      /SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?(?:\s+OFFSET\s+(\d+))?\s*$/i
    );

    if (!match) {
      throw new Error(`Invalid SELECT SQL: ${sql}`);
    }

    const [, selectFields, tableName, whereClause, orderBy, limitStr, offsetStr] = match;

    if (!this.tables.has(tableName)) {
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    }

    let rows = [...this.tables.get(tableName)!];

    // Appliquer WHERE
    if (whereClause) {
      rows = this.applyWhere(rows, whereClause, params);
    }

    // Appliquer ORDER BY
    if (orderBy) {
      rows = this.applyOrderBy(rows, orderBy);
    }

    // Appliquer LIMIT
    if (limitStr) {
      const limit = parseInt(limitStr, 10);
      rows = rows.slice(0, limit);
    }

    // Appliquer OFFSET
    if (offsetStr) {
      const offset = parseInt(offsetStr, 10);
      rows = rows.slice(offset);
    }

    // Filtrer les colonnes si nécessaire
    if (selectFields !== '*') {
      const fields = selectFields.split(',').map((f) => f.trim());
      rows = rows.map((row) => {
        const filtered: RecordData = { id: row.id };
        for (const field of fields) {
          if (row[field] !== undefined) {
            filtered[field] = row[field];
          }
        }
        return filtered;
      });
    }

    return {
      rows: rows as QueryResultRow[],
      rowCount: rows.length,
      command: 'SELECT',
      oid: 0,
      fields: [],
    };
  }

  /**
   * Gère les UPDATE
   */
  private handleUpdate(sql: string, params: unknown[]): QueryResult {
    // Cas spécial: incrémentation atomique de séquence (ir.sequence)
    if (sql.includes('number_next = number_next + number_increment')) {
      return this.handleSequenceIncrement(sql, params);
    }

    const match = sql.match(
      /UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+?))?(?:\s+RETURNING\s+(.+))?\s*$/i
    );

    if (!match) {
      throw new Error(`Invalid UPDATE SQL: ${sql}`);
    }

    const [, tableName, setClause, whereClause, returning] = match;

    if (!this.tables.has(tableName)) {
      return { rows: [], rowCount: 0, command: 'UPDATE', oid: 0, fields: [] };
    }

    let rows = this.tables.get(tableName)!;

    // Appliquer WHERE
    if (whereClause) {
      const whereMatch = whereClause.match(/id\s*=\s*ANY\((\$\d+)\)/i);
      if (whereMatch) {
        const paramIndex = this.extractParamIndex(whereMatch[1]);
        if (paramIndex !== null) {
          const ids = params[paramIndex - 1] as number[];
          rows = rows.filter((r) => ids.includes(r.id));
        }
      } else {
        rows = this.applyWhere(rows, whereClause, params);
      }
    }

    // Parser SET clause
    const setPairs = setClause.split(',').map((s) => s.trim());
    let paramOffset = 0;

    for (const pair of setPairs) {
      const [field, valueExpr] = pair.split('=').map((s) => s.trim());
      if (!valueExpr) continue;
      const paramIndex = this.extractParamIndex(valueExpr);
      if (paramIndex !== null) {
        const value = params[paramIndex - 1];
        for (const row of rows) {
          row[field] = value;
        }
        paramOffset++;
      }
    }

    const resultRows = returning ? rows : [];
    return {
      rows: resultRows as QueryResultRow[],
      rowCount: rows.length,
      command: 'UPDATE',
      oid: 0,
      fields: [],
    };
  }

  /**
   * Gère l'incrémentation atomique des séquences (ir.sequence)
   * Pattern: UPDATE ir_sequence SET number_next = number_next + number_increment ... RETURNING ...
   */
  private handleSequenceIncrement(sql: string, params: unknown[]): QueryResult {
    const table = this.tables.get('ir_sequence');

    if (!table) {
      return { rows: [], rowCount: 0, command: 'UPDATE', oid: 0, fields: [] };
    }

    // Extraire le code de la séquence depuis WHERE code = $1
    const code = params[0] as string;
    const seq = table.find((r) => r.code === code && r.active);

    if (!seq) {
      return { rows: [], rowCount: 0, command: 'UPDATE', oid: 0, fields: [] };
    }

    // Récupérer la valeur actuelle avant incrément
    const currentNumber = seq.number_next as number;
    const increment = (seq.number_increment as number) || 1;

    // Incrémenter
    seq.number_next = currentNumber + increment;
    seq.write_date = new Date().toISOString();

    // Construire le résultat RETURNING avec current_number = valeur avant incrément
    const result = {
      id: seq.id,
      prefix: seq.prefix || '',
      suffix: seq.suffix || '',
      padding: seq.padding || 5,
      current_number: currentNumber,
      use_date_range: seq.use_date_range ?? true,
    };

    return {
      rows: [result] as QueryResultRow[],
      rowCount: 1,
      command: 'UPDATE',
      oid: 0,
      fields: [],
    };
  }

  /**
   * Gère les DELETE
   */
  private handleDelete(sql: string, params: unknown[]): QueryResult {
    const match = sql.match(/DELETE FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?\s*$/i);

    if (!match) {
      throw new Error(`Invalid DELETE SQL: ${sql}`);
    }

    const [, tableName, whereClause] = match;

    if (!this.tables.has(tableName)) {
      return { rows: [], rowCount: 0, command: 'DELETE', oid: 0, fields: [] };
    }

    const table = this.tables.get(tableName)!;

    if (!whereClause) {
      const count = table.length;
      table.length = 0;
      return { rows: [], rowCount: count, command: 'DELETE', oid: 0, fields: [] };
    }

    // Appliquer WHERE
    const whereMatch = whereClause.match(/id\s*=\s*ANY\((\$\d+)\)/i);
    if (whereMatch) {
      const paramIndex = this.extractParamIndex(whereMatch[1]);
      if (paramIndex !== null) {
        const ids = params[paramIndex - 1] as number[];
        const initialLength = table.length;
        const filtered = table.filter((r) => !ids.includes(r.id));
        table.length = 0;
        table.push(...filtered);
        return { rows: [], rowCount: initialLength - filtered.length, command: 'DELETE', oid: 0, fields: [] };
      }
    }

    // Pour les autres WHERE, on ne supprime rien (simplification)
    return { rows: [], rowCount: 0, command: 'DELETE', oid: 0, fields: [] };
  }

  /**
   * Gère les COUNT
   */
  private handleCount(sql: string, params: unknown[]): QueryResult {
    const match = sql.match(
      /SELECT\s+COUNT\(.+?\)\s+as\s+count\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?\s*$/i
    );

    if (!match) {
      throw new Error(`Invalid COUNT SQL: ${sql}`);
    }

    const [, tableName, whereClause] = match;

    if (!this.tables.has(tableName)) {
      return { rows: [{ count: '0' }] as QueryResultRow[], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
    }

    let rows = this.tables.get(tableName)!;

    if (whereClause) {
      rows = this.applyWhere(rows, whereClause, params);
    }

    return {
      rows: [{ count: String(rows.length) }] as QueryResultRow[],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    };
  }

  /**
   * Applique une clause WHERE
   */
  private applyWhere(
    rows: RecordData[],
    whereClause: string,
    params: unknown[]
  ): RecordData[] {
    // Parser les conditions simples
    const conditions = whereClause.split(' AND ').map((c) => c.trim());

    return rows.filter((row) => {
      return conditions.every((condition) => {
        // Pattern: field = $1, field != $2, field = ANY($1), etc.
        const anyMatch = condition.match(/^(\w+)\s*=\s*ANY\((\$\d+)\)$/i);
        if (anyMatch) {
          const [, field, paramExpr] = anyMatch;
          const paramIndex = this.extractParamIndex(paramExpr);
          if (paramIndex !== null) {
            const valueArray = params[paramIndex - 1] as unknown[];
            return Array.isArray(valueArray) && valueArray.includes(row[field]);
          }
          return false;
        }

        const match = condition.match(/^(\w+)\s*(=|!=|>|>=|<|<=|LIKE|ILIKE)\s*(\$\d+|[^$]+)$/i);
        if (!match) {
          return true; // Condition non reconnue, on accepte
        }

        const [, field, operator, valueExpr] = match;
        const paramIndex = this.extractParamIndex(valueExpr);
        const value = paramIndex !== null ? params[paramIndex - 1] : this.parseLiteral(valueExpr);

        const fieldValue = row[field];

        switch (operator.toUpperCase()) {
          case '=':
            return fieldValue === value;
          case '!=':
            return fieldValue !== value;
          case '>':
          case '>=':
          case '<':
          case '<=': {
            // Gérer les comparaisons de dates (format YYYY-MM-DD) et de nombres
            let a: number | string = fieldValue as number | string;
            let b: number | string = value as number | string;

            // Si les valeurs ressemblent à des dates, les comparer comme strings
            const isDateLike = (v: unknown): boolean =>
              typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v);

            if (isDateLike(a) || isDateLike(b)) {
              // Comparaison de chaînes pour les dates ISO
              a = String(a);
              b = String(b);
            } else {
              // Comparaison numérique
              a = Number(a);
              b = Number(b);
            }

            switch (operator.toUpperCase()) {
              case '>': return a > b;
              case '>=': return a >= b;
              case '<': return a < b;
              case '<=': return a <= b;
              default: return true;
            }
          }
          case 'LIKE':
          case 'ILIKE':
            const pattern = String(value).replace(/%/g, '.*').replace(/_/g, '.');
            const regex = new RegExp(`^${pattern}$`, operator === 'ILIKE' ? 'i' : '');
            return regex.test(String(fieldValue || ''));
          default:
            return true;
        }
      });
    });
  }

  /**
   * Applique ORDER BY
   */
  private applyOrderBy(rows: RecordData[], orderBy: string): RecordData[] {
    const parts = orderBy.split(',').map((p) => p.trim());
    const sorted = [...rows];

    sorted.sort((a, b) => {
      for (const part of parts) {
        const match = part.match(/^(\w+)(?:\s+(ASC|DESC))?$/i);
        if (!match) continue;

        const [, field, direction] = match;
        const aVal = a[field];
        const bVal = b[field];

        let comparison = 0;
        if (aVal === bVal) {
          comparison = 0;
        } else if (aVal === null || aVal === undefined) {
          comparison = 1;
        } else if (bVal === null || bVal === undefined) {
          comparison = -1;
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        if (direction?.toUpperCase() === 'DESC') {
          comparison = -comparison;
        }

        if (comparison !== 0) {
          return comparison;
        }
      }
      return 0;
    });

    return sorted;
  }

  /**
   * Extrait l'index d'un paramètre ($1 -> 1)
   */
  private extractParamIndex(placeholder: string): number | null {
    const match = placeholder.match(/\$(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Parse une valeur littérale
   */
  private parseLiteral(value: string): unknown {
    const trimmed = value.trim();
    if (trimmed === 'NULL' || trimmed === 'null') {
      return null;
    }
    if (trimmed === 'true' || trimmed === 'TRUE') {
      return true;
    }
    if (trimmed === 'false' || trimmed === 'FALSE') {
      return false;
    }
    if (trimmed.match(/^-?\d+$/)) {
      return parseInt(trimmed, 10);
    }
    if (trimmed.match(/^-?\d+\.\d+$/)) {
      return parseFloat(trimmed);
    }
    if (trimmed.match(/^['"](.*)['"]$/)) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  }

  /**
   * Réinitialise toutes les tables (pour nettoyer entre les tests)
   */
  reset(): void {
    this.tables.clear();
    this.nextIds.clear();
  }

  /**
   * Ajoute des données de test directement (pour les fixtures)
   */
  seed(tableName: string, records: RecordData[]): void {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, []);
      this.nextIds.set(tableName, 1);
    }

    const table = this.tables.get(tableName)!;
    table.push(...records);

    // Mettre à jour nextId
    const maxId = Math.max(...records.map((r) => r.id || 0), 0);
    const currentNext = this.nextIds.get(tableName) || 1;
    this.nextIds.set(tableName, Math.max(currentNext, maxId + 1));
  }
}
