import React, { useState } from 'react';
import { useConfiguratorStore } from '../store/useConfiguratorStore';

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
  } = useConfiguratorStore();

  const [saving, setSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleBackToWizard = () => {
    setStep('WIZARD');
  };

  const handleBackToLobby = () => {
    setStep('LOBBY');
  };

  const handleSave = async () => {
    if (!activeProfile || activeProfile.role === 'client') {
      setToast({
        type: 'error',
        msg: 'No tienes permisos para guardar. Selecciona un perfil de Vendedor o Admin en el Lobby para poder guardar cotizaciones.',
      });
      setTimeout(() => setToast(null), 5000);
      return;
    }
    setSaving(true);
    setToast(null);
    const res = await saveProject();
    setSaving(false);
    if (res.success) {
      setToast({ type: 'success', msg: '¡Cotización guardada exitosamente en Supabase!' });
    } else {
      setToast({ type: 'error', msg: `Error al guardar: ${res.error}` });
    }
    setTimeout(() => setToast(null), 4000);
  };

  const handleExportPDF = async () => {
    try {
      // 1. Get 3D Canvas screenshot
      const canvas = document.querySelector('canvas');
      let imgData = '';
      if (canvas) {
        imgData = canvas.toDataURL('image/png');
      }

      // 2. Initialize PDF (A4 Page, Portrait)
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      // Colors
      const primaryColor = [242, 139, 5]; // Orange HSL(24, 95%, 52%)
      const darkColor = [11, 15, 25];

      // Header Bar
      doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.rect(0, 0, 210, 25, 'F');

      // Header Brand text
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('VERBRUGGEN PALLETIZING', 15, 16);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('CONFIGURADOR DE VENTAS 3D', 145, 16);

      // Quote Title & Metadata
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('COTIZACIÓN DE LÍNEA DE PALETIZADO', 15, 40);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Proyecto: ${projectName}`, 15, 48);
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 15, 53);
      
      // Client Details block
      doc.setFillColor(245, 247, 250);
      doc.rect(120, 35, 75, 22, 'F');
      doc.setTextColor(50, 50, 50);
      doc.setFont('Helvetica', 'bold');
      doc.text('Detalles del Cliente:', 125, 41);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Nombre: ${clientName || 'N/A'}`, 125, 46);
      doc.text(`Email: ${clientEmail || 'N/A'}`, 125, 51);

      // Render 3D Viewport screenshot (placed in the middle of page)
      if (imgData) {
        doc.setFillColor(235, 240, 245);
        doc.rect(15, 60, 180, 80, 'F'); // Background container box for image
        doc.addImage(imgData, 'PNG', 15, 60, 180, 80);
      }

      // Parameters list
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('Parámetros de Entrada del Cliente:', 15, 148);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(70, 70, 70);
      doc.text(`• Formato Producto: ${params.productType}`, 15, 154);
      doc.text(`• Medidas Producto: ${params.productLength}x${params.productWidth}x${params.productHeight} mm`, 15, 159);
      doc.text(`• Peso Producto: ${params.productWeight} kg`, 15, 164);
      doc.text(`• Velocidad Requerida: ${params.desiredSpeed} u/min`, 15, 169);
      doc.text(`• Dimensiones Pallet: ${params.palletLength}x${params.palletWidth} mm`, 110, 154);
      doc.text(`• Unidades / Capa: ${params.unitsPerLayer}`, 110, 159);
      doc.text(`• Altura Carga: ${params.totalPalletHeight} mm`, 110, 164);
      doc.text(`• Envoltura: ${params.preferredWrapType}`, 110, 169);

      // Components table
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('Desglose de Módulos Seleccionados:', 15, 180);

      // Table headers
      doc.setFillColor(240, 240, 240);
      doc.rect(15, 184, 180, 6, 'F');
      doc.setFontSize(8);
      doc.text('Módulo / Componente', 18, 188);
      doc.text('Código ERP', 75, 188);
      doc.text('Ubicación', 110, 188);
      doc.text('Opciones / Accesorios', 135, 188);
      doc.text('Subtotal', 180, 188);

      let yOffset = 194;
      lines.forEach((line, idx) => {
        const lineComponents = placedComponents.filter((c) => c.lineId === line.id || (!c.lineId && idx === 0));
        if (lineComponents.length === 0) return;

        // Print Line name header
        if (yOffset > 265) {
          doc.addPage();
          yOffset = 20;
        }
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(line.name, 15, yOffset);
        yOffset += 5;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(70, 70, 70);

        lineComponents.forEach((c) => {
          if (yOffset > 275) {
            doc.addPage();
            yOffset = 20;
          }
          
          doc.text(c.name, 18, yOffset);
          doc.text(c.code || '-', 75, yOffset);
          
          let locName = 'Infeed';
          if (c.locationId === 0) locName = 'Pallet Infeed';
          else if (c.locationId === 1) locName = 'Pallet Outfeed';
          doc.text(locName, 110, yOffset);

          const optionsSummary = c.options.map((o) => o.name).join(', ') || 'Ninguno';
          const croppedOpts = optionsSummary.length > 22 ? optionsSummary.substring(0, 22) + '...' : optionsSummary;
          doc.text(croppedOpts, 135, yOffset);

          doc.text(`€${c.totalPrice.toLocaleString()}`, 180, yOffset);
          
          // Draw thin border line
          doc.setDrawColor(230, 230, 230);
          doc.line(15, yOffset + 2, 195, yOffset + 2);
          yOffset += 6;
        });

        yOffset += 4;
      });

      // Total pricing footer
      if (yOffset > 270) {
        doc.addPage();
        yOffset = 20;
      }
      doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.rect(15, yOffset, 180, 10, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('PRECIO TOTAL ESTIMADO (Euros):', 20, yOffset + 6.5);
      doc.text(`EUR €${totalPrice.toLocaleString()}`, 160, yOffset + 6.5);

      // Save PDF
      const filename = `${projectName.replace(/\s+/g, '_')}_Cotizacion.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        gridColumn: '1 / -1',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: '1px solid hsl(var(--border-color))',
        backgroundColor: 'hsl(var(--bg-secondary))',
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
            backgroundColor: toast.type === 'success' ? 'rgba(46, 204, 113, 0.95)' : 'rgba(231, 76, 60, 0.95)',
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

      {/* Project Meta Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          className="btn-secondary"
          onClick={handleBackToLobby}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          🏢 {t('topbar.lobby_panel', 'Panel')}
        </button>
        {!isReadOnly && (
          <button
            className="btn-secondary"
            onClick={handleBackToWizard}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            ⬅️ {t('topbar.wizard_params', 'Parámetros')}
          </button>
        )}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '15px', fontWeight: 600 }}>{projectName}</h1>
            {isReadOnly && (
              <span
                style={{
                  backgroundColor: 'rgba(242, 139, 5, 0.15)',
                  border: '1px solid hsl(var(--brand-primary))',
                  color: 'hsl(var(--brand-primary))',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                Vista Compartida (Solo Lectura)
              </span>
            )}
          </div>
          <span style={{ fontSize: '11px', color: 'hsl(var(--text-muted))' }}>
            {t('project.client', 'Cliente')}: {clientName || t('project.unspecified', 'Sin especificar')} {clientEmail ? `(${clientEmail})` : ''}
          </span>
        </div>

        {/* Multi-line Switcher & Management */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '24px', borderLeft: '1px solid hsl(var(--border-color))', paddingLeft: '16px' }}>
          <span style={{ fontSize: '12px', color: 'hsl(var(--text-muted))' }}>
            {t('topbar.line', 'Línea:')}
          </span>
          <select
            className="form-input"
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              borderRadius: '6px',
              backgroundColor: 'rgba(20,25,40,0.8)',
              border: '1px solid hsl(var(--border-color))',
              color: 'hsl(var(--text-primary))',
              cursor: 'pointer',
              minWidth: '150px'
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
                const name = prompt(t('topbar.add_line_prompt', 'Nombre de la nueva línea:'), `Línea de Paletizado ${lines.length + 1}`);
                if (!name) return;
                const format = confirm(t('topbar.add_line_format_confirm', '¿Es para formato CAJA? (Cancelar para BOLSA)')) ? 'CAJA' : 'BOLSA';
                addLine(name, format);
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
                if (activeLineId && confirm(t('topbar.delete_line_confirm', '¿Estás seguro de que deseas eliminar esta línea y todos sus componentes?'))) {
                  deleteLine(activeLineId);
                }
              }}
              style={{
                background: 'rgba(231, 76, 60, 0.1)',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Language selector */}
        <select
          className="form-input"
          style={{
            padding: '6px 10px',
            fontSize: '12px',
            borderRadius: '4px',
            backgroundColor: 'rgba(20,25,40,0.8)',
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

        {!isReadOnly && (
          <button
            className="btn-secondary"
            onClick={clearScene}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '13px',
            }}
          >
            {t('topbar.reset_btn', 'Resetear')}
          </button>
        )}

        <button
          className="btn-secondary"
          onClick={handleExportPDF}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          📄 {t('topbar.export_pdf_btn', 'Exportar PDF')}
        </button>

        {!isReadOnly && currentProjectId && shareToken && (
          <button
            className="btn-secondary"
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}?share=${shareToken}`;
              navigator.clipboard.writeText(url);
              setToast({ type: 'success', msg: '¡Enlace de compartir copiado al portapapeles!' });
              setTimeout(() => setToast(null), 3000);
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            🔗 Copiar enlace de compartir
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
            }}
          >
            {saving ? t('topbar.saving_btn', 'Guardando...') : `💾 ${t('topbar.save_quote_btn', 'Guardar Cotización')}`}
          </button>
        )}
      </div>
    </div>
  );
};
export default TopBar;
