import React from 'react';
import { useConfiguratorStore } from '../store/useConfiguratorStore';

/** True si el foco del evento está en un campo editable (input/textarea/select/contenteditable). */
const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

/**
 * Atajos de teclado del editor 3D. Solo activo mientras el componente que lo
 * usa está montado:
 * - Delete/Backspace: elimina el componente seleccionado (si no es solo lectura).
 * - Ctrl+Z: deshacer. Ctrl+Y o Ctrl+Shift+Z: rehacer.
 * - Escape: deselecciona el componente actual.
 * Se ignoran las pulsaciones cuando el foco está en un campo editable.
 */
export function useEditorShortcuts(): void {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      // Estado más reciente sin re-suscribir el listener en cada cambio.
      const state = useConfiguratorStore.getState();
      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (ctrl && key === 'z' && !e.shiftKey) {
        if (!state.isReadOnly) {
          e.preventDefault();
          state.undo();
        }
        return;
      }

      if ((ctrl && key === 'y') || (ctrl && e.shiftKey && key === 'z')) {
        if (!state.isReadOnly) {
          e.preventDefault();
          state.redo();
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!state.isReadOnly && state.selectedComponentUuid) {
          e.preventDefault();
          state.removeComponentFromScene(state.selectedComponentUuid);
        }
        return;
      }

      if (e.key === 'Escape' && state.selectedComponentUuid) {
        state.selectComponent(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
