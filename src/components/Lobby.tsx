import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfiguratorStore } from '../store/useConfiguratorStore';
import type { ProjectStatus } from '../store/useConfiguratorStore';
import { useShallow } from 'zustand/shallow';
import { ConfirmDialog } from './ui/Modal';
import { formatEUR, toNumber } from '../lib/format';
import { clearDraft, readDraft } from '../lib/draftStorage';
import type { DraftPayload } from '../lib/draftStorage';

const PAGE_SIZE = 12;

const STATUS_COLORS: Record<ProjectStatus, { bg: string; fg: string; border: string }> = {
  draft: { bg: 'rgba(148, 163, 184, 0.12)', fg: '#94a3b8', border: 'rgba(148, 163, 184, 0.4)' },
  sent: { bg: 'rgba(59, 130, 246, 0.12)', fg: '#60a5fa', border: 'rgba(59, 130, 246, 0.45)' },
  approved: { bg: 'rgba(34, 197, 94, 0.12)', fg: '#4ade80', border: 'rgba(34, 197, 94, 0.45)' },
  rejected: { bg: 'rgba(239, 68, 68, 0.12)', fg: '#f87171', border: 'rgba(239, 68, 68, 0.45)' },
};

function normalizeStatus(status?: string): ProjectStatus {
  return (['draft', 'sent', 'approved', 'rejected'].includes(status || '') ? status : 'draft') as ProjectStatus;
}

