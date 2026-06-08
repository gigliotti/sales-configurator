import React, { useEffect } from 'react';
import { useConfiguratorStore } from './store/useConfiguratorStore';
import { Wizard } from './components/Wizard';
import { Lobby } from './components/Lobby';
import { TopBar } from './components/TopBar';
import { ComponentSidebar } from './components/ComponentSidebar';
import { Viewport3D } from './components/Viewport3D';
import { ConfigPanel } from './components/ConfigPanel';

import { CatalogAdminPanel } from './components/CatalogAdminPanel';

export const App: React.FC = () => {
  const { step, activeProfile, setStep, initAuthListener, loadTranslations, isReadOnly, loadSharedProject } = useConfiguratorStore();

  useEffect(() => {
    const unsubscribe = initAuthListener();
    loadTranslations();
    return () => {
      unsubscribe();
    };
  }, [initAuthListener, loadTranslations]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('share');
    if (token) {
      loadSharedProject(token).then((success) => {
        if (success) {
          setStep('EDITOR');
        }
      });
    }
  }, [loadSharedProject, setStep]);

  useEffect(() => {
    if (step === 'CATALOG_ADMIN' && activeProfile?.role !== 'admin') {
      setStep('LOBBY');
    }
  }, [step, activeProfile, setStep]);

  if (step === 'CATALOG_ADMIN') {
    if (activeProfile?.role !== 'admin') {
      return <Lobby />;
    }
    return <CatalogAdminPanel />;
  }

  if (step === 'LOBBY') {
    return <Lobby />;
  }

  if (step === 'WIZARD') {
    return <Wizard />;
  }

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

export default App;
