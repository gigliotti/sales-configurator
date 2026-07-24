import type { ProjectSnapshot } from '../store/useConfiguratorStore';

/** Clave de localStorage donde se persiste el borrador automático. */
export const DRAFT_STORAGE_KEY = 'sc:draft';

/** Estructura del borrador guardado en localStorage. */
export interface DraftPayload {
  snapshot: ProjectSnapshot;
  currentProjectId: string | null;
  savedAt: number;
}

/** Lee y valida el borrador guardado; null si no existe o está corrupto. */
export function readDraft(): DraftPayload | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftPayload;
    if (!parsed || typeof parsed !== 'object' || !parsed.snapshot || typeof parsed.savedAt !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Persiste el borrador en localStorage (best-effort: cuota llena o modo privado se ignoran). */
export function writeDraft(draft: DraftPayload): void {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Cuota llena o modo privado: el autosave es best-effort.
  }
}

/** Elimina el borrador guardado (p. ej. al descartarlo o tras un guardado exitoso). */
export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // localStorage no disponible: nada que limpiar.
  }
}
