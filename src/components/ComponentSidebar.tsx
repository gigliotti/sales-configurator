import React, { useState } from 'react';
import { useConfiguratorStore } from '../store/useConfiguratorStore';
import { useShallow } from 'zustand/shallow';

export const ComponentSidebar: React.FC = () => {
  const {
    catalog,
    placedComponents,
    addComponentToScene,
    params,
    transportType,
    infeedCompatibilities,
    mainFrameCompatibilities,
    t,
    activeLineId,
    isReadOnly,
    replacingComponentUuid,
    replaceComponent,
  } = useConfiguratorStore(
    useShallow((state) => ({
      catalog: state.catalog,
      placedComponents: state.placedComponents,
      addComponentToScene: state.addComponentToScene,
      params: state.params,
      transportType: state.transportType,
      infeedCompatibilities: state.infeedCompatibilities,
      mainFrameCompatibilities: state.mainFrameCompatibilities,
      t: state.t,
      activeLineId: state.activeLineId,
      isReadOnly: state.isReadOnly,
      replacingComponentUuid: state.replacingComponentUuid,
      replaceComponent: state.replaceComponent,
    }))
  );

  const [activeLocationTab, setActiveLocationTab] = useState<number>(0); // 0 = Infeed Pallet, 1 = Outfeed Pallet, 2 = Product Infeed, 3 = Otros
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [prevReplacingUuid, setPrevReplacingUuid] = useState<string | null>(null);

  if (replacingComponentUuid !== prevReplacingUuid) {
    setPrevReplacingUuid(replacingComponentUuid);
    if (replacingComponentUuid) {
      const compToReplace = placedComponents.find((c) => c.uuid === replacingComponentUuid);
      if (compToReplace) {
        const targetTab = (compToReplace.locationId === null || compToReplace.locationId > 2 || compToReplace.locationId < 0) ? 3 : compToReplace.locationId;
        if (targetTab !== activeLocationTab) {
          setActiveLocationTab(targetTab);
        }
      }
    }
  }

  if (isReadOnly) return null;

  // Find the selected Palletizer ID in the active line
  const currentLineComponents = placedComponents.filter((c) => c.lineId === activeLineId);
  const placedPalletizer = currentLineComponents.find((c) => c.componentType === 'palletizer');
  const palletizerId = placedPalletizer ? placedPalletizer.id : null;

  // Filter logic
  const filteredCatalog = catalog.filter((comp) => {
    // 1. Filter out palletizers only if one is already placed on the active line (unless we are replacing the palletizer itself)
    const isReplacingPalletizer = placedPalletizer && replacingComponentUuid === placedPalletizer.uuid;
    if (comp.component_type_name === 'palletizer' && placedPalletizer && !isReplacingPalletizer) return false;

    // 2. Filter by Location Tab
    if (activeLocationTab === 3) {
      if (comp.location_id === 0 || comp.location_id === 1 || comp.location_id === 2) return false;
      if (!comp.model_path || !comp.model_path.toLowerCase().endsWith('.glb')) return false;
    } else {
      if (comp.location_id !== activeLocationTab) return false;
    }

    // 3. Filter by Product Type Format (CAJA/BOLSA)
    if (comp.product_types.length > 0 && !comp.product_types.includes(params.productType)) {
      return false;
    }

    // 4. Filter by Transport Type (RODILLO/CADENA)
    // Filter components whose transport types are defined and don't match the current line's transport type
    const hasConveyorTType = comp.transport_types.includes(transportType) || comp.transport_types.includes('NONE');
    if (comp.transport_types.length > 0 && !hasConveyorTType) {
      return false;
    }

    // 5. Filter by infeed-palletizer junction compatibility
    if (comp.component_type_name === 'infeed' && palletizerId) {
      const isCompatible = infeedCompatibilities.some(
        (jc) => jc.infeed_id === comp.id && jc.palletizer_id === palletizerId
      );
      if (!isCompatible) return false;
    }

    // 6. Filter by main_frame-palletizer junction compatibility
    if (comp.component_type_name === 'main_frame' && palletizerId) {
      const isCompatible = mainFrameCompatibilities.some(
        (jc) => jc.main_frame_id === comp.id && jc.palletizer_id === palletizerId
      );
      if (!isCompatible) return false;
    }

    // 7. Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const matchesName = comp.name.toLowerCase().includes(query);
      const matchesCode = comp.code ? comp.code.toLowerCase().includes(query) : false;
      const matchesType = comp.component_type_name ? comp.component_type_name.toLowerCase().includes(query) : false;
      if (!matchesName && !matchesCode && !matchesType) {
        return false;
      }
    }

    return true;
  });

  const getLocationName = (id: number) => {
    if (id === 0) return t('location.pallet_infeed', 'Pallet Infeed');
    if (id === 1) return t('location.pallet_outfeed', 'Pallet Outfeed');
    if (id === 2) return t('location.product_infeed', 'Product Infeed');
    return t('location.others', 'Otros');
  };

  return (
    <div
      className="glass-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '100%',
        minHeight: 0,
        overflow: 'hidden',
        borderRight: '1px solid hsl(var(--border-color))',
        backgroundColor: 'hsl(var(--bg-secondary))',
      }}
    >
      {/* Sidebar Header with Meta info */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid hsl(var(--border-color))',
          backgroundColor: 'rgba(0,0,0,0.1)',
        }}
      >
        <span style={{ fontSize: '11px', color: 'hsl(var(--brand-primary))', fontWeight: 600, textTransform: 'uppercase' }}>
          {t('sidebar.configuring', 'Configurando')}
        </span>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginTop: '2px', wordBreak: 'break-all' }}>
          {placedPalletizer ? placedPalletizer.name : t('sidebar.configurator', 'Configurador')}
        </h2>
        <div style={{ display: 'flex', gap: '12px', marginTop: '10px', fontSize: '12px', color: 'hsl(var(--text-secondary))' }}>
          <div>📦 {t(`product_type.${params.productType.toLowerCase()}`, params.productType)}</div>
          <div>⛓️ {t(`transport_type.${transportType.toLowerCase()}`, transportType)}</div>
          <div>📐 {params.palletLength}x{params.palletWidth}</div>
        </div>
      </div>

      {/* Location Tabs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          backgroundColor: 'rgba(0,0,0,0.15)',
          borderBottom: '1px solid hsl(var(--border-color))',
        }}
      >
        {[0, 1, 2, 3].map((id) => {
          const isActive = activeLocationTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveLocationTab(id)}
              style={{
                padding: '12px 2px',
                background: isActive ? 'hsl(var(--bg-tertiary))' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid hsl(var(--brand-primary))' : '2px solid transparent',
                color: isActive ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
                fontSize: '10px',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {id === 0
                ? t('sidebar.tab_pallet_in', 'Pallet In')
                : id === 1
                ? t('sidebar.tab_pallet_out', 'Pallet Out')
                : id === 2
                ? t('sidebar.tab_product_in', 'Product In')
                : t('sidebar.tab_others', 'Otros')}
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div
        style={{
          padding: '12px 20px 0',
        }}
      >
        <input
          type="text"
          className="form-input"
          placeholder={t('sidebar.search_placeholder', 'Buscar módulo...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            fontSize: '13px',
          }}
        />
      </div>

      {/* Component Catalog List */}
      <div
        className="catalog-list"
        style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {t('sidebar.modules_of', 'Módulos de')} {getLocationName(activeLocationTab)}
        </h3>

        {filteredCatalog.length === 0 ? (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              color: 'hsl(var(--text-muted))',
              fontSize: '13px',
              border: '1px dashed hsl(var(--border-color))',
              borderRadius: '6px',
              marginTop: '10px',
            }}
          >
            {t('sidebar.no_compatible_modules', 'No hay módulos compatibles con esta paletizadora o tipo de transporte.')}
          </div>
        ) : (
          filteredCatalog.map((comp) => (
            <div
              key={comp.id}
              className="pulse-glow-hover"
              style={{
                padding: '14px',
                borderRadius: '8px',
                backgroundColor: 'hsl(var(--bg-tertiary))',
                border: '1px solid hsl(var(--border-color))',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 600, fontSize: '14px', paddingRight: '8px' }}>
                  {comp.component_type_name ? t(`component.${comp.component_type_name}`, comp.name) : comp.name}
                </div>
                {comp.code && (
                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'hsl(var(--text-muted))' }}>
                    {comp.code}
                  </span>
                )}
              </div>

              {/* Specs descriptions */}
              <div style={{ fontSize: '11px', color: 'hsl(var(--text-secondary))', lineHeight: '1.4' }}>
                {comp.component_type_name === 'conveyor' && (
                  <div>📐 {t('specs.length', 'Largo')}: {comp.specs?.conveyor_length_mm || 2000} mm</div>
                )}
                {comp.component_type_name === 'wrapper' && (
                  <div>📦 {t('specs.max_height', 'Altura Máx')}: {comp.specs?.max_wrap_height_mm || 2500} mm</div>
                )}
                {comp.component_type_name === 'turn_unit' && (
                  <div>🔄 {t('specs.rotation', 'Rotación')}: {comp.specs?.rotation_degrees || 90}° ({comp.specs?.rotation_direction || 'CW'})</div>
                )}
                {comp.component_type_name === 'pallet_dispenser' && (
                  <div>📥 {t('specs.capacity', 'Capacidad')}: {comp.specs?.max_stacking_units || 20} pallets</div>
                )}
                {comp.component_type_name === 'sheet_dispenser' && (
                  <div>📄 {t('specs.thickness', 'Espesor')}: {comp.specs?.max_sheet_stack_mm || 650} mm</div>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '4px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(var(--brand-primary))' }}>
                  {comp.price_eur ? `€${comp.price_eur.toLocaleString()}` : '€0.00'}
                </div>
                {replacingComponentUuid ? (
                  <button
                    className="btn-primary"
                    onClick={() => replaceComponent(replacingComponentUuid, comp)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      backgroundColor: 'hsl(var(--brand-primary))',
                      borderColor: 'hsl(var(--brand-primary))',
                    }}
                  >
                    🔄 {t('sidebar.replace_btn', 'Reemplazar')}
                  </button>
                ) : (
                  <button
                    className="btn-primary"
                    onClick={() => addComponentToScene(comp)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    + {t('sidebar.add_btn', 'Agregar')}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default ComponentSidebar;
