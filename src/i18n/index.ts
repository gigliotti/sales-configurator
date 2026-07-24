// Diccionarios i18n locales (fallback offline de la tabla `translations` de Supabase).
// Prioridad de resolución: overrides (BD) > diccionario local > fallback en código > clave.
import es from './es.json';
import en from './en.json';

export type Language = 'es' | 'en';

export const dictionaries: Record<Language, Record<string, string>> = { es, en };

/**
 * Reemplaza placeholders {{var}} en un texto con los valores provistos.
 * Los placeholders sin valor correspondiente se dejan intactos.
 */
export function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/**
 * Crea la función traductora `t` para un idioma dado.
 * `overrides` son las traducciones cargadas desde la BD (tabla translations),
 * que tienen prioridad sobre el diccionario local.
 */
export function makeTranslator(
  language: Language,
  overrides: Record<string, string>,
): (key: string, fallback?: string, params?: Record<string, string | number>) => string {
  const dictionary = dictionaries[language];
  return (key, fallback, params) => {
    const text = overrides[key] ?? dictionary[key] ?? fallback ?? key;
    return interpolate(text, params);
  };
}
