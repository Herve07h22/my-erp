/**
 * Type guards et helpers de validation pour l'ORM
 */

// Validation de base
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

// Validation métier
export function isValidId(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value) && value > 0;
}

export function hasCountProperty(row: unknown): row is { count: string | number } {
  return typeof row === 'object' && row !== null && 'count' in row;
}

// Helpers de conversion sécurisés
export function getString(value: unknown, defaultValue = ''): string {
  return isString(value) ? value : defaultValue;
}

export function getNumber(value: unknown, defaultValue = 0): number {
  return isNumber(value) ? value : defaultValue;
}

export function getBoolean(value: unknown, defaultValue = false): boolean {
  return isBoolean(value) ? value : defaultValue;
}

// Validation de structures
export function isRecordData(value: unknown): value is { id: number; [key: string]: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    isValidId((value as { id: unknown }).id)
  );
}

// Validation pour l'API REST
export function isValidRequestBody(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateRequestBody(body: unknown): Record<string, unknown> {
  if (!isValidRequestBody(body)) {
    throw new Error('Request body must be a valid object');
  }
  return body;
}

// Validation des méthodes d'action
export function isAsyncMethod(obj: object, key: string): boolean {
  const prop = (obj as Record<string, unknown>)[key];
  return typeof prop === 'function';
}
