import React, { useEffect, useState } from 'react';
import { useConfiguratorStore, type CatalogComponent } from '../store/useConfiguratorStore';

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
  } = useConfiguratorStore();

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
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'radial-gradient(circle at center, #111625 0%, #080a10 100%)',
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
            backgroundColor: 'rgba(0,0,0,0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button
              className="btn-secondary"
              onClick={() => setStep('LOBBY')}
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
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'hsl(var(--brand-primary))',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                }}
              >
                Verbruggen Palletizing
              </span>
              <h1 className="title-gradient" style={{ fontSize: '24px', marginTop: '4px' }}>
                {t('wizard.title', 'Configurador de Líneas 3D')}
              </h1>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              fontSize: '14px',
            }}
          >
            {['project', 'product', 'pallet', 'recommendations'].map((tab, idx) => (
              <div
                key={tab}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  backgroundColor: activeTab === tab ? 'hsl(var(--brand-primary) / 0.15)' : 'transparent',
                  border: activeTab === tab ? '1px solid hsl(var(--brand-primary))' : '1px solid transparent',
                  color: activeTab === tab ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
                  fontWeight: activeTab === tab ? 600 : 400,
                  transition: 'all 0.2s',
                }}
              >
                {idx + 1}. {tab === 'project' ? t('wizard.tab_project', 'Proyecto') : tab === 'product' ? t('wizard.tab_product', 'Producto') : tab === 'pallet' ? t('wizard.tab_pallet', 'Pallet') : t('wizard.tab_recommendations', 'Propuesta')}
              </div>
            ))}
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
                backgroundColor: 'rgba(242, 139, 5, 0.15)',
                border: '1px solid hsl(var(--brand-primary))',
                color: 'hsl(var(--brand-primary))',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              ⚠️ {t('wizard.read_only_warning', 'Vista de Solo Lectura. No se pueden modificar los parámetros de entrada en este modo.')}
            </div>
          )}
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
                  <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>{t('wizard.project_info_title', 'Información del Proyecto y Cliente')}</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.project_name', 'Nombre del Proyecto')}</label>
                      <input
                        className="form-input"
                        type="text"
                        value={projectName}
                        disabled={isReadOnly}
                        onChange={(e) => setProjectMeta(e.target.value, clientName, clientEmail)}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.client_name', 'Nombre del Cliente')}</label>
                      <input
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
                    <label style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.client_email', 'Correo del Cliente')}</label>
                    <input
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
                  <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>{t('wizard.product_params_title', 'Parámetros del Producto')}</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.format_type', 'Tipo de Formato')}</label>
                      <select
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
                      <label style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.product_weight', 'Peso del Producto (kg)')}</label>
                      <input
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
                    <label style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.product_dims', 'Dimensiones del Producto (mm)')}</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <input
                        className="form-input"
                        type="number"
                        placeholder={t('specs.length', 'Largo')}
                        value={params.productLength}
                        disabled={isReadOnly}
                        onChange={(e) => setParams({ productLength: parseInt(e.target.value) || 0 })}
                      />
                      <input
                        className="form-input"
                        type="number"
                        placeholder={t('specs.width', 'Ancho')}
                        value={params.productWidth}
                        disabled={isReadOnly}
                        onChange={(e) => setParams({ productWidth: parseInt(e.target.value) || 0 })}
                      />
                      <input
                        className="form-input"
                        type="number"
                        placeholder={t('specs.height', 'Alto')}
                        value={params.productHeight}
                        disabled={isReadOnly}
                        onChange={(e) => setParams({ productHeight: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '50%', marginTop: '10px' }}>
                    <label style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.required_speed', 'Velocidad Requerida (unidades/minuto)')}</label>
                    <input
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
                  <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>{t('wizard.pallet_specs_title', 'Especificaciones de Pallet y Línea')}</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.pallet_dims', 'Dimensiones del Pallet (mm)')}</label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                          className="form-input"
                          type="number"
                          placeholder={t('specs.length', 'Largo')}
                          value={params.palletLength}
                          style={{ flex: 1 }}
                          disabled={isReadOnly}
                          onChange={(e) => setParams({ palletLength: parseInt(e.target.value) || 0 })}
                        />
                        <input
                          className="form-input"
                          type="number"
                          placeholder={t('specs.width', 'Ancho')}
                          value={params.palletWidth}
                          style={{ flex: 1 }}
                          disabled={isReadOnly}
                          onChange={(e) => setParams({ palletWidth: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.units_per_layer', 'Unidades por Capa (Línea Base)')}</label>
                      <input
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
                      <label style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.total_load_height', 'Altura Total de Carga (mm)')}</label>
                      <input
                        className="form-input"
                        type="number"
                        placeholder="Ej. 1800"
                        value={params.totalPalletHeight}
                        disabled={isReadOnly}
                        onChange={(e) => setParams({ totalPalletHeight: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.max_budget', 'Presupuesto Estimado (€)')}</label>
                      <input
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
                    <label style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>{t('wizard.preferred_wrap', 'Envoltura de Pallet Preferida')}</label>
                    <select
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
                    <h2 style={{ fontSize: '20px', fontWeight: 600 }}>{t('wizard.compatible_palletizers_title', 'Palletizadoras V-STACK Compatibles')}</h2>
                    <p style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))', marginTop: '4px' }}>
                      {t('wizard.recommendations_desc', `En base a la velocidad de ${params.desiredSpeed} u/min, formato ${params.productType} y peso de ${params.productWeight} kg:`)}
                    </p>
                  </div>

                  {recommendedPalletizers.length === 0 ? (
                    <div
                      style={{
                        padding: '32px',
                        textAlign: 'center',
                        backgroundColor: 'rgba(231, 76, 60, 0.05)',
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
                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                        gap: '16px',
                      }}
                    >
                      {recommendedPalletizers.map((p) => {
                        const isSelected = selectedPalletizer?.id === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleSelectPalletizer(p)}
                            style={{
                              padding: '20px',
                              borderRadius: '8px',
                              backgroundColor: isSelected ? 'hsl(var(--brand-primary) / 0.05)' : 'hsl(var(--bg-tertiary))',
                              border: isSelected ? '2px solid hsl(var(--brand-primary))' : '1px solid hsl(var(--border-color))',
                              cursor: isReadOnly ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t(`component.${p.component_type_name}`, p.name)}</h3>
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  backgroundColor: 'hsl(var(--brand-primary) / 0.1)',
                                  color: 'hsl(var(--brand-primary))',
                                  fontWeight: 600,
                                }}
                              >
                                {p.code}
                              </span>
                            </div>
                            <div style={{ fontSize: '13px', color: 'hsl(var(--text-secondary))', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div>🚀 {t('specs.speed', 'Velocidad')}: {p.specs.max_production_rate} u/m max</div>
                              <div>📐 {t('specs.layer_length', 'Largo Capa')}: {p.specs.max_layer_length_mm} mm max</div>
                              <div>💰 {t('specs.base_price', 'Precio Base')}: €{p.price_eur ? p.price_eur.toLocaleString() : t('specs.pending', 'Pendiente')}</div>
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
                        backgroundColor: 'rgba(255,255,255,0.02)',
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
  );
};
