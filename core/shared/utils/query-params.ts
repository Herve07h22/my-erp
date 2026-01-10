/**
 * Utilitaires pour l'extraction type-safe des query parameters
 */

/**
 * Extrait une valeur string d'un query parameter
 * Retourne undefined si la valeur n'est pas une string
 */
export function getQueryString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
}

/**
 * Extrait un nombre entier d'un query parameter
 * Retourne undefined si la valeur n'est pas un nombre valide
 */
export function getQueryInt(value: unknown): number | undefined {
  const str = getQueryString(value);
  if (str === undefined) {
    return undefined;
  }
  const num = parseInt(str, 10);
  return Number.isNaN(num) ? undefined : num;
}

/**
 * Parse un JSON depuis un query parameter de manière sécurisée
 * Retourne la valeur par défaut si le parsing échoue
 */
export function getQueryJSON<T>(value: unknown, defaultValue: T): T {
  const str = getQueryString(value);
  if (str === undefined) {
    return defaultValue;
  }
  try {
    return JSON.parse(str) as T;
  } catch {
    return defaultValue;
  }
}
