import React, { useEffect, useState } from 'react';
import { useConfiguratorStore } from '../store/useConfiguratorStore';
import type { ComponentOption } from '../store/useConfiguratorStore';
import { supabase } from '../lib/supabaseClient';

export const ConfigPanel: React.FC = () => {
  const {
    placedComponents,
    selectedComponentUuid,
    selectComponent,
    removeComponentFromScene,
    updateComponentPosition,
    updateComponentRotation,
    toggleComponentOption,
    totalPrice,
    validationWarnings,
    transportType,
    params,
    t,
    isReadOnly,
    replacingComponentUuid,
    setReplacingComponentUuid,
  } = useConfiguratorStore();

  const [dbOptions, setDbOptions] = useState<ComponentOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState<boolean>(false);

  const selectedComp = placedComponents.find((c) => c.uuid === selectedComponentUuid);

  // Fetch options dynamically based on component type and ID
  useEffect(() => {
    if (!selectedComp) {
      return;
    }

    let active = true;
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        let data: ComponentOption[] | null = [];
        
        if (selectedComp.componentType === 'conveyor') {
          // Find transport type ID
          const tName = transportType;
          const { data: tt } = await supabase.from('transport_types').select('id').eq('name', tName).single();
          
          if (tt) {
            const { data: acc } = await supabase
              .from('conveyor_accessories')
              .select('*')
              .eq('transport_type_id', tt.id);
            data = acc as ComponentOption[];
          }
        } else if (selectedComp.componentType === 'infeed') {
          const { data: coup } = await supabase
            .from('infeed_coupling_compatibility')
            .select('*')
            .eq('infeed_id', selectedComp.id);
          data = coup as ComponentOption[];
        } else if (selectedComp.componentType === 'main_frame') {
          const { data: cfg } = await supabase
            .from('main_frame_configurations')
            .select('*')
            .eq('main_frame_id', selectedComp.id);
          data = cfg as ComponentOption[];
        } else if (selectedComp.componentType === 'turn_unit') {
          const { data: cfg } = await supabase
            .from('turn_unit_configurations')
            .select('*')
            .eq('turn_unit_id', selectedComp.id);
          data = cfg as ComponentOption[];
        } else if (selectedComp.componentType === 'wrapper') {
          const { data: cfg } = await supabase
            .from('wrapper_configurations')
            .select('*')
            .eq('wrapper_id', selectedComp.id);
          data = cfg as ComponentOption[];
        }

        if (active) {
          setDbOptions(data || []);
        }
      } catch (err) {
        console.error('Error fetching options:', err);
      } finally {
        if (active) {
          setLoadingOptions(false);
        }
      }
    };

    fetchOptions();

    return () => {
      active = false;
      setDbOptions([]);
    };
  }, [selectedComp, transportType]);

  const handlePositionChange = (axis: 0 | 2, val: number) => {
    if (!selectedComp) return;
    const newPos = [...selectedComp.position] as [number, number, number];
    newPos[axis] = val;
    updateComponentPosition(selectedComp.uuid, newPos);
  };

  const handleRotationChange = (val: number) => {
    if (!selectedComp) return;
    const rad = (val * Math.PI) / 180;
    updateComponentRotation(selectedComp.uuid, [0, rad, 0]);
  };

  const getOptionLabel = (optionType: string, opt: ComponentOption) => {
    if (optionType === 'conveyor_accessory') return opt.name;
    if (optionType === 'infeed_coupling_config') return `${t('config.coupling', 'Acople')}: ${opt.coupling_code}`;
    if (optionType === 'main_frame_config') {
      return `${t('config.variant', 'Variante')}: H${opt.height_mm} ${opt.lower_collar ? '+Collar' : ''} ${opt.integrated_sheet_dispenser ? '+SheetDisp' : ''}`;
    }
    if (optionType === 'turn_unit_config') {
      return `${t('config.brake', 'Freno')}: ${opt.pallet_brake ? t('yes', 'Sí') : t('no', 'No')} | ${t('config.guide', 'Guía')}: ${opt.pallet_guide ? t('yes', 'Sí') : t('no', 'No')}`;
    }
    if (optionType === 'wrapper_config') {
      return `${opt.wrap_type} | ${t('config.paper', 'Papel')}: ${opt.paper_addition ? t('yes', 'Sí') : t('no', 'No')} | ${t('config.seal', 'Sello')}: ${opt.cut_and_seal}`;
    }
    return t('config.option', 'Opción');
  };

  const getWarningTranslation = (message: string) => {
    if (message.includes('Se requiere una Paletizadora')) {
      return t('warning.no_palletizer', 'Se requiere una Paletizadora V-STACK en la línea.');
    }
    if (message.includes('Conflicto: El MainFrame')) {
      return t('warning.mainframe_conflict', 'Conflicto: El MainFrame ya incluye un Sheet Dispenser integrado. Elimina el SheetDispenser externo.');
    }
    if (message.includes('supera el límite del Tube')) {
      return t('warning.tube_manipulator_limit', message);
    }
    if (message.includes('supera el límite del Big')) {
      return t('warning.big_manipulator_limit', message);
    }
    if (message.includes('exclusivos para formato BOLSA')) {
      return t('warning.bolsa_exclusive', 'Los módulos EndOfLine (V-LOAD, V-PACK, V-WEIGH) son exclusivos para formato BOLSA.');
    }
    if (message.includes('supera la capacidad del transportador')) {
      return t('warning.pallet_dim_conveyor_limit', message);
    }
    if (message.includes('supera el límite del envolvedor')) {
      return t('warning.pallet_height_wrapper_limit', message);
    }
    if (message.includes('supera el presupuesto del cliente')) {
      return t('warning.budget_exceeded', message);
    }
    return message;
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
        borderLeft: '1px solid hsl(var(--border-color))',
        backgroundColor: 'hsl(var(--bg-secondary))',
        padding: '20px',
        overflowY: 'auto',
      }}
    >
      {selectedComp ? (
        /* Component Specific Settings */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'hsl(var(--brand-secondary))', fontWeight: 600, textTransform: 'uppercase' }}>
                {t('config.module_details', 'Detalles del Módulo')}
              </span>
              <button
                onClick={() => selectComponent(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'hsl(var(--text-muted))',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
              >
                {t('config.back_btn', 'Volver')}
              </button>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginTop: '4px' }}>
              {selectedComp.componentType ? t(`component.${selectedComp.componentType}`, selectedComp.name) : selectedComp.name}
            </h3>
            {selectedComp.code && (
              <span style={{ fontSize: '11px', color: 'hsl(var(--text-muted))', display: 'block', marginTop: '2px' }}>
                {t('config.erp_code', 'Código ERP')}: {selectedComp.code}
              </span>
            )}
            {!isReadOnly && (
              <div style={{ marginTop: '12px' }}>
                {replacingComponentUuid === selectedComp.uuid ? (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px dashed hsl(var(--brand-primary))',
                      backgroundColor: 'rgba(242, 139, 5, 0.05)',
                      color: 'hsl(var(--brand-primary))',
                      fontSize: '12px',
                      fontWeight: 500,
                      textAlign: 'center',
                    }}
                  >
                    🔍 {t('config.replacing_mode_hint', 'Selecciona un módulo en la barra lateral para reemplazar este componente...')}
                  </div>
                ) : (
                  <button
                    onClick={() => setReplacingComponentUuid(selectedComp.uuid)}
                    className="btn-secondary"
                    style={{
                      width: '100%',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      borderColor: 'hsl(var(--brand-primary))',
                      color: 'hsl(var(--brand-primary))',
                      background: 'rgba(242, 139, 5, 0.02)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s',
                    }}
                  >
                    🔄 {t('config.change_module_btn', 'Cambiar Módulo')}
                  </button>
                )}
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid hsl(var(--border-color))' }} />

          {/* 3D Translation controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', color: 'hsl(var(--text-muted))' }}>
              {t('config.location_3d', 'Ubicación en escena 3D')}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span>{t('config.position_x', 'Posición X (Lateral)')}</span>
                <span>{selectedComp.position[0].toFixed(2)}m</span>
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                step="0.1"
                value={selectedComp.position[0]}
                disabled={isReadOnly}
                onChange={(e) => handlePositionChange(0, parseFloat(e.target.value))}
                style={{ accentColor: 'hsl(var(--brand-primary))', cursor: isReadOnly ? 'not-allowed' : 'ew-resize' }}
              />
            </div>
 
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span>{t('config.position_z', 'Posición Z (Frente/Fondo)')}</span>
                <span>{selectedComp.position[2].toFixed(2)}m</span>
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                step="0.1"
                value={selectedComp.position[2]}
                disabled={isReadOnly}
                onChange={(e) => handlePositionChange(2, parseFloat(e.target.value))}
                style={{ accentColor: 'hsl(var(--brand-primary))', cursor: isReadOnly ? 'not-allowed' : 'ew-resize' }}
              />
            </div>
 
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span>{t('config.rotation_y', 'Rotación Y (Ángulo)')}</span>
                <span>{Math.round((selectedComp.rotation[1] * 180) / Math.PI)}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="90"
                value={Math.round((selectedComp.rotation[1] * 180) / Math.PI) % 360}
                disabled={isReadOnly}
                onChange={(e) => handleRotationChange(parseInt(e.target.value))}
                style={{ accentColor: 'hsl(var(--brand-primary))', cursor: isReadOnly ? 'not-allowed' : 'ew-resize' }}
              />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid hsl(var(--border-color))' }} />

          {/* Configuration / Options */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '10px' }}>
              {t('config.accessories_title', 'Accesorios y Configuraciones')}
            </h4>

            {loadingOptions ? (
              <div style={{ fontSize: '12px', color: 'hsl(var(--brand-primary))' }}>{t('config.loading_acc', 'Cargando accesorios...')}</div>
            ) : dbOptions.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>
                {t('config.no_accessories', 'Este componente no cuenta con accesorios opcionales configurables.')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {dbOptions.map((opt) => {
                  const optionType =
                    selectedComp.componentType === 'conveyor'
                      ? 'conveyor_accessory'
                      : selectedComp.componentType === 'infeed'
                      ? 'infeed_coupling_config'
                      : selectedComp.componentType === 'main_frame'
                      ? 'main_frame_config'
                      : selectedComp.componentType === 'turn_unit'
                      ? 'turn_unit_config'
                      : 'wrapper_config';
                  
                  const isChecked = selectedComp.options.some((o) => o.id === opt.id && o.optionType === optionType);

                  return (
                    <label
                      key={opt.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        backgroundColor: isChecked ? 'rgba(255,255,255,0.03)' : 'transparent',
                        border: '1px solid hsl(var(--border-color))',
                        fontSize: '13px',
                        cursor: isReadOnly ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isReadOnly}
                          onChange={() => toggleComponentOption(selectedComp.uuid, optionType, opt)}
                          style={{ accentColor: 'hsl(var(--brand-primary))', cursor: isReadOnly ? 'not-allowed' : 'pointer' }}
                        />
                        <span style={{ fontSize: '12px', paddingRight: '4px' }}>{getOptionLabel(optionType, opt)}</span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'hsl(var(--brand-primary))', fontWeight: 600 }}>
                        +€{opt.price_eur ? parseFloat(String(opt.price_eur)).toLocaleString() : '0'}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid hsl(var(--border-color))' }} />

          {/* Pricing and Deletion */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'hsl(var(--text-secondary))' }}>{t('config.module_cost', 'Costo del Módulo')}</span>
              <span style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>
                €{selectedComp.totalPrice.toLocaleString()}
              </span>
            </div>
            {!isReadOnly && (
              <button
                onClick={() => removeComponentFromScene(selectedComp.uuid)}
                className="btn-secondary"
                style={{
                  width: '100%',
                  padding: '8px 0',
                  borderRadius: '6px',
                  color: 'hsl(var(--state-error))',
                  borderColor: 'rgba(231, 76, 60, 0.2)',
                  backgroundColor: 'rgba(231, 76, 60, 0.02)',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                🗑️ {t('config.delete_module_btn', 'Eliminar Módulo')}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Project Summary View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'hsl(var(--brand-primary))', fontWeight: 600, textTransform: 'uppercase' }}>
              {t('config.quote_summary', 'Resumen de Cotización')}
            </span>
            <h3 style={{ fontSize: '20px', fontWeight: 600, marginTop: '2px' }}>{t('config.line_details', 'Detalles de la Línea')}</h3>
          </div>

          {/* Global Price display */}
          <div
            style={{
              padding: '20px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, hsl(var(--bg-tertiary)) 0%, rgba(242, 139, 5, 0.05) 100%)',
              border: '1px solid hsl(var(--border-color))',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span style={{ fontSize: '12px', color: 'hsl(var(--text-secondary))' }}>{t('config.total_price_label', 'PRECIO TOTAL ESTIMADO')}</span>
            <span style={{ fontSize: '28px', fontWeight: 700, color: 'hsl(var(--brand-primary))' }}>
              €{totalPrice.toLocaleString()}
            </span>
            <span style={{ fontSize: '11px', color: 'hsl(var(--text-muted))' }}>
              {t('config.budget_limit', 'Presupuesto Límite')}: €{params.maxBudget.toLocaleString()}
            </span>
          </div>

          {/* Validation Warnings list */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', color: 'hsl(var(--text-muted))', letterSpacing: '0.5px' }}>
              {t('config.rules_validations', 'Reglas y Validaciones')} ({validationWarnings.length})
            </h4>

            {validationWarnings.length === 0 ? (
              <div
                style={{
                  padding: '16px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(46, 204, 113, 0.05)',
                  border: '1px solid rgba(46, 204, 113, 0.2)',
                  color: 'hsl(var(--state-success))',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {t('config.all_compatible', '✅ Todos los parámetros y acoplamientos son compatibles.')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {validationWarnings.map((warn, idx) => {
                  const isError = warn.severity === 'error';
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '12px',
                        borderRadius: '6px',
                        backgroundColor: isError ? 'rgba(231, 76, 60, 0.05)' : 'rgba(243, 156, 18, 0.05)',
                        border: `1px solid ${isError ? 'rgba(231, 76, 60, 0.2)' : 'rgba(243, 156, 18, 0.2)'}`,
                        color: isError ? 'hsl(var(--state-error))' : 'hsl(var(--state-warning))',
                        fontSize: '12px',
                        lineHeight: '1.4',
                      }}
                    >
                      {isError ? '🚨 ' : '⚠️ '} {getWarningTranslation(warn.message)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ fontSize: '12px', color: 'hsl(var(--text-muted))', textAlign: 'center' }}>
            {t('config.select_component_hint', 'Selecciona un componente de la escena 3D para ajustar su posición, rotación o accesorios opcionales.')}
          </div>
        </div>
      )}
    </div>
  );
};
export default ConfigPanel;
