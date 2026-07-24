import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { useConfiguratorStore } from '../store/useConfiguratorStore';
import type { ProjectStatus } from '../store/useConfiguratorStore';
import { captureScene } from '../lib/sceneCapture';
import { ThemeToggle } from './ui/ThemeToggle';
import { generateQuotePdf } from '../lib/pdfExport';
import { exportBomCsv } from '../lib/csvExport';
import { Modal, ConfirmDialog, PromptDialog } from './ui/Modal';
import { VersionHistoryModal } from './VersionHistoryModal';
import { clearDraft } from '../lib/draftStorage';

const PROJECT_STATUSES: ProjectStatus[] = ['draft', 'sent', 'approved', 'rejected'];

export const TopBar: React.FC = () => {
  const {
    setStep,
    projectName,
    clientName,
    clientEmail,
    placedComponents,
    totalPrice,
    params,
    saveProject,
    clearScene,
    activeProfile,
    language,
    setLanguage,
    t,
    lines,
    activeLineId,
    setActiveLineId,
    addLine,
    deleteLine,
    isReadOnly,
    shareToken,
    currentProjectId,
    projectsList,
    updateProjectStatus,
    duplicateProjectAsNew,
    regenerateShareToken,
    revokeShareToken,
  } = useConfiguratorStore(
    useShallow((state) => ({
      setStep: state.setStep,
      projectName: state.projectName,
      clientName: state.clientName,
      clientEmail: state.clientEmail,
      placedComponents: state.placedComponents,
      totalPrice: state.totalPrice,
      params: state.params,
      saveProject: state.saveProject,
      clearScene: state.clearScene,
      activeProfile: state.activeProfile,
      language: state.language,
      setLanguage: state.setLanguage,
      t: state.t,
      lines: state.lines,
      activeLineId: state.activeLineId,
      setActiveLineId: state.setActiveLineId,
      addLine: state.addLine,
      deleteLine: state.deleteLine,
      isReadOnly: state.isReadOnly,
      shareToken: state.shareToken,
      currentProjectId: state.currentProjectId,
      projectsList: state.projectsList,
      updateProjectStatus: state.updateProjectStatus,
      duplicateProjectAsNew: state.duplicateProjectAsNew,
      regenerateShareToken: state.regenerateShareToken,
      revokeShareToken: state.revokeShareToken,
    }))
  );

  const navigate = useNavigate();

  const [saving, setSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Diálogos y modales
  const [addLineOpen, setAddLineOpen] = useState(false);
  const [addLineFormat, setAddLineFormat] = useState<'CAJA' | 'BOLSA'>('CAJA');
  const [deleteLineOpen, setDeleteLineOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);

  // Estado del proyecto (optimista, por si el proyecto no está en projectsList).
  // Se descarta al cambiar de proyecto: ajuste de estado durante el render
  // comparando con el proyecto previamente renderizado.
  const [localStatus, setLocalStatus] = useState<ProjectStatus | null>(null);
  const [prevProjectId, setPrevProjectId] = useState(currentProjectId);
  if (currentProjectId !== prevProjectId) {
    setPrevProjectId(currentProjectId);
    setLocalStatus(null);
  }

  const remoteStatus = projectsList.find((p) => p.id === currentProjectId)?.status;
  const projectStatus: ProjectStatus =
    localStatus ??
    (PROJECT_STATUSES.includes(remoteStatus as ProjectStatus) ? (remoteStatus as ProjectStatus) : 'draft');

  const showToast = (type: 'success' | 'error', msg: string, ms = 4000) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), ms);
  };

  const handleBackToWizard = () => {
    setStep('WIZARD');
    navigate('/wizard');
  };

  const handleBackToLobby = () => {
    setStep('LOBBY');
    navigate('/projects');
  };

  const handleSave = async () => {
    if (!activeProfile || activeProfile.role === 'client') {
      showToast('error', t('toast.no_permission_save', 'No tienes permisos para guardar este proyecto.'), 5000);
      return;
    }
    setSaving(true);
    setToast(null);
    const res = await saveProject();
    setSaving(false);
    if (res.success) {
      clearDraft();
      showToast('success', t('toast.save_success', 'Cotización guardada correctamente.'));
    } else {
      showToast('error', `${t('toast.save_error', 'Error al guardar la cotización. Inténtalo de nuevo.')} (${res.error})`);
    }
  };

  const handleExportPDF = async () => {
    try {
      const img =
        captureScene({ width: 1600 }) ??
        (document.querySelector('canvas')?.toDataURL('image/png') || '');
      await generateQuotePdf({
        projectName,
        clientName,
        clientEmail,
        params,
        lines,
        placedComponents,
        totalPrice,
        language,
        t,
        image: img || null,
        projectId: currentProjectId,
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      showToast('error', t('toast.pdf_error', 'No se pudo generar el PDF.'));
    }
  };

  const handleExportCSV = () => {
    exportBomCsv({ projectName, lines, placedComponents, t, language });
  };

  const handleStatusChange = async (status: ProjectStatus) => {
    if (!currentProjectId) return;
    setLocalStatus(status);
    const ok = await updateProjectStatus(currentProjectId, status);
    if (!ok) {
      setLocalStatus(null);
      showToast('error', t('toast.status_error', 'No se pudo actualizar el estado (permisos)'));
      return;
    }
    showToast('success', t('toast.status_updated', 'Estado del proyecto actualizado.'));
  };

  const handleDuplicate = () => {
    duplicateProjectAsNew();
    navigate('/editor', { replace: true });
    showToast('success', t('toast.duplicated', 'Proyecto duplicado como copia sin guardar.'));
  };

  const shareUrl = shareToken ? `${window.location.origin}/share/${shareToken}` : '';

  const handleCopyShareLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    showToast('success', t('toast.share_copied', 'Enlace para compartir copiado al portapapeles.'), 3000);
  };

  const handleRegenerateShare = async () => {
    const token = await regenerateShareToken();
    if (token) {
      showToast('success', t('toast.share_regenerated', 'Enlace de compartir regenerado.'));
    } else {
      showToast('error', t('toast.share_error', 'No se pudo actualizar el enlace de compartir.'));
    }
  };

  const handleRevokeShare = async () => {
    setRevokeOpen(false);
    await revokeShareToken();
    showToast('success', t('toast.share_revoked', 'Enlace de compartir revocado.'));
  };

  const smallBtnStyle: React.CSSProperties = {
    padding: '7px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  // Iniciales para el avatar de cuenta (perfil activo o invitado).
  const accountLabel = activeProfile?.name || activeProfile?.email || '';
  const initials =
    accountLabel
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .join('') || '·';

  return (
    <div
      className="glass-panel"
      style={{
        gridColumn: '1 / -1',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        gap: '14px',
        borderBottom: '1px solid hsl(var(--border-color))',
        background: 'linear-gradient(hsl(var(--bg-tertiary)), hsl(var(--bg-secondary)))',
        zIndex: 100,
      }}
    >
      {/* Toast alert system */}
      {toast && (
        <div
          className="animate-fade-in"
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            padding: '12px 20px',
            borderRadius: '6px',
            backgroundColor: toast.type === 'success' ? 'hsl(var(--state-success))' : 'hsl(var(--state-error))',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            zIndex: 1000,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}
        >
          {toast.type === 'success' ? '✅ ' : '❌ '} {toast.msg}
        </div>
      )}

      {/* Chrome de identidad + navegación + meta del proyecto */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        {/* Cue "ventana de app" + wordmark */}
        <div className="sc-dots" aria-hidden="true"><i /><i /><i /></div>
        <div className="sc-brand">
          <span className="sq" />
          <b>Verbruggen</b>
          <span>Assembly · v2</span>
        </div>

        <div className="sc-vrule" />

        {/* Navegación tipo pestaña */}
        <button className="sc-tab" onClick={handleBackToLobby}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" /></svg>
          {t('topbar.lobby_panel', 'Panel')}
        </button>
        {!isReadOnly && (
          <button className="sc-tab" onClick={handleBackToWizard}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
            {t('topbar.wizard_params', 'Parámetros')}
          </button>
        )}

        <div className="sc-vrule" />

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '15px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {projectName}
            </h1>
            {isReadOnly && (
              <span
                style={{
                  backgroundColor: 'hsl(var(--brand-primary) / 0.15)',
                  border: '1px solid hsl(var(--brand-primary))',
                  color: 'hsl(var(--brand-primary))',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                {t('topbar.readonly_badge', 'Vista Compartida (Solo Lectura)')}
              </span>
            )}
          </div>
          <span style={{ fontSize: '11px', color: 'hsl(var(--text-muted))' }}>
            {t('project.client', 'Cliente')}: {clientName || t('project.unspecified', 'Sin especificar')} {clientEmail ? `(${clientEmail})` : ''}
          </span>
        </div>

        {/* Multi-line Switcher & Management */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px', borderLeft: '1px solid hsl(var(--border-color))', paddingLeft: '16px' }}>
          <span style={{ fontSize: '12px', color: 'hsl(var(--text-muted))' }}>
            {t('topbar.line', 'Línea:')}
          </span>
          <select
            className="form-input"
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              borderRadius: '6px',
              backgroundColor: 'hsl(var(--bg-tertiary))',
              border: '1px solid hsl(var(--border-color))',
              color: 'hsl(var(--text-primary))',
              cursor: 'pointer',
              minWidth: '150px',
            }}
            value={activeLineId || ''}
            onChange={(e) => setActiveLineId(e.target.value)}
          >
            {lines.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.productType})
              </option>
            ))}
          </select>

          {!isReadOnly && (
            <button
              className="btn-secondary"
              onClick={() => {
                setAddLineFormat('CAJA');
                setAddLineOpen(true);
              }}
              style={{
                padding: '6px 10px',
                fontSize: '12px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              title={t('topbar.add_line_tooltip', 'Agregar nueva línea')}
            >
              ➕
            </button>
          )}

          {!isReadOnly && lines.length > 1 && (
            <button
              onClick={() => {
                if (activeLineId) setDeleteLineOpen(true);
              }}
              style={{
                background: 'hsl(var(--state-error) / 0.1)',
                border: '1px solid hsl(var(--state-error))',
                color: 'hsl(var(--state-error))',
                padding: '6px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
              title={t('topbar.delete_line_tooltip', 'Eliminar línea activa')}
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* Actions group */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <ThemeToggle />

        {/* Language selector */}
        <select
          className="form-input"
          style={{
            padding: '6px 10px',
            fontSize: '12px',
            borderRadius: '4px',
            backgroundColor: 'hsl(var(--bg-tertiary))',
            cursor: 'pointer',
            border: '1px solid hsl(var(--border-color))',
            color: 'hsl(var(--text-primary))',
          }}
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'es' | 'en')}
        >
          <option value="es">ES</option>
          <option value="en">EN</option>
        </select>

        {/* Project status selector */}
        {!isReadOnly && currentProjectId && (
          <select
            className="form-input"
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              borderRadius: '4px',
              backgroundColor: 'hsl(var(--bg-tertiary))',
              cursor: 'pointer',
              border: '1px solid hsl(var(--border-color))',
              color: 'hsl(var(--text-primary))',
            }}
            value={projectStatus}
            onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
            title={t('topbar.status_label', 'Estado:')}
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`lobby.status_${s}`, s)}
              </option>
            ))}
          </select>
        )}

        {!isReadOnly && (
          <button className="btn-secondary" onClick={() => setResetOpen(true)} style={smallBtnStyle}>
            {t('topbar.reset_btn', 'Resetear')}
          </button>
        )}

        <button className="btn-secondary" onClick={handleExportCSV} style={smallBtnStyle} title={t('export.csv_btn', 'Exportar CSV')}>
          📊 CSV
        </button>

        <button className="btn-secondary" onClick={handleExportPDF} style={smallBtnStyle}>
          📄 {t('topbar.export_pdf_btn', 'Exportar PDF')}
        </button>

        {!isReadOnly && currentProjectId && (
          <button className="btn-secondary" onClick={() => setVersionsOpen(true)} style={smallBtnStyle}>
            🕑 {t('lobby.versions_btn', 'Versiones')}
          </button>
        )}

        {!isReadOnly && currentProjectId && (
          <button className="btn-secondary" onClick={handleDuplicate} style={smallBtnStyle}>
            📄 {t('topbar.duplicate_btn', 'Duplicar')}
          </button>
        )}

        {!isReadOnly && currentProjectId && (
          <button className="btn-secondary" onClick={() => setShareOpen(true)} style={smallBtnStyle}>
            🔗 {t('topbar.share_btn', 'Compartir')}
          </button>
        )}

        {!isReadOnly && (
          <button
            className="btn-primary"
            disabled={saving}
            onClick={handleSave}
            style={{
              padding: '8px 20px',
              borderRadius: '4px',
              fontSize: '13px',
              opacity: saving ? 0.7 : 1,
              cursor: saving ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {saving ? t('topbar.saving_btn', 'Guardando...') : `💾 ${t('topbar.save_quote_btn', 'Guardar Cotización')}`}
          </button>
        )}

        {/* Avatar de cuenta */}
        <div
          className="sc-avatar"
          title={accountLabel || t('lobby.anonymous', 'Invitado / Vista Pública')}
          aria-label={accountLabel || t('lobby.anonymous', 'Invitado / Vista Pública')}
        >
          {initials}
        </div>
      </div>

      {/* ---- Diálogo: agregar línea ---- */}
      <PromptDialog
        open={addLineOpen}
        title={t('modal.add_line_title', 'Agregar nueva línea')}
        label={t('modal.line_name_label', 'Nombre de la línea')}
        defaultValue={t('topbar.new_line_default', 'Línea de Paletizado {{n}}', { n: lines.length + 1 })}
        confirmLabel={t('modal.accept', 'Aceptar')}
        cancelLabel={t('modal.cancel', 'Cancelar')}
        onSubmit={(name) => {
          addLine(name, addLineFormat);
          setAddLineOpen(false);
        }}
        onCancel={() => setAddLineOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: 'hsl(var(--text-secondary))' }}>
            {t('modal.format_question', '¿Qué formato usará esta línea?')}
          </span>
          <div style={{ display: 'flex', gap: '18px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="topbar-line-format"
                value="CAJA"
                checked={addLineFormat === 'CAJA'}
                onChange={() => setAddLineFormat('CAJA')}
              />
              {t('product_type.caja', 'Caja')} (CAJA)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="topbar-line-format"
                value="BOLSA"
                checked={addLineFormat === 'BOLSA'}
                onChange={() => setAddLineFormat('BOLSA')}
              />
              {t('product_type.bolsa', 'Bolsa')} (BOLSA)
            </label>
          </div>
        </div>
      </PromptDialog>

      {/* ---- Diálogo: eliminar línea ---- */}
      <ConfirmDialog
        open={deleteLineOpen}
        title={t('topbar.delete_line_tooltip', 'Eliminar línea activa')}
        message={t('modal.confirm_delete_line', '¿Estás seguro de que deseas eliminar esta línea y todos sus componentes?')}
        confirmLabel={t('modal.accept', 'Aceptar')}
        cancelLabel={t('modal.cancel', 'Cancelar')}
        danger
        onConfirm={() => {
          if (activeLineId) deleteLine(activeLineId);
          setDeleteLineOpen(false);
        }}
        onCancel={() => setDeleteLineOpen(false)}
      />

      {/* ---- Diálogo: resetear escena ---- */}
      <ConfirmDialog
        open={resetOpen}
        title={t('topbar.reset_confirm_title', 'Resetear escena')}
        message={t('topbar.reset_confirm', '¿Deseas resetear la escena? Se eliminarán todos los componentes colocados.')}
        confirmLabel={t('modal.accept', 'Aceptar')}
        cancelLabel={t('modal.cancel', 'Cancelar')}
        danger
        onConfirm={() => {
          clearScene();
          setResetOpen(false);
        }}
        onCancel={() => setResetOpen(false)}
      />

      {/* ---- Modal: compartir proyecto ---- */}
      <Modal
        open={shareOpen}
        title={t('share.title', 'Compartir proyecto')}
        onClose={() => setShareOpen(false)}
        maxWidth={520}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {shareToken ? (
            <>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'hsl(var(--text-secondary))' }}>
                {t('share.link_label', 'Enlace de solo lectura')}
                <input
                  className="form-input"
                  type="text"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.currentTarget.select()}
                />
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn-primary modal-btn" onClick={handleCopyShareLink}>
                  📋 {t('share.copy_btn', 'Copiar enlace')}
                </button>
                <button className="btn-secondary modal-btn" onClick={handleRegenerateShare}>
                  🔄 {t('share.regenerate_btn', 'Regenerar enlace')}
                </button>
                <button className="btn-danger modal-btn" onClick={() => setRevokeOpen(true)}>
                  🚫 {t('share.revoke_btn', 'Revocar')}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '13px', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
                {t('share.no_token', 'No hay un enlace activo. Genera uno nuevo para compartir el proyecto.')}
              </div>
              <div>
                <button className="btn-primary modal-btn" onClick={handleRegenerateShare}>
                  🔄 {t('share.regenerate_btn', 'Regenerar enlace')}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ---- Diálogo: revocar enlace ---- */}
      <ConfirmDialog
        open={revokeOpen}
        title={t('share.revoke_confirm_title', 'Revocar enlace')}
        message={t('share.revoke_confirm', '¿Revocar el enlace de compartir? El enlace actual dejará de funcionar para quienes lo tengan.')}
        confirmLabel={t('share.revoke_btn', 'Revocar')}
        cancelLabel={t('modal.cancel', 'Cancelar')}
        danger
        onConfirm={handleRevokeShare}
        onCancel={() => setRevokeOpen(false)}
      />

      {/* ---- Modal: historial de versiones ---- */}
      <VersionHistoryModal open={versionsOpen} onClose={() => setVersionsOpen(false)} />
    </div>
  );
};
export default TopBar;
