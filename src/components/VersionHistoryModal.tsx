import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useConfiguratorStore } from '../store/useConfiguratorStore';
import type { ProjectVersion } from '../store/useConfiguratorStore';
import { Modal, ConfirmDialog } from './ui/Modal';
import { formatEUR } from '../lib/format';

interface VersionHistoryModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Historial de versiones del proyecto actual: lista las instantáneas guardadas
 * (project_versions) y permite restaurar cualquiera de ellas en la escena.
 */
export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ open, onClose }) => {
  const { currentProjectId, projectVersions, loadVersions, restoreSnapshot, t, language } =
    useConfiguratorStore(
      useShallow((state) => ({
        currentProjectId: state.currentProjectId,
        projectVersions: state.projectVersions,
        loadVersions: state.loadVersions,
        restoreSnapshot: state.restoreSnapshot,
        t: state.t,
        language: state.language,
      }))
    );

  const [loading, setLoading] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState<ProjectVersion | null>(null);

  // Al abrir el modal (o cambiar de proyecto con él abierto) arranca en estado de
  // carga: ajuste de estado durante el render comparando con el valor previo.
  const loadKey = open && currentProjectId ? currentProjectId : null;
  const [prevLoadKey, setPrevLoadKey] = useState<string | null>(null);
  if (loadKey !== prevLoadKey) {
    setPrevLoadKey(loadKey);
    if (loadKey) setLoading(true);
  }

  useEffect(() => {
    if (open && currentProjectId) {
      loadVersions(currentProjectId).finally(() => setLoading(false));
    }
  }, [open, currentProjectId, loadVersions]);

  const locale = language === 'es' ? 'es-ES' : 'en-GB';

  const handleConfirmRestore = () => {
    if (versionToRestore) {
      restoreSnapshot(versionToRestore.snapshot);
    }
    setVersionToRestore(null);
    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        title={t('versions.title', 'Historial de Versiones')}
        onClose={onClose}
        maxWidth={520}
      >
        {loading ? (
          <div style={{ fontSize: '13px', color: 'hsl(var(--text-muted))', padding: '12px 0' }}>
            {t('versions.loading', 'Cargando versiones...')}
          </div>
        ) : projectVersions.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'hsl(var(--text-muted))', padding: '12px 0' }}>
            {t('versions.empty', 'No hay versiones guardadas.')}
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '50vh',
              overflowY: 'auto',
            }}
          >
            {projectVersions.map((v) => (
              <div
                key={v.id ?? `${v.project_id}-${v.version}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '10px 12px',
                  border: '1px solid hsl(var(--border-color))',
                  borderRadius: '6px',
                  backgroundColor: 'hsl(var(--bg-tertiary) / 0.5)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>
                    {t('versions.version_label', 'Versión {{version}}', { version: v.version })}
                  </div>
                  <div style={{ fontSize: '11px', color: 'hsl(var(--text-muted))' }}>
                    {v.created_at ? new Date(v.created_at).toLocaleString(locale) : '—'}
                    {' · '}
                    {formatEUR(v.snapshot?.totalPrice, language)}
                  </div>
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => setVersionToRestore(v)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {t('versions.restore_btn', 'Restaurar')}
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={versionToRestore !== null}
        title={t('versions.confirm_restore_title', 'Restaurar versión')}
        message={t(
          'versions.confirm_restore',
          '¿Restaurar la versión {{version}}? La escena actual será reemplazada.',
          { version: versionToRestore?.version ?? '' }
        )}
        confirmLabel={t('modal.accept', 'Aceptar')}
        cancelLabel={t('modal.cancel', 'Cancelar')}
        onConfirm={handleConfirmRestore}
        onCancel={() => setVersionToRestore(null)}
      />
    </>
  );
};

export default VersionHistoryModal;