export const Lobby: React.FC = () => {
  const {
    loading,
    projectsList,
    favoriteProjectIds,
    activeProfile,
    loadProjectsList,
    toggleFavoriteProject,
    loadProject,
    deleteProject,
    resetConfiguratorState,
    restoreSnapshot,
    language,
    setLanguage,
    t,
    login,
    logout,
  } = useConfiguratorStore(
    useShallow((state) => ({
      loading: state.loading,
      projectsList: state.projectsList,
      favoriteProjectIds: state.favoriteProjectIds,
      activeProfile: state.activeProfile,
      loadProjectsList: state.loadProjectsList,
      toggleFavoriteProject: state.toggleFavoriteProject,
      loadProject: state.loadProject,
      deleteProject: state.deleteProject,
      resetConfiguratorState: state.resetConfiguratorState,
      restoreSnapshot: state.restoreSnapshot,
      language: state.language,
      setLanguage: state.setLanguage,
      t: state.t,
      login: state.login,
      logout: state.logout,
    }))
  );

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'mine' | 'others' | 'favorites'>('mine');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
  const [page, setPage] = useState<number>(1);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftPayload | null>(() => readDraft());

  const resolvedTab = !activeProfile
    ? 'others'
    : (activeTab === 'mine' && activeProfile.role === 'client')
      ? 'others'
      : activeTab;

  // Initial load
  useEffect(() => {
    loadProjectsList();
  }, [loadProjectsList]);

  // Reset pagination when any filter changes (state adjustment during render,
  // comparing against the previously rendered values).
  const [prevFilters, setPrevFilters] = useState({ searchQuery, statusFilter, resolvedTab, projectsList });
  if (
    searchQuery !== prevFilters.searchQuery ||
    statusFilter !== prevFilters.statusFilter ||
    resolvedTab !== prevFilters.resolvedTab ||
    projectsList !== prevFilters.projectsList
  ) {
    setPrevFilters({ searchQuery, statusFilter, resolvedTab, projectsList });
    setPage(1);
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const result = await login(email, password);
    if (!result.success) {
      setLoginError(result.error || t('login.failed_error', 'Invalid email or password'));
    }
  };

  const handleGuestExplore = () => {
    resetConfiguratorState();
    navigate('/wizard');
  };

  const handleCreateNew = () => {
    resetConfiguratorState();
    navigate('/wizard');
  };

  const handleSelectProject = async (projectId: string) => {
    await loadProject(projectId);
    navigate(`/editor/${projectId}`);
  };

  const handleDelete = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setDeleteTargetId(projectId);
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId) {
      await deleteProject(deleteTargetId);
    }
    setDeleteTargetId(null);
  };

  const handleFavoriteToggle = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    await toggleFavoriteProject(projectId);
  };

  const handleDraftContinue = async () => {
    if (!draft) return;
    if (draft.currentProjectId) {
      await loadProject(draft.currentProjectId);
    }
    restoreSnapshot(draft.snapshot);
    navigate('/editor');
  };

  const handleDraftDiscard = () => {
    clearDraft();
    setDraft(null);
  };

  // Filter projects
  const filteredProjects = projectsList.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.client_name && p.client_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.client_email && p.client_email.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Filter by status
    if (statusFilter !== 'all' && normalizeStatus(p.status) !== statusFilter) return false;

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

  // Client-side pagination
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageProjects = filteredProjects.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const draftDate = draft
    ? new Date(draft.savedAt).toLocaleString(language === 'es' ? 'es-ES' : 'en-GB', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : '';

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
        {/* Unsaved Draft Banner */}
        {draft && (
          <div
            style={{
              padding: '12px 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderBottom: '1px solid rgba(245, 158, 11, 0.35)',
            }}
          >
            <span style={{ fontSize: '13px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📝 {t('autosave.banner', 'Tienes un borrador sin guardar del {{date}}', { date: draftDate })}
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn-primary"
                onClick={handleDraftContinue}
                style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}
              >
                {t('autosave.continue', 'Continuar')}
              </button>
              <button
                className="btn-secondary"
                onClick={handleDraftDiscard}
                style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}
              >
                {t('autosave.discard', 'Descartar borrador')}
              </button>
            </div>
          </div>
        )}

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

            {/* Search Input, Status Filter, New Button & Sign Out Button */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, justifyContent: 'flex-end', maxWidth: '760px', flexWrap: 'wrap' }}>
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
              <select
                className="form-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | ProjectStatus)}
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(20,25,40,0.8)',
                  cursor: 'pointer',
                }}
              >
                <option value="all">{t('lobby.filter_status_all', 'Todos los estados')}</option>
                <option value="draft">{t('lobby.status_draft', 'Borrador')}</option>
                <option value="sent">{t('lobby.status_sent', 'Enviada')}</option>
                <option value="approved">{t('lobby.status_approved', 'Aprobada')}</option>
                <option value="rejected">{t('lobby.status_rejected', 'Rechazada')}</option>
              </select>
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
                  onClick={() => navigate('/admin')}
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
              <button
                type="button"
                className="btn-secondary"
                onClick={handleGuestExplore}
                style={{ padding: '12px', borderRadius: '6px', fontSize: '14px', fontWeight: 600, marginTop: '14px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}
              >
                🧪 {t('lobby.guest_btn', 'Explorar como invitado')}
              </button>
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
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '20px',
                }}
              >
                {pageProjects.map((p) => {
                  const isFavorite = favoriteProjectIds.includes(p.id);
                  const isOwner = activeProfile && p.owner_id === activeProfile.id;
                  const isAdmin = activeProfile && activeProfile.role === 'admin';
                  const showDelete = isOwner || isAdmin;
                  const showFavorite = activeProfile && !isOwner; // Can favorite others' projects
                  const status = normalizeStatus(p.status);
                  const statusStyle = STATUS_COLORS[status];

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

                        {/* Status Badge */}
                        <span
                          style={{
                            display: 'inline-block',
                            marginTop: '8px',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.fg,
                            border: `1px solid ${statusStyle.border}`,
                          }}
                        >
                          {t(`lobby.status_${status}`, status)}
                        </span>

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
                              {formatEUR(toNumber(p.total_price_eur), language)}
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

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '14px', marginTop: '24px' }}>
                  <button
                    className="btn-secondary"
                    disabled={safePage <= 1}
                    onClick={() => setPage(safePage - 1)}
                    title={t('lobby.page_prev', 'Página anterior')}
                    aria-label={t('lobby.page_prev', 'Página anterior')}
                    style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '14px', fontWeight: 700, opacity: safePage <= 1 ? 0.4 : 1, cursor: safePage <= 1 ? 'default' : 'pointer' }}
                  >
                    ‹
                  </button>
                  <span style={{ fontSize: '13px', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>
                    {safePage}/{totalPages}
                  </span>
                  <button
                    className="btn-secondary"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(safePage + 1)}
                    title={t('lobby.page_next', 'Página siguiente')}
                    aria-label={t('lobby.page_next', 'Página siguiente')}
                    style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '14px', fontWeight: 700, opacity: safePage >= totalPages ? 0.4 : 1, cursor: safePage >= totalPages ? 'default' : 'pointer' }}
                  >
                    ›
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Project Confirmation */}
      <ConfirmDialog
        open={deleteTargetId !== null}
        title={t('project.delete_title', 'Eliminar Proyecto')}
        message={t('modal.confirm_delete_project', '¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.')}
        confirmLabel={t('modal.delete', 'Eliminar')}
        cancelLabel={t('modal.cancel', 'Cancelar')}
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
export default Lobby;
