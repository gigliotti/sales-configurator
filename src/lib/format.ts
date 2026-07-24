import type { Language } from '../store/types';

const formatters: Record<Language, Intl.NumberFormat> = {
  es: new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }),
  en: new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }),
};

/** Formatea un importe en euros con separadores del idioma activo: "€1.250.350,5". */
export function formatEUR(value: number | null | undefined, language: Language = 'es'): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return `€${formatters[language].format(amount)}`;
}

/** Convierte a número tolerando strings numéricos de PostgREST ("123.45"). */
export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}
