import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useConfiguratorStore } from '../store/useConfiguratorStore';
import { useShallow } from 'zustand/shallow';
import { DOCS, DEFAULT_DOC_SLUG } from '../docs/manifest';
import { ThemeToggle } from './ui/ThemeToggle';
import { MermaidBlock } from './MermaidBlock';

/**
 * Visor de la documentación del proyecto (README, seguridad, desarrollo,
 * testing, catálogo, base de datos) dentro de la propia app, en /docs.
 * El contenido se inlinea en el bundle en build time (ver src/docs/manifest.ts).
 */
export const DocsViewer: React.FC = () => {
  const { slug: rawSlug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { t, language } = useConfiguratorStore(
    useShallow((state) => ({ t: state.t, language: state.language }))
  );

  const slug = rawSlug || DEFAULT_DOC_SLUG;
  const doc = useMemo(() => DOCS.find((d) => d.slug === slug) ?? DOCS[0], [slug]);

  // Las tablas anchas (p. ej. en catalogo.md) no deben desbordar la página:
  // se envuelven en su propio contenedor con scroll horizontal. Los bloques
  // ```mermaid``` se renderizan como diagrama (MermaidBlock) en lugar de
  // código plano; el resto de los bloques de código sigue el camino normal.
  const markdownComponents = useMemo<Components>(
    () => ({
      table: (props) => (
        <div className="table-wrap">
          <table {...props} />
        </div>
      ),
      pre: ({ node, children, ...rest }) => {
        void node; // solo para excluirlo de ...rest (no es un atributo DOM válido)
        const child = React.Children.only(children) as React.ReactElement<{ className?: string }>;
        const isMermaid = typeof child?.props?.className === 'string' && child.props.className.includes('language-mermaid');
        if (isMermaid) return <>{children}</>;
        return <pre {...rest}>{children}</pre>;
      },
      code: ({ node, className, children, ...rest }) => {
        void node; // solo para excluirlo de ...rest (no es un atributo DOM válido)
        const match = /language-(\w+)/.exec(className || '');
        if (match?.[1] === 'mermaid') {
          return <MermaidBlock code={String(children).replace(/\n$/, '')} />;
        }
        return (
          <code className={className} {...rest}>
            {children}
          </code>
        );
      },
    }),
    []
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '240px 1fr',
        gridTemplateRows: '60px 1fr',
        height: '100vh',
        width: '100vw',
        background: 'hsl(var(--bg-primary))',
        color: 'hsl(var(--text-primary))',
      }}
    >
      {/* Chrome superior, mismo lenguaje visual que el TopBar del editor */}
      <div
        className="glass-panel"
        style={{
          gridColumn: '1 / -1',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '0 16px',
          borderBottom: '1px solid hsl(var(--border-color))',
          background: 'linear-gradient(hsl(var(--bg-tertiary)), hsl(var(--bg-secondary)))',
        }}
      >
        <div className="sc-dots" aria-hidden="true"><i /><i /><i /></div>
        <div className="sc-brand">
          <span className="sq" />
          <b>Verbruggen</b>
          <span>Docs</span>
        </div>
        <div className="sc-vrule" />
        <button className="sc-tab" onClick={() => navigate('/projects')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
          {t('topbar.lobby_panel', 'Panel')}
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ThemeToggle />
        </div>
      </div>

      {/* Índice de documentos */}
      <nav
        style={{
          borderRight: '1px solid hsl(var(--border-color))',
          background: 'hsl(var(--bg-secondary))',
          overflowY: 'auto',
          padding: '16px 12px',
        }}
        aria-label={t('docs.nav_label', 'Documentos')}
      >
        <div className="sc-eyebrow" style={{ padding: '0 8px', marginBottom: '10px' }}>
          {t('docs.title', 'Documentación')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {DOCS.map((d) => {
            const isActive = d.slug === doc.slug;
            return (
              <button
                key={d.slug}
                onClick={() => navigate(`/docs/${d.slug}`)}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  textAlign: 'left',
                  padding: '9px 10px',
                  borderRadius: '6px',
                  border: '1px solid transparent',
                  background: isActive ? 'hsl(var(--bg-tertiary))' : 'transparent',
                  borderColor: isActive ? 'hsl(var(--border-strong))' : 'transparent',
                  color: isActive ? 'hsl(var(--text-primary))' : 'hsl(var(--text-secondary))',
                  fontSize: '13px',
                  fontWeight: isActive ? 650 : 500,
                  cursor: 'pointer',
                }}
              >
                {t(d.titleKey, d.titleFallback)}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Contenido renderizado */}
      <main style={{ overflowY: 'auto', padding: '32px 40px' }}>
        <article className="docs-content" style={{ maxWidth: '860px', margin: '0 auto' }} lang={language}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {doc.content}
          </ReactMarkdown>
        </article>
      </main>
    </div>
  );
};

export default DocsViewer;
