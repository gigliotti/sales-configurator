import React, { useEffect, useId, useState } from 'react';
import { useTheme } from '../hooks/useTheme';

interface MermaidBlockProps {
  code: string;
}

// mermaid pesa varios cientos de KB: se carga bajo demanda (una sola vez,
// cacheada en este módulo) y solo cuando /docs realmente muestra un bloque
// ```mermaid; el bundle principal de la app nunca la incluye (ver
// vite.config.ts, chunk 'vendor-mermaid').
let mermaidPromise: Promise<typeof import('mermaid').default> | null = null;
function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((m) => m.default);
  }
  return mermaidPromise;
}

interface Rendered {
  key: string;
  svg: string;
}
interface Failed {
  key: string;
  message: string;
}

/**
 * Renderiza un bloque ```mermaid``` de la documentación como diagrama SVG.
 * El SVG viene de mermaid.render() sobre contenido propio del repositorio
 * (no entrada de usuario en tiempo de ejecución), por eso es seguro
 * inyectarlo directamente.
 */
export const MermaidBlock: React.FC<MermaidBlockProps> = ({ code }) => {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { theme } = useTheme();
  // El diagrama depende del código y del tema (mermaid tiene paletas propias
  // para dark/default); "key" identifica de forma única esa combinación.
  const key = `${theme}::${code}`;

  // Nada de resetear estado al inicio del efecto: el resultado o error
  // "vencen" solo cuando su key no coincide con la key actual, así el efecto
  // nunca hace un setState síncrono, solo dentro de la continuación async.
  const [result, setResult] = useState<Rendered | null>(null);
  const [failure, setFailure] = useState<Failed | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadMermaid()
      .then(async (mermaid) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: theme === 'dark' ? 'dark' : 'default',
        });
        const { svg } = await mermaid.render(`mmd-${rawId}`, code);
        if (!cancelled) setResult({ key, svg });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setFailure({ key, message: err instanceof Error ? err.message : 'Error al renderizar el diagrama' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [code, theme, rawId, key]);

  if (failure && failure.key === key) {
    return (
      <pre className="docs-mermaid-error">
        {failure.message}
        {'\n\n'}
        {code}
      </pre>
    );
  }

  if (!result || result.key !== key) {
    return <div className="docs-mermaid-loading">Renderizando diagrama…</div>;
  }

  return <div className="docs-mermaid" dangerouslySetInnerHTML={{ __html: result.svg }} />;
};

export default MermaidBlock;
