/**
 * Utilitaires pour la gestion type-safe des erreurs
 */

/**
 * Type guard pour vérifier si une valeur est une instance d'Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Extrait un message d'erreur de manière type-safe
 * Fonctionne avec Error, string, ou tout objet avec une propriété message
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return String(error);
}

/**
 * Wrapper pour les blocs catch qui retourne un Error
 * Utile pour normaliser les erreurs dans les catch blocks
 */
export function toError(error: unknown): Error {
  if (isError(error)) {
    return error;
  }
  return new Error(getErrorMessage(error));
}
