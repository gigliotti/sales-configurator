import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfiguratorStore, type CatalogComponent } from '../store/useConfiguratorStore';
import { useShallow } from 'zustand/shallow';
import { formatEUR } from '../lib/format';

export const Wizard: React.FC = () => {
  const {
    params,
    setParams,
    projectName,
    clientName,
    clientEmail,
    setProjectMeta,
    loadCatalog,
    catalog,
    recommendedPalletizers,
    fetchRecommendations,
    selectPalletizer,
    loading,
    setStep,
    t,
    isReadOnly,
    language,
  } = useConfiguratorStore(
    useShallow((state) => ({
      params: state.params,
      setParams: state.setParams,
      projectName: state.projectName,
      clientName: state.clientName,
      clientEmail: state.clientEmail,
      setProjectMeta: state.setProjectMeta,
      loadCatalog: state.loadCatalog,
      catalog: state.catalog,
      recommendedPalletizers: state.recommendedPalletizers,
      fetchRecommendations: state.fetchRecommendations,
      selectPalletizer: state.selectPalletizer,
      loading: state.loading,
      setStep: state.setStep,
      t: state.t,
      isReadOnly: state.isReadOnly,
      language: state.language,
    }))
  );

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'project' | 'product' | 'pallet' | 'recommendations'>('project');
  const [selectedPalletizer, setSelectedPalletizer] = useState<CatalogComponent | null>(null);
  const [transportType, setTransportType] = useState<'RODILLO' | 'CADENA'>('RODILLO');

  useEffect(() => {
    // Initial catalog loading
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (catalog.length > 0) {
      fetchRecommendations();
    }
  }, [catalog, params, fetchRecommendations]);

  const handleNextTab = (next: 'project' | 'product' | 'pallet' | 'recommendations') => {
    setActiveTab(next);
  };

  const handleSelectPalletizer = (p: CatalogComponent) => {
    if (isReadOnly) return;
    setSelectedPalletizer(p);
    // Auto-select first compatible transport type
    const defaultTType = p.transport_types.includes('CADENA') ? 'CADENA' : 'RODILLO';
    setTransportType(defaultTType as 'RODILLO' | 'CADENA');
  };

  const handleStartBuilder = () => {
    if (selectedPalletizer) {
      selectPalletizer(selectedPalletizer, transportType);
      navigate('/editor');
    }
  };

  // — Derivación puramente visual del stepper (la lógica de tabs no cambia) —
  const wizardSteps = [
    { key: 'project', label: t('wizard.tab_project', 'Proyecto'), desc: t('wizard.step_project_desc', 'Datos del proyecto y del cliente') },
    { key: 'product', label: t('wizard.tab_product', 'Producto'), desc: t('wizard.step_product_desc', 'Formato, medidas y velocidad') },
    { key: 'pallet', label: t('wizard.tab_pallet', 'Pallet'), desc: t('wizard.step_pallet_desc', 'Pallet, carga y presupuesto') },
    { key: 'recommendations', label: t('wizard.tab_recommendations', 'Propuesta'), desc: t('wizard.step_reco_desc', 'Paletizadora compatible') },
  ];
  const activeStepIndex = wizardSteps.findIndex((s) => s.key === activeTab);
  const sectionEyebrow = activeStepIndex >= 0 ? `0${activeStepIndex + 1} · ${wizardSteps[activeStepIndex].label}` : '';

  // Estilos reutilizables de las filas de spec en las tarjetas de recomendación.
  const recoRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '12px',
    fontSize: '12.5px',
    color: 'hsl(var(--text-secondary))',
  };
  const recoValStyle: React.CSSProperties = { color: 'hsl(var(--text-primary))', fontSize: '12.5px' };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'radial-gradient(circle at center, hsl(var(--bg-secondary)) 0%, hsl(var(--bg-primary)) 100%)',
        padding: '24px',
        overflowY: 'auto',
      }}
    >
      <div
        className="glass-panel glass-panel-glow animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '960px',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
        }}
      >
        {/* Wizard Header */}
        <div
          style={{
            padding: '24px 32px',
            borderBottom: '1px solid hsl(var(--border-color))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--overlay-soft)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button
              className="btn-secondary"
              aria-label={t('wizard.projects_btn', 'Proyectos')}
              onClick={() => {
                setStep('LOBBY');
                navigate('/projects');
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              🏢 {t('wizard.projects_btn', 'Proyectos')}
            </button>
            <div>
              <span className="sc-eyebrow" style={{ color: 'hsl(var(--brand-primary))' }}>
                Verbruggen Palletizing
              </span>
              <h1 className="title-gradient" style={{ fontSize: '24px', marginTop: '4px' }}>
                {t('wizard.title', 'Configurador de Líneas 3D')}
              </h1>
            </div>
          </div>
        </div>

        {/* Wizard Content */}
        <div style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
          {isReadOnly && (
            <div
              style={{
                padding: '12px 16px',
                marginBottom: '20px',
                borderRadius: '6px',
                backgroundColor: 'hsl(var(--brand-primary) / 0.15)',
                border: '1px solid hsl(var(--brand-primary))',
                color: 'hsl(var(--brand-primary))',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              ⚠️ {t('wizard.read_only_warning', 'Vista de Solo Lectura. No se pueden modificar los parámetros de entrada en este modo.')}
            </div>
          )}

          {/* Layout de dos columnas: rail del stepper (izquierda) + contenido del paso (derecha) */}
          <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: '26px', alignItems: 'start' }}>
            {/* — Stepper visual (indicador; la navegación sigue en los botones) — */}
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {wizardSteps.map((step, i) => {
                const done = i < activeStepIndex;
                const active = i === activeStepIndex;
                const cls = 'sc-step' + (done ? ' done' : '') + (active ? ' active' : '');
                return (
                  <li key={step.key} className={cls} aria-current={active ? 'step' : undefined}>
                    <span className="n" aria-hidden="true">{done ? '✓' : i + 1}</span>
                    <div>
                      <div className="lb">{step.label}</div>
                      <div className="ds">{step.desc}</div>
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* — Columna de contenido del paso activo — */}
            <div style={{ minWidth: 0 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'hsl(var(--brand-primary))' }}>
                  <div className="pulse-glow-hover" style={{ display: 'inline-block', fontSize: '18px', fontWeight: 600 }}>
                    {t('wizard.loading_catalog', 'Cargando Catálogo de Componentes...')}
                  </div>
                </div>
              ) : (
                <>
                  {/* Tab 1: Project Metadata */}
                  {activeTab === 'project' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div>
                        <div className="sc-eyebrow">{sectionEyebrow}</div>
                        <h2 style={{ fontSize: '20px', fontWeight: 600, marginTop: '4px' }}>{t('wizard.project_info_title', 'Información del Proyecto y Cliente')}</h2>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label htmlFor="wizard-project-name" style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.project_name', 'Nombre del Proyecto')}</label>
                          <input
                            id="wizard-project-name"
                            className="form-input"
                            type="text"
                            value={projectName}
                            disabled={isReadOnly}
                            onChange={(e) => setProjectMeta(e.target.value, clientName, clientEmail)}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label htmlFor="wizard-client-name" style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.client_name', 'Nombre del Cliente')}</label>
                          <input
                            id="wizard-client-name"
                            className="form-input"
                            type="text"
                            placeholder={t('wizard.client_name_placeholder', 'Ej. Agrícola del Norte')}
                            value={clientName}
                            disabled={isReadOnly}
                            onChange={(e) => setProjectMeta(projectName, e.target.value, clientEmail)}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '50%' }}>
                        <label htmlFor="wizard-client-email" style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.client_email', 'Correo del Cliente')}</label>
                        <input
                          id="wizard-client-email"
                          className="form-input"
                          type="email"
                          placeholder="correo@ejemplo.com"
                          value={clientEmail}
                          disabled={isReadOnly}
                          onChange={(e) => setProjectMeta(projectName, clientName, e.target.value)}
                        />
                      </div>
                      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn-primary" style={{ padding: '10px 24px', borderRadius: '6px' }} onClick={() => handleNextTab('product')}>
                          {t('wizard.next_product_btn', 'Siguiente: Especificación de Producto')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Product Specifications */}
                  {activeTab === 'product' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div>
                        <div className="sc-eyebrow">{sectionEyebrow}</div>
                        <h2 style={{ fontSize: '20px', fontWeight: 600, marginTop: '4px' }}>{t('wizard.product_params_title', 'Parámetros del Producto')}</h2>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label htmlFor="wizard-format-type" style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.format_type', 'Tipo de Formato')}</label>
                          <select
                            id="wizard-format-type"
                            className="form-input form-select"
                            value={params.productType}
                            disabled={isReadOnly}
                            onChange={(e) => setParams({ productType: e.target.value as 'CAJA' | 'BOLSA' })}
                          >
                            <option value="CAJA">{t('product_type.caja_desc', 'Caja (Cajas de cartón, bandejas)')}</option>
                            <option value="BOLSA">{t('product_type.bolsa_desc', 'Bolsa / Saco (Alpiste, papas, cebollas)')}</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label htmlFor="wizard-product-weight" style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.product_weight', 'Peso del Producto (kg)')}</label>
                          <input
                            id="wizard-product-weight"
                            className="form-input"
                            type="number"
                            min="1"
                            max="100"
                            value={params.productWeight}
                            disabled={isReadOnly}
                            onChange={(e) => setParams({ productWeight: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                        <label htmlFor="wizard-product-length" style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.product_dims', 'Dimensiones del Producto (mm)')}</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                          <input
                            id="wizard-product-length"
                            className="form-input"
                            type="number"
                            placeholder={t('specs.length', 'Largo')}
                            aria-label={t('specs.length', 'Largo')}
                            value={params.productLength}
                            disabled={isReadOnly}
                            onChange={(e) => setParams({ productLength: parseInt(e.target.value) || 0 })}
                          />
                          <input
                            id="wizard-product-width"
                            className="form-input"
                            type="number"
                            placeholder={t('specs.width', 'Ancho')}
                            aria-label={t('specs.width', 'Ancho')}
                            value={params.productWidth}
                            disabled={isReadOnly}
                            onChange={(e) => setParams({ productWidth: parseInt(e.target.value) || 0 })}
                          />
                          <input
                            id="wizard-product-height"
                            className="form-input"
                            type="number"
                            placeholder={t('specs.height', 'Alto')}
                            aria-label={t('specs.height', 'Alto')}
                            value={params.productHeight}
                            disabled={isReadOnly}
                            onChange={(e) => setParams({ productHeight: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '50%', marginTop: '10px' }}>
                        <label htmlFor="wizard-desired-speed" style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.required_speed', 'Velocidad Requerida (unidades/minuto)')}</label>
                        <input
                          id="wizard-desired-speed"
                          className="form-input"
                          type="number"
                          min="1"
                          value={params.desiredSpeed}
                          disabled={isReadOnly}
                          onChange={(e) => setParams({ desiredSpeed: parseInt(e.target.value) || 0 })}
                        />
                      </div>

                      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
                        <button className="btn-secondary" style={{ padding: '10px 20px', borderRadius: '6px' }} onClick={() => handleNextTab('project')}>
                          {t('wizard.back_btn', 'Atrás')}
                        </button>
                        <button className="btn-primary" style={{ padding: '10px 24px', borderRadius: '6px' }} onClick={() => handleNextTab('pallet')}>
                          {t('wizard.next_pallet_btn', 'Siguiente: Datos de Palletizado')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Pallet Specifications */}
                  {activeTab === 'pallet' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div>
                        <div className="sc-eyebrow">{sectionEyebrow}</div>
                        <h2 style={{ fontSize: '20px', fontWeight: 600, marginTop: '4px' }}>{t('wizard.pallet_specs_title', 'Especificaciones de Pallet y Línea')}</h2>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label htmlFor="wizard-pallet-length" style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.pallet_dims', 'Dimensiones del Pallet (mm)')}</label>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                              id="wizard-pallet-length"
                              className="form-input"
                              type="number"
                              placeholder={t('specs.length', 'Largo')}
                              aria-label={t('specs.length', 'Largo')}
                              value={params.palletLength}
                              style={{ flex: 1 }}
                              disabled={isReadOnly}
                              onChange={(e) => setParams({ palletLength: parseInt(e.target.value) || 0 })}
                            />
                            <input
                              id="wizard-pallet-width"
                              className="form-input"
                              type="number"
                              placeholder={t('specs.width', 'Ancho')}
                              aria-label={t('specs.width', 'Ancho')}
                              value={params.palletWidth}
                              style={{ flex: 1 }}
                              disabled={isReadOnly}
                              onChange={(e) => setParams({ palletWidth: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label htmlFor="wizard-units-per-layer" style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.units_per_layer', 'Unidades por Capa (Línea Base)')}</label>
                          <input
                            id="wizard-units-per-layer"
                            className="form-input"
                            type="number"
                            value={params.unitsPerLayer}
                            disabled={isReadOnly}
                            onChange={(e) => setParams({ unitsPerLayer: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label htmlFor="wizard-total-height" style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.total_load_height', 'Altura Total de Carga (mm)')}</label>
                          <input
                            id="wizard-total-height"
                            className="form-input"
                            type="number"
                            placeholder="Ej. 1800"
                            value={params.totalPalletHeight}
                            disabled={isReadOnly}
                            onChange={(e) => setParams({ totalPalletHeight: parseInt(e.target.value) || 0 })}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label htmlFor="wizard-max-budget" style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.max_budget', 'Presupuesto Estimado (€)')}</label>
                          <input
                            id="wizard-max-budget"
                            className="form-input"
                            type="number"
                            step="1000"
                            value={params.maxBudget}
                            disabled={isReadOnly}
                            onChange={(e) => setParams({ maxBudget: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '50%', marginTop: '10px' }}>
                        <label htmlFor="wizard-preferred-wrap" style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.preferred_wrap', 'Envoltura de Pallet Preferida')}</label>
                        <select
                          id="wizard-preferred-wrap"
                          className="form-input form-select"
                          value={params.preferredWrapType}
                          disabled={isReadOnly}
                          onChange={(e) => setParams({ preferredWrapType: e.target.value as 'RED' | 'FILM' })}
                        >
                          <option value="RED">{t('wrap_type.red_desc', 'Funda Elástica / Red (Stretch Hood)')}</option>
                          <option value="FILM">{t('wrap_type.film_desc', 'Film Estirable Tradicional')}</option>
                        </select>
                      </div>

                      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
                        <button className="btn-secondary" style={{ padding: '10px 20px', borderRadius: '6px' }} onClick={() => handleNextTab('product')}>
                          {t('wizard.back_btn', 'Atrás')}
                        </button>
                        <button
                          className="btn-primary"
                          style={{ padding: '10px 24px', borderRadius: '6px' }}
                          onClick={() => handleNextTab('recommendations')}
                        >
                          {t('wizard.calculate_btn', 'Calcular Propuesta Recomendada')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tab 4: Recommendations & Launch */}
                  {activeTab === 'recommendations' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <div>
                        <div className="sc-eyebrow">{sectionEyebrow}</div>
                        <h2 style={{ fontSize: '20px', fontWeight: 600, marginTop: '4px' }}>{t('wizard.compatible_palletizers_title', 'Palletizadoras V-STACK Compatibles')}</h2>
                        <p style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))', marginTop: '4px' }}>
                          {t(
                            'wizard.recommendations_desc',
                            `En base a la velocidad de ${params.desiredSpeed} u/min, formato ${params.productType} y peso de ${params.productWeight} kg:`,
                            { speed: params.desiredSpeed, productType: params.productType, weight: params.productWeight }
                          )}
                        </p>
                      </div>

                      {recommendedPalletizers.length === 0 ? (
                        <div
                          style={{
                            padding: '32px',
                            textAlign: 'center',
                            backgroundColor: 'hsl(var(--state-error) / 0.05)',
                            border: '1px dashed hsl(var(--state-error))',
                            borderRadius: '8px',
                          }}
                        >
                          <h4 style={{ color: 'hsl(var(--state-error))', fontWeight: 600 }}>{t('wizard.no_recommendations', 'Sin recomendaciones directas')}</h4>
                          <p style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))', marginTop: '6px' }}>
                            {t('wizard.no_recommendations_desc', 'Ninguna paletizadora del catálogo soporta todos los filtros ingresados (dimensiones, velocidad o peso).')}
                          </p>
                          <button
                            className="btn-secondary"
                            style={{ marginTop: '16px', padding: '6px 16px', fontSize: '13px', borderRadius: '4px' }}
                            onClick={() => handleNextTab('product')}
                          >
                            {t('wizard.adjust_filters_btn', 'Ajustar Dimensiones / Velocidad')}
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                            gap: '16px',
                          }}
                        >
                          {recommendedPalletizers.map((p) => {
                            const isSelected = selectedPalletizer?.id === p.id;
                            const isOverBudget = p.price_eur > params.maxBudget;
                            return (
                              <div
                                key={p.id}
                                className={'sc-reco' + (isSelected ? ' sel' : '')}
                                onClick={() => handleSelectPalletizer(p)}
                                style={{ cursor: isReadOnly ? 'not-allowed' : 'pointer' }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                  <h4 style={{ fontSize: '15px', fontWeight: 600 }}>{t(`component.${p.component_type_name}`, p.name)}</h4>
                                  <span className="sc-code">{p.code}</span>
                                </div>

                                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                  <li style={recoRowStyle}>
                                    <span>{t('specs.speed', 'Velocidad')}</span>
                                    <b className="sc-mono" style={recoValStyle}>{p.specs.max_production_rate} u/min</b>
                                  </li>
                                  <li style={recoRowStyle}>
                                    <span>{t('specs.layer_length', 'Largo Capa')}</span>
                                    <b className="sc-mono" style={recoValStyle}>{p.specs.max_layer_length_mm} mm</b>
                                  </li>
                                  <li style={recoRowStyle}>
                                    <span>{t('specs.max_weight', 'Peso máx')}</span>
                                    <b className="sc-mono" style={recoValStyle}>{p.specs.max_weight_large_kg ? `${p.specs.max_weight_large_kg} kg` : '—'}</b>
                                  </li>
                                </ul>

                                <div
                                  style={{
                                    borderTop: '1px solid hsl(var(--border-color))',
                                    paddingTop: '11px',
                                    marginTop: '2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                  }}
                                >
                                  {isOverBudget && (
                                    <span
                                      className="sc-mono"
                                      style={{
                                        fontSize: '10px',
                                        letterSpacing: '0.05em',
                                        textTransform: 'uppercase',
                                        fontWeight: 600,
                                        color: 'hsl(var(--brand-primary))',
                                        background: 'hsl(var(--brand-primary) / 0.1)',
                                        border: '1px solid hsl(var(--brand-primary) / 0.4)',
                                        padding: '3px 8px',
                                        borderRadius: '20px',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      ⚠️ {t('wizard.over_budget', 'Sobre presupuesto')}
                                    </span>
                                  )}
                                  <span className="sc-mono" style={{ fontSize: '17px', fontWeight: 600, marginLeft: 'auto', color: 'hsl(var(--text-primary))' }}>
                                    {p.price_eur ? formatEUR(p.price_eur, language) : t('specs.pending', 'Pendiente')}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Transport Type selection if Palletizer selected */}
                      {selectedPalletizer && (
                        <div
                          className="animate-fade-in"
                          style={{
                            padding: '20px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--fill-faint)',
                            border: '1px solid hsl(var(--border-color))',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            marginTop: '8px',
                          }}
                        >
                          <h4 style={{ fontWeight: 600, fontSize: '15px' }}>{t('wizard.base_transport_type', 'Tipo de Transporte Base de la Línea')}</h4>
                          <p style={{ fontSize: '13px', color: 'hsl(var(--text-muted))' }}>
                            {t('wizard.base_transport_type_desc', 'Define si la línea operará con rodillos o cadenas. Se filtrarán los transportadores de acuerdo a esta elección.')}
                          </p>
                          <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                            {selectedPalletizer.transport_types.includes('RODILLO') && (
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isReadOnly ? 'not-allowed' : 'pointer', fontSize: '14px' }}>
                                <input
                                  type="radio"
                                  name="transportType"
                                  checked={transportType === 'RODILLO'}
                                  disabled={isReadOnly}
                                  onChange={() => setTransportType('RODILLO')}
                                />
                                {t('transport_type.rodillo_desc', 'Transportadores de Rodillos (Rodillo)')}
                              </label>
                            )}
                            {selectedPalletizer.transport_types.includes('CADENA') && (
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isReadOnly ? 'not-allowed' : 'pointer', fontSize: '14px' }}>
                                <input
                                  type="radio"
                                  name="transportType"
                                  checked={transportType === 'CADENA'}
                                  disabled={isReadOnly}
                                  onChange={() => setTransportType('CADENA')}
                                />
                                {t('transport_type.cadena_desc', 'Transportadores de Cadenas (Cadena)')}
                              </label>
                            )}
                          </div>
                        </div>
                      )}

                      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
                        <button className="btn-secondary" style={{ padding: '10px 20px', borderRadius: '6px' }} onClick={() => handleNextTab('pallet')}>
                          {t('wizard.back_btn', 'Atrás')}
                        </button>
                        <button
                          className="btn-primary"
                          disabled={!selectedPalletizer || isReadOnly}
                          style={{
                            padding: '10px 28px',
                            borderRadius: '6px',
                            opacity: (selectedPalletizer && !isReadOnly) ? 1 : 0.5,
                            cursor: (selectedPalletizer && !isReadOnly) ? 'pointer' : 'not-allowed',
                          }}
                          onClick={handleStartBuilder}
                        >
                          {t('wizard.init_builder_btn', 'Inicializar Constructor 3D')}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
