import React, { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useConfiguratorStore } from './store/useConfiguratorStore';
import { Wizard } from './components/Wizard';
import { Lobby } from './components/Lobby';
import { TopBar } from './components/TopBar';
import { ComponentSidebar } from './components/ComponentSidebar';
import { Viewport3D } from './components/Viewport3D';
import { ConfigPanel } from './components/ConfigPanel';
import { CatalogAdminPanel } from './components/CatalogAdminPanel';
import { useAutosaveDraft } from './hooks/useAutosaveDraft';

/** Layout del editor 3D (TopBar + sidebar + viewport + panel de opciones). */
const EditorLayout: React.FC = () => {
  const isReadOnly = useConfiguratorStore((state) => state.isReadOnly);

  return (
    <div
      className="editor-layout"
      style={isReadOnly ? { gridTemplateColumns: '1fr 340px' } : undefined}
    >
      {/* 1. Header Navigation Bar (Full Width) */}
      <TopBar />

      {/* 2. Left catalog sidebar */}
      <ComponentSidebar />

      {/* 3. Central 3D Canvas Viewport */}
      <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
        <Viewport3D />
      </div>

      {/* 4. Right options & price settings panel */}
      <ConfigPanel />
    </div>
  );
};

/** Ruta /projects: lobby de proyectos. */
const LobbyScreen: React.FC = () => {
  const setStep = useConfiguratorStore((state) => state.setStep);

  useEffect(() => {
    setStep('LOBBY');
  }, [setStep]);

  return <Lobby />;
};

/** Ruta /wizard: asistente de parámetros iniciales. */
const WizardScreen: React.FC = () => {
  const setStep = useConfiguratorStore((state) => state.setStep);

  useEffect(() => {
    setStep('WIZARD');
  }, [setStep]);

  return <Wizard />;
};

/** Rutas /editor y /editor/:projectId: editor 3D con autosave de borrador. */
const EditorScreen: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const setStep = useConfiguratorStore((state) => state.setStep);
  const currentProjectId = useConfiguratorStore((state) => state.currentProjectId);
  const loadProject = useConfiguratorStore((state) => state.loadProject);

  useAutosaveDraft();

  useEffect(() => {
    setStep('EDITOR');
  }, [setStep]);

  useEffect(() => {
    if (projectId && currentProjectId !== projectId) {
      void loadProject(projectId);
    }
  }, [projectId, currentProjectId, loadProject]);

  return <EditorLayout />;
};

/** Ruta /share/:token: vista compartida de solo lectura. */
const ShareScreen: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const setStep = useConfiguratorStore((state) => state.setStep);
  const loadSharedProject = useConfiguratorStore((state) => state.loadSharedProject);
  const t = useConfiguratorStore((state) => state.t);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    loadSharedProject(token).then((success) => {
      if (cancelled) return;
      if (success) {
        setStep('EDITOR');
        setStatus('ready');
      } else {
        setStatus('error');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token, loadSharedProject, setStep]);

  // Sin token no hay nada que cargar: se decide en render, sin tocar estado.
  if (!token || status === 'error') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'radial-gradient(circle at center, #111625 0%, #080a10 100%)',
          color: 'hsl(var(--text-primary))',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '24px',
        }}
      >
        <div
          className="glass-panel animate-fade-in"
          style={{ padding: '40px', borderRadius: '12px', textAlign: 'center', maxWidth: '440px' }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '10px' }}>
            {t('share.error_title', 'No se pudo cargar el proyecto compartido')}
          </h2>
          <p style={{ fontSize: '14px', color: 'hsl(var(--text-muted))', marginBottom: '24px' }}>
            {t('share.error_desc', 'El enlace es inválido o ha expirado.')}
          </p>
          <Link
            to="/projects"
            className="btn-primary"
            style={{ display: 'inline-block', padding: '10px 20px', borderRadius: '6px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}
          >
            {t('share.go_projects', 'Ir a Proyectos')}
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'radial-gradient(circle at center, #111625 0%, #080a10 100%)',
          color: 'hsl(var(--brand-primary))',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div className="pulse-glow-hover" style={{ fontSize: '18px', fontWeight: 600 }}>
          {t('share.loading', 'Cargando proyecto compartido...')}
        </div>
      </div>
    );
  }

  return <EditorLayout />;
};

/** Ruta /admin: panel de catálogo, restringido al rol admin. */
const AdminScreen: React.FC = () => {
  const activeProfile = useConfiguratorStore((state) => state.activeProfile);
  const setStep = useConfiguratorStore((state) => state.setStep);
  const isAdmin = activeProfile?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      setStep('CATALOG_ADMIN');
    }
  }, [isAdmin, setStep]);

  if (!isAdmin) {
    return <Navigate to="/projects" replace />;
  }

  return <CatalogAdminPanel />;
};

export const App: React.FC = () => {
  const initAuthListener = useConfiguratorStore((state) => state.initAuthListener);
  const loadTranslations = useConfiguratorStore((state) => state.loadTranslations);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = initAuthListener();
    void loadTranslations();
    return () => {
      unsubscribe();
    };
  }, [initAuthListener, loadTranslations]);

  // Compatibilidad con enlaces legados: ?share=TOKEN → /share/TOKEN
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('share');
    if (token) {
      navigate(`/share/${token}`, { replace: true });
    }
  }, [location.search, navigate]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/projects" replace />} />
      <Route path="/projects" element={<LobbyScreen />} />
      <Route path="/wizard" element={<WizardScreen />} />
      <Route path="/editor" element={<EditorScreen />} />
      <Route path="/editor/:projectId" element={<EditorScreen />} />
      <Route path="/share/:token" element={<ShareScreen />} />
      <Route path="/admin" element={<AdminScreen />} />
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  );
};

export default App;
