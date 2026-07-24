import { useEffect } from 'react';
import { useConfiguratorStore } from '../store/useConfiguratorStore';
import type { ProjectSnapshot } from '../store/useConfiguratorStore';

/** Clave de localStorage donde se persiste el borrador automático. */
export const DRAFT_STORAGE_KEY = 'sc:draft';

const THROTTLE_MS = 2000;

/** Estructura del borrador guardado en localStorage. */
export interface DraftPayload {
  snapshot: ProjectSnapshot;
  currentProjectId: string | null;
  totalPrice: number;
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

/** Elimina el borrador guardado (p. ej. al descartarlo desde el banner). */
export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // localStorage no disponible: nada que limpiar.
  }
}

/**
 * Autosave de borrador: mientras el editor está montado, cada cambio en
 * placedComponents/lines/params/projectName persiste (con throttle de ~2s)
 * un snapshot completo en localStorage bajo 'sc:draft'.
 * No guarda nada en modo solo lectura (isReadOnly).
 */
export function useAutosaveDraft(): void {
  useEffect(() => {
    let timer: number | null = null;
    let lastSavedAt = 0;

    const persist = () => {
      const state = useConfiguratorStore.getState();
      if (state.isReadOnly) return;
      const payload: DraftPayload = {
        snapshot: state.getSnapshot(),
        currentProjectId: state.currentProjectId,
        totalPrice: state.totalPrice,
        savedAt: Date.now(),
      };
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // Cuota llena o modo privado: el autosave es best-effort.
      }
    };

    const schedule = () => {
      if (timer !== null) return; // ya hay un guardado pendiente
      const delay = Math.max(0, THROTTLE_MS - (Date.now() - lastSavedAt));
      timer = window.setTimeout(() => {
        timer = null;
        lastSavedAt = Date.now();
        persist();
      }, delay);
    };

    const unsubscribe = useConfiguratorStore.subscribe((state, prevState) => {
      if (state.isReadOnly) return;
      if (
        state.placedComponents !== prevState.placedComponents ||
        state.lines !== prevState.lines ||
        state.params !== prevState.params ||
        state.projectName !== prevState.projectName
      ) {
        schedule();
      }
    });

    return () => {
      unsubscribe();
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, []);
}
