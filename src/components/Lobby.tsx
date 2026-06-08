import React, { useEffect, useState } from 'react';
import { useConfiguratorStore } from '../store/useConfiguratorStore';
import { useShallow } from 'zustand/shallow';

export const Lobby: React.FC = () => {
  const {
    setStep,
    loading,
    projectsList,
    favoriteProjectIds,
    activeProfile,
    profiles,
    setActiveProfile,
    loadProfiles,
    loadProjectsList,
    toggleFavoriteProject,
    loadProject,
    deleteProject,
    resetConfiguratorState,
    language,
    setLanguage,
    t,
    login,
    logout,
  } = useConfiguratorStore(
    useShallow((state) => ({
      setStep: state.setStep,
      loading: state.loading,
      projectsList: state.projectsList,
      favoriteProjectIds: state.favoriteProjectIds,
      activeProfile: state.activeProfile,
      profiles: state.profiles,
      setActiveProfile: state.setActiveProfile,
      loadProfiles: state.loadProfiles,
      loadProjectsList: state.loadProjectsList,
      toggleFavoriteProject: state.toggleFavoriteProject,
      loadProject: state.loadProject,
      deleteProject: state.deleteProject,
      resetConfiguratorState: state.resetConfiguratorState,
      language: state.language,
      setLanguage: state.setLanguage,
      t: state.t,
      login: state.login,
      logout: state.logout,
    }))
  );

  const [activeTab, setActiveTab] = useState<'mine' | 'others' | 'favorites'>('mine');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const resolvedTab = !activeProfile
    ? 'others'
    : (activeTab === 'mine' && activeProfile.role === 'client')
      ? 'others'
      : activeTab;

  // Initial load
  useEffect(() => {
    loadProfiles();
    loadProjectsList();
  }, [loadProfiles, loadProjectsList]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const result = await login(email, password);
    if (!result.success) {
      setLoginError(result.error || t('login.failed_error', 'Invalid email or password'));
    }
  };

  const handleCreateNew = () => {
    resetConfiguratorState();
    setStep('WIZARD');
  };

  const handleSelectProject = async (projectId: string) => {
    await loadProject(projectId);
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (window.confirm('¿Estás seguro de que deseas eliminar este proyecto de manera permanente?')) {
      await deleteProject(projectId);
    }
  };

  const handleFavoriteToggle = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    await toggleFavoriteProject(projectId);
  };

  // Filter projects
  const filteredProjects = projectsList.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.client_name && p.client_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.client_email && p.client_email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;

    // Filter by tab ownership
    if (resolvedTab === 'mine') {
      // Must be owner or admin
      if (!activeProfile) return false;
      return p.owner_id === activeProfile.id || activeProfile.role === 'admin';
    } else if (resolvedTab === 'others') {
      // Created by others
      if (!activeProfile) return true; // Anonymous sees all
      if (activeProfile.role === 'admin') return false; // Admin owns all in Tab 1
      return p.owner_id !== activeProfile.id;
    } else if (resolvedTab === 'favorites') {
      // Marked as favorite
      return favoriteProjectIds.includes(p.id);
    }

    return true;
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'radial-gradient(circle at center, #111625 0%, #080a10 100%)',
        padding: '24px',
        color: 'hsl(var(--text-primary))',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        className="glass-panel glass-panel-glow animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '1100px',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Lobby Header */}
        <div
          style={{
            padding: '24px 32px',
            borderBottom: '1px solid hsl(var(--border-color))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.3)',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'hsl(var(--brand-primary))',
                textTransform: 'uppercase',
                letterSpacing: '2px',
              }}
            >
              Verbruggen Assembly configurator
            </span>
            <h1 className="title-gradient" style={{ fontSize: '26px', marginTop: '4px', fontWeight: 700 }}>
              {t('lobby.title', 'Panel de Proyectos Guardados')}
            </h1>
          </div>

          {/* Profile and Language Switchers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Language Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'hsl(var(--text-muted))' }}>
                {language === 'es' ? 'Idioma:' : 'Language:'}
              </span>
              <select
                className="form-input"
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(20,25,40,0.8)',
                  cursor: 'pointer',
                }}
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'es' | 'en')}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>

            {/* Profile Switcher Dropdown */}
            {(!activeProfile || activeProfile.role === 'admin') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'hsl(var(--text-muted))' }}>
                  {t('lobby.active_user', 'Usuario Activo:')}
                </span>
                <select
                  className="form-input"
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    minWidth: '180px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(20,25,40,0.8)',
                  }}
                  value={activeProfile?.id || ''}
                  onChange={(e) => setActiveProfile(e.target.value || null)}
                >
                  <option value="">{t('lobby.anonymous', 'Anónimo / Vista Pública')}</option>
                  {profiles.map((prof) => (
                    <option key={prof.id} value={prof.id}>
                      {prof.name} ({prof.role === 'admin' ? t('role.admin', 'Admin') : t('role.seller', 'Vendedor')})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Lobby Control Bar (Search, Tabs, and Create Button) */}
        {activeProfile && (
          <div
            style={{
              padding: '20px 32px',
              borderBottom: '1px solid hsl(var(--border-color))',
              backgroundColor: 'rgba(0,0,0,0.15)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '20px',
              flexWrap: 'wrap',
            }}
          >
            {/* Tab buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {activeProfile.role !== 'client' && (
                <button
                  className={resolvedTab === 'mine' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '13px' }}
                  onClick={() => setActiveTab('mine')}
                >
                  📁 {t('lobby.tab_mine', 'Mis Proyectos')}
                </button>
              )}
              <button
                className={resolvedTab === 'others' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '13px' }}
                onClick={() => setActiveTab('others')}
              >
                🔍 {t('lobby.tab_others', 'Otros Proyectos')}
              </button>
              {activeProfile.role !== 'client' && (
                <button
                  className={resolvedTab === 'favorites' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '13px' }}
                  onClick={() => setActiveTab('favorites')}
                >
                  ⭐ {t('lobby.tab_favorites', 'Favoritos')} ({favoriteProjectIds.length})
                </button>
              )}
            </div>

            {/* Search Input, New Button & Sign Out Button */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, justifyContent: 'flex-end', maxWidth: '700px' }}>
              <input
                type="text"
                placeholder={t('lobby.search_placeholder', 'Buscar por proyecto, cliente o correo...')}
                className="form-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  maxWidth: '240px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  borderRadius: '6px',
                }}
              />
              <button
                className="btn-primary"
                onClick={handleCreateNew}
                style={{
                  padding: '9px 18px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ➕ {t('lobby.new_quote_btn', 'Nueva Cotización')}
              </button>
              {activeProfile?.role === 'admin' && (
                <button
                  className="btn-secondary"
                  onClick={() => setStep('CATALOG_ADMIN')}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  🛠️ {t('lobby.catalog_admin_btn', 'Administrar Catálogo')}
                </button>
              )}
              <button
                className="btn-secondary"
                onClick={logout}
                style={{
                  padding: '9px 18px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                🚪 {t('lobby.sign_out_btn', 'Cerrar Sesión')}
              </button>
            </div>
          </div>
        )}

        {/* Projects Grid/List or Login Form */}
        <div style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
          {!activeProfile ? (
            <div style={{ maxWidth: '400px', margin: '40px auto', padding: '32px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid hsl(var(--border-color))', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '24px', textAlign: 'center', color: 'hsl(var(--brand-primary))' }}>
                {t('login.title_form', 'Iniciar Sesión')}
              </h2>
              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="email-input" style={{ fontSize: '13px', fontWeight: 500, color: 'hsl(var(--text-muted))' }}>
                    {t('login.email_label', 'Correo Electrónico')}
                  </label>
                  <input
                    id="email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    style={{ padding: '10px 14px', borderRadius: '6px', fontSize: '14px', width: '100%', backgroundColor: 'rgba(20,25,40,0.8)' }}
                    placeholder={t('login.email_placeholder', 'ejemplo@correo.com')}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="password-input" style={{ fontSize: '13px', fontWeight: 500, color: 'hsl(var(--text-muted))' }}>
                    {t('login.password_label', 'Contraseña')}
                  </label>
                  <input
                    id="password-input"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    style={{ padding: '10px 14px', borderRadius: '6px', fontSize: '14px', width: '100%', backgroundColor: 'rgba(20,25,40,0.8)' }}
                    placeholder={t('login.password_placeholder', '••••••••')}
                  />
                </div>
                {loginError && (
                  <div style={{ color: 'hsl(var(--state-error))', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ⚠️ {loginError}
                  </div>
                )}
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '12px', borderRadius: '6px', fontSize: '14px', fontWeight: 600, marginTop: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  {t('login.submit_btn', 'Ingresar')}
                </button>
              </form>
            </div>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'hsl(var(--brand-primary))' }}>
              <div className="pulse-glow-hover" style={{ display: 'inline-block', fontSize: '18px', fontWeight: 600 }}>
                {t('lobby.loading_projects', 'Cargando proyectos desde Supabase...')}
              </div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div
              style={{
                padding: '48px',
                textAlign: 'center',
                backgroundColor: 'rgba(255,255,255,0.01)',
                border: '1px dashed hsl(var(--border-color))',
                borderRadius: '12px',
                color: 'hsl(var(--text-muted))',
              }}
            >
              <h3>{t('lobby.no_projects_found', 'No se encontraron proyectos')}</h3>
              <p style={{ fontSize: '14px', marginTop: '6px' }}>
                {searchQuery 
                  ? t('lobby.no_projects_search_desc', 'Prueba ajustando tu búsqueda.') 
                  : t('lobby.no_projects_create_desc', 'Crea una nueva cotización presionando el botón "Nueva Cotización".')}
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '20px',
              }}
            >
              {filteredProjects.map((p) => {
                const isFavorite = favoriteProjectIds.includes(p.id);
                const isOwner = activeProfile && p.owner_id === activeProfile.id;
                const isAdmin = activeProfile && activeProfile.role === 'admin';
                const showDelete = isOwner || isAdmin;
                const showFavorite = activeProfile && !isOwner; // Can favorite others' projects

                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProject(p.id)}
                    className="glass-panel"
                    style={{
                      padding: '20px',
                      borderRadius: '10px',
                      border: '1px solid hsl(var(--border-color))',
                      backgroundColor: 'hsl(var(--bg-tertiary))',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '180px',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'hsl(var(--brand-primary) / 0.5)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.2)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'hsl(var(--border-color))';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    {/* Project Top Section */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <h3
                          style={{
                            fontSize: '17px',
                            fontWeight: 600,
                            lineHeight: 1.3,
                            color: 'hsl(var(--text-primary))',
                            maxWidth: '80%',
                          }}
                        >
                          {p.name}
                        </h3>
                        
                        {/* Favorites Star Indicator / Toggle */}
                        {showFavorite && (
                          <button
                            onClick={(e) => handleFavoriteToggle(e, p.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              fontSize: '18px',
                              cursor: 'pointer',
                              padding: 0,
                              color: isFavorite ? 'hsl(45, 100%, 50%)' : 'hsl(var(--text-muted))',
                              transition: 'transform 0.1s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                            title={isFavorite ? t('project.remove_favorite', 'Quitar de Favoritos') : t('project.add_favorite', 'Marcar como Favorito')}
                          >
                            {isFavorite ? '★' : '☆'}
                          </button>
                        )}
                      </div>
                      
                      {/* Client info */}
                      <div style={{ fontSize: '13px', color: 'hsl(var(--text-muted))', marginTop: '8px' }}>
                        <div>👤 {t('project.client', 'Cliente')}: {p.client_name || t('project.unspecified', 'Sin especificar')}</div>
                        {p.client_email && <div style={{ fontSize: '12px' }}>✉️ {p.client_email}</div>}
                      </div>
                    </div>

                    {/* Project Bottom Section */}
                    <div style={{ marginTop: '20px', borderTop: '1px solid hsl(var(--border-color))', paddingTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>
                            {t('project.estimated_price', 'Precio Estimado')}
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: 'hsl(var(--brand-secondary))', marginTop: '2px' }}>
                            €{p.total_price_eur ? parseFloat(String(p.total_price_eur)).toLocaleString() : '0'}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {showDelete && (
                            <button
                              onClick={(e) => handleDelete(e, p.id)}
                              style={{
                                background: 'rgba(231, 76, 60, 0.1)',
                                border: '1px solid hsl(var(--state-error))',
                                color: 'hsl(var(--state-error))',
                                padding: '6px 10px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'hsl(var(--state-error))';
                                e.currentTarget.style.color = '#fff';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(231, 76, 60, 0.1)';
                                e.currentTarget.style.color = 'hsl(var(--state-error))';
                              }}
                              title={t('project.delete_title', 'Eliminar Proyecto')}
                            >
                              🗑️
                            </button>
                          )}
                          <button
                            className="btn-primary"
                            style={{
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                            }}
                          >
                            {t('project.load_btn', 'Cargar')} ➡️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Lobby;
