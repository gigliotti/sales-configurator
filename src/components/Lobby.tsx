import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfiguratorStore } from '../store/useConfiguratorStore';
import type { ProjectStatus } from '../store/useConfiguratorStore';
import { useShallow } from 'zustand/shallow';
import { ThemeToggle } from './ui/ThemeToggle';
import { ConfirmDialog } from './ui/Modal';
import { formatEUR, toNumber } from '../lib/format';
import { clearDraft, readDraft } from '../lib/draftStorage';
import type { DraftPayload } from '../lib/draftStorage';

const PAGE_SIZE = 12;

// Badges de estado en tokens semánticos (legibles en ambos temas):
// borrador → neutro, enviada → cian blueprint, aprobada → éxito, rechazada → error.
const STATUS_COLORS: Record<ProjectStatus, { bg: string; fg: string; border: string }> = {
  draft: { bg: 'var(--fill-faint)', fg: 'hsl(var(--text-muted))', border: 'hsl(var(--border-strong))' },
  sent: { bg: 'hsl(var(--brand-secondary) / 0.14)', fg: 'hsl(var(--brand-secondary))', border: 'hsl(var(--brand-secondary) / 0.4)' },
  approved: { bg: 'hsl(var(--state-success) / 0.14)', fg: 'hsl(var(--state-success))', border: 'hsl(var(--state-success) / 0.45)' },
  rejected: { bg: 'hsl(var(--state-error) / 0.14)', fg: 'hsl(var(--state-error))', border: 'hsl(var(--state-error) / 0.45)' },
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
        background: 'radial-gradient(circle at center, hsl(var(--bg-secondary)) 0%, hsl(var(--bg-primary)) 100%)',
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
          boxShadow: 'var(--shadow-card)',
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
              backgroundColor: 'hsl(var(--state-warning) / 0.1)',
              borderBottom: '1px solid hsl(var(--state-warning) / 0.35)',
            }}
          >
            <span style={{ fontSize: '13px', color: 'hsl(var(--state-warning))', display: 'flex', alignItems: 'center', gap: '8px' }}>
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

        {/* Barra superior de cuenta (persistente: marca + tema/idioma + cuenta) */}
        <div
          style={{
            padding: '14px 28px',
            borderBottom: '1px solid hsl(var(--border-color))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            backgroundColor: 'var(--overlay-soft)',
          }}
        >
          <div className="sc-eyebrow" style={{ color: 'hsl(var(--brand-primary))' }}>
            Verbruggen Assembly configurator
          </div>

          {/* Theme + Language Switchers + cuenta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <ThemeToggle />
            <span style={{ fontSize: '12px', color: 'hsl(var(--text-muted))' }}>
              {language === 'es' ? 'Idioma:' : 'Language:'}
            </span>
            <select
              className="form-input"
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                borderRadius: '6px',
                backgroundColor: 'hsl(var(--bg-tertiary))',
                cursor: 'pointer',
              }}
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'es' | 'en')}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
            {activeProfile?.role === 'admin' && (
              <button
                className="btn-secondary"
                onClick={() => navigate('/admin')}
                style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}
              >
                {t('lobby.catalog_admin_btn', 'Administrar Catálogo')}
              </button>
            )}
            {activeProfile && (
              <button
                className="btn-secondary"
                onClick={logout}
                style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}
              >
                {t('lobby.sign_out_btn', 'Cerrar Sesión')}
              </button>
            )}
          </div>
        </div>

        {/* Cabecera de la vista: eyebrow + título + acción principal */}
        {activeProfile && (
          <div
            style={{
              padding: '22px 28px 18px',
              borderBottom: '1px solid hsl(var(--border-color))',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: '20px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div className="sc-eyebrow">{language === 'es' ? 'Panel de proyectos' : 'Projects panel'}</div>
              <h1
                className="title-gradient"
                style={{ fontSize: '26px', marginTop: '6px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.15 }}
              >
                {t('lobby.title', 'Panel de Proyectos Guardados')}
              </h1>
              <p style={{ fontSize: '13px', color: 'hsl(var(--text-secondary))', marginTop: '5px' }}>
                {language === 'es'
                  ? 'Gestioná, filtrá y continuá tus cotizaciones guardadas.'
                  : 'Manage, filter and resume your saved quotes.'}
              </p>
            </div>
            <button
              className="btn-primary"
              onClick={handleCreateNew}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t('lobby.new_quote_btn', 'Nueva Cotización')}
            </button>
          </div>
        )}

        {/* Toolbar: búsqueda, filtros de estado y pestañas de propiedad */}
        {activeProfile && (
          <div
            style={{
              padding: '16px 28px',
              borderBottom: '1px solid hsl(var(--border-color))',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label className="sc-search" style={{ flex: '1 1 240px', maxWidth: '360px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder={t('lobby.search_placeholder', 'Buscar por proyecto, cliente o correo...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </label>
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                {([
                  ['all', t('lobby.filter_status_all', 'Todos los estados')],
                  ['draft', t('lobby.status_draft', 'Borrador')],
                  ['sent', t('lobby.status_sent', 'Enviada')],
                  ['approved', t('lobby.status_approved', 'Aprobada')],
                  ['rejected', t('lobby.status_rejected', 'Rechazada')],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className="sc-chipf"
                    aria-pressed={statusFilter === value}
                    onClick={() => setStatusFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pestañas de propiedad (mine/others/favorites) como chips secundarios */}
            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
              {activeProfile.role !== 'client' && (
                <button
                  type="button"
                  className="sc-chipf"
                  aria-pressed={resolvedTab === 'mine'}
                  onClick={() => setActiveTab('mine')}
                >
                  {t('lobby.tab_mine', 'Mis Proyectos')}
                </button>
              )}
              <button
                type="button"
                className="sc-chipf"
                aria-pressed={resolvedTab === 'others'}
                onClick={() => setActiveTab('others')}
              >
                {t('lobby.tab_others', 'Otros Proyectos')}
              </button>
              {activeProfile.role !== 'client' && (
                <button
                  type="button"
                  className="sc-chipf"
                  aria-pressed={resolvedTab === 'favorites'}
                  onClick={() => setActiveTab('favorites')}
                >
                  {t('lobby.tab_favorites', 'Favoritos')} ({favoriteProjectIds.length})
                </button>
              )}
            </div>
          </div>
        )}

        {/* Projects Grid/List or Login Form */}
        <div style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
          {!activeProfile ? (
            <div style={{ maxWidth: '400px', margin: '40px auto', padding: '32px', backgroundColor: 'var(--fill-faint)', border: '1px solid hsl(var(--border-color))', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}>
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
                    style={{ padding: '10px 14px', borderRadius: '6px', fontSize: '14px', width: '100%', backgroundColor: 'hsl(var(--bg-tertiary))' }}
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
                    style={{ padding: '10px 14px', borderRadius: '6px', fontSize: '14px', width: '100%', backgroundColor: 'hsl(var(--bg-tertiary))' }}
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
                backgroundColor: 'var(--fill-faint)',
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
                  gap: '14px',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(258px, 1fr))',
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
                  const updatedLabel = p.updated_at
                    ? new Date(p.updated_at).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '';

                  return (
                    <article
                      key={p.id}
                      className="sc-card"
                      role="button"
                      tabIndex={0}
                      aria-label={p.name}
                      onClick={() => handleSelectProject(p.id)}
                      onKeyDown={(e) => {
                        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          handleSelectProject(p.id);
                        }
                      }}
                    >
                      {/* Estrella de favorito (arriba-derecha) */}
                      {showFavorite && (
                        <button
                          type="button"
                          onClick={(e) => handleFavoriteToggle(e, p.id)}
                          aria-pressed={isFavorite}
                          title={isFavorite ? t('project.remove_favorite', 'Quitar de Favoritos') : t('project.add_favorite', 'Marcar como Favorito')}
                          aria-label={isFavorite ? t('project.remove_favorite', 'Quitar de Favoritos') : t('project.add_favorite', 'Marcar como Favorito')}
                          style={{
                            position: 'absolute',
                            top: '11px',
                            right: '12px',
                            background: 'none',
                            border: 'none',
                            fontSize: '17px',
                            lineHeight: 1,
                            cursor: 'pointer',
                            padding: 0,
                            color: isFavorite ? 'hsl(45, 100%, 50%)' : 'hsl(var(--text-muted))',
                          }}
                        >
                          {isFavorite ? '★' : '☆'}
                        </button>
                      )}

                      {/* Encabezado: nombre + cliente */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <h3
                          style={{
                            fontSize: '15.5px',
                            fontWeight: 700,
                            letterSpacing: '-0.01em',
                            lineHeight: 1.3,
                            color: 'hsl(var(--text-primary))',
                            paddingRight: showFavorite ? '26px' : 0,
                          }}
                        >
                          {p.name}
                        </h3>
                        <div
                          title={p.client_email || undefined}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'hsl(var(--text-secondary))', minWidth: 0 }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                            <rect x="3" y="5" width="18" height="14" rx="2" />
                            <path d="m3 7 9 6 9-6" />
                          </svg>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t('project.client', 'Cliente')}: {p.client_name || t('project.unspecified', 'Sin especificar')}
                          </span>
                        </div>
                      </div>

                      {/* Pie: precio + estado · acciones + meta */}
                      <div
                        style={{
                          marginTop: 'auto',
                          paddingTop: '13px',
                          borderTop: '1px solid hsl(var(--border-color))',
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'space-between',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                          <div className="sc-mono" style={{ fontSize: '19px', fontWeight: 600, color: 'hsl(var(--text-primary))', lineHeight: 1 }}>
                            {formatEUR(toNumber(p.total_price_eur), language)}
                          </div>
                          <span
                            className="sc-pill"
                            style={{ backgroundColor: statusStyle.bg, color: statusStyle.fg, borderColor: statusStyle.border }}
                          >
                            {t(`lobby.status_${status}`, status)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                          {showDelete && (
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, p.id)}
                              title={t('project.delete_title', 'Eliminar Proyecto')}
                              aria-label={t('project.delete_title', 'Eliminar Proyecto')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                padding: 0,
                                background: 'transparent',
                                border: '1px solid hsl(var(--border-color))',
                                borderRadius: '6px',
                                color: 'hsl(var(--text-muted))',
                                cursor: 'pointer',
                                transition: 'var(--transition-fast)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'hsl(var(--state-error))';
                                e.currentTarget.style.borderColor = 'hsl(var(--state-error))';
                                e.currentTarget.style.backgroundColor = 'hsl(var(--state-error) / 0.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'hsl(var(--text-muted))';
                                e.currentTarget.style.borderColor = 'hsl(var(--border-color))';
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                            </button>
                          )}
                          {updatedLabel && (
                            <span className="sc-mono" style={{ fontSize: '10.5px', color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap' }}>
                              {updatedLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
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
