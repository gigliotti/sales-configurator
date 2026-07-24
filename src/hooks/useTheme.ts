import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'sc:theme';

function getSnapshot(): Theme {
  const attr = document.documentElement.dataset.theme;
  return attr === 'light' ? 'light' : 'dark';
}

function subscribe(callback: () => void): () => void {
  // Reacciona a cambios de tema hechos en otra pestaña.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage no disponible: el tema se mantiene solo en memoria.
  }
}

/**
 * Tema claro/oscuro de la app. El tema inicial lo fija el script inline de
 * index.html (sin parpadeo); este hook lee y alterna ese estado.
 */
export function useTheme(): { theme: Theme; toggleTheme: () => void; setTheme: (t: Theme) => void } {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => 'dark' as Theme);

  const setTheme = useCallback((t: Theme) => {
    applyTheme(t);
    // useSyncExternalStore no observa el atributo directamente: forzamos un
    // evento de storage local para re-renderizar los consumidores.
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: t }));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(getSnapshot() === 'dark' ? 'light' : 'dark');
  }, [setTheme]);

  return { theme, toggleTheme, setTheme };
}
