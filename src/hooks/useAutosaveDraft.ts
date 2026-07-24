import { useEffect } from 'react';
import { useConfiguratorStore } from '../store/useConfiguratorStore';
import { writeDraft } from '../lib/draftStorage';
import type { DraftPayload } from '../lib/draftStorage';

const THROTTLE_MS = 2000;

/**
 * Autosave de borrador: mientras el editor está montado, cada cambio en
 * placedComponents/lines/params/projectName/currentProjectId persiste
 * (con throttle de ~2s) un snapshot completo en localStorage vía draftStorage.
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
        savedAt: Date.now(),
      };
      writeDraft(payload);
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
        state.projectName !== prevState.projectName ||
        state.currentProjectId !== prevState.currentProjectId
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
