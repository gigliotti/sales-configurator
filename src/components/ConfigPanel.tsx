import React, { useEffect, useState } from 'react';
import { useConfiguratorStore } from '../store/useConfiguratorStore';
import type { ComponentOption } from '../store/useConfiguratorStore';
import { useShallow } from 'zustand/shallow';
import { supabase } from '../lib/supabaseClient';
import { formatEUR, toNumber } from '../lib/format';

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
    language,
  } = useConfiguratorStore(
    useShallow((state) => ({
      placedComponents: state.placedComponents,
      selectedComponentUuid: state.selectedComponentUuid,
      selectComponent: state.selectComponent,
      removeComponentFromScene: state.removeComponentFromScene,
      updateComponentPosition: state.updateComponentPosition,
      updateComponentRotation: state.updateComponentRotation,
      toggleComponentOption: state.toggleComponentOption,
      totalPrice: state.totalPrice,
      validationWarnings: state.validationWarnings,
      transportType: state.transportType,
      params: state.params,
      t: state.t,
      isReadOnly: state.isReadOnly,
      replacingComponentUuid: state.replacingComponentUuid,
      setReplacingComponentUuid: state.setReplacingComponentUuid,
      language: state.language,
    }))
  );

  const [dbOptions, setDbOptions] = useState<ComponentOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState<boolean>(false);

  const selectedComp = placedComponents.find((c) => c.uuid === selectedComponentUuid);

  // Primitivos estables para las dependencias del efecto: selectedComp cambia
  // de identidad en cada tick de slider (posición/rotación) y provocaría un
  // refetch a Supabase por cada movimiento.
  const selUuid = selectedComp?.uuid;
  const selId = selectedComp?.id;
  const selType = selectedComp?.componentType;

  // Fetch options dynamically based on component type and ID
  useEffect(() => {
    if (!selUuid) {
      return;
    }

    let active = true;
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        let data: ComponentOption[] | null = [];

        if (selType === 'conveyor') {
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
        } else if (selType === 'infeed') {
          const { data: coup } = await supabase
            .from('infeed_coupling_compatibility')
            .select('*')
            .eq('infeed_id', selId);
          data = coup as ComponentOption[];
        } else if (selType === 'main_frame') {
          const { data: cfg } = await supabase
            .from('main_frame_configurations')
            .select('*')
            .eq('main_frame_id', selId);
          data = cfg as ComponentOption[];
        } else if (selType === 'turn_unit') {
          const { data: cfg } = await supabase
            .from('turn_unit_configurations')
            .select('*')
            .eq('turn_unit_id', selId);
          data = cfg as ComponentOption[];
        } else if (selType === 'wrapper') {
          const { data: cfg } = await supabase
            .from('wrapper_configurations')
            .select('*')
            .eq('wrapper_id', selId);
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
  }, [selUuid, selId, selType, transportType]);

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

  // Derivados de presentación para la caja de presupuesto (solo lectura).
  const budgetPct = params.maxBudget > 0 ? Math.min(100, (totalPrice / params.maxBudget) * 100) : 0;
  const overBudget = totalPrice > params.maxBudget;

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Cabecera del módulo */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <span className="sc-eyebrow">{t('config.module_details', 'Detalles del Módulo')}</span>
              <button
                onClick={() => selectComponent(null)}
                aria-label={t('config.back_btn', 'Volver')}
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
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginTop: '6px' }}>
              {selectedComp.componentType ? t(`component.${selectedComp.componentType}`, selectedComp.name) : selectedComp.name}
            </h3>
            {selectedComp.code && (
              <div className="sc-mono" style={{ fontSize: '11px', color: 'hsl(var(--text-muted))', marginTop: '3px' }}>
                {t('config.erp_code', 'Código ERP')} · {selectedComp.code}
              </div>
            )}
            {!isReadOnly && (
              <div style={{ marginTop: '12px' }}>
                {replacingComponentUuid === selectedComp.uuid ? (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px dashed hsl(var(--brand-primary))',
                      backgroundColor: 'hsl(var(--brand-primary) / 0.05)',
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
                    aria-label={t('config.change_module_btn', 'Cambiar Módulo')}
                    className="btn-secondary"
                    style={{
                      width: '100%',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      borderColor: 'hsl(var(--brand-primary))',
                      color: 'hsl(var(--brand-primary))',
                      background: 'hsl(var(--brand-primary) / 0.02)',
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

          <div className="sc-divider" />

          {/* Controles 3D */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span className="sc-eyebrow">{t('config.location_3d', 'Ubicación en escena 3D')}</span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <label htmlFor="config-position-x" className="sc-eyebrow">{t('config.position_x', 'Posición X (Lateral)')}</label>
                <span className="sc-mono" style={{ fontSize: '12px', color: 'hsl(var(--text-primary))' }}>{selectedComp.position[0].toFixed(2)}m</span>
              </div>
              <input
                id="config-position-x"
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <label htmlFor="config-position-z" className="sc-eyebrow">{t('config.position_z', 'Posición Z (Frente/Fondo)')}</label>
                <span className="sc-mono" style={{ fontSize: '12px', color: 'hsl(var(--text-primary))' }}>{selectedComp.position[2].toFixed(2)}m</span>
              </div>
              <input
                id="config-position-z"
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <label htmlFor="config-rotation-y" className="sc-eyebrow">{t('config.rotation_y', 'Rotación Y (Ángulo)')}</label>
                <span className="sc-mono" style={{ fontSize: '12px', color: 'hsl(var(--text-primary))' }}>{Math.round((selectedComp.rotation[1] * 180) / Math.PI)}°</span>
              </div>
              <input
                id="config-rotation-y"
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

          <div className="sc-divider" />

          {/* Accesorios */}
          <div>
            <span className="sc-eyebrow" style={{ display: 'block', marginBottom: '10px' }}>
              {t('config.accessories_title', 'Accesorios y Configuraciones')}
            </span>

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
                        backgroundColor: isChecked ? 'var(--fill-faint)' : 'transparent',
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
                      <span className="sc-mono" style={{ fontSize: '12px', color: 'hsl(var(--brand-primary))', fontWeight: 600 }}>
                        +{formatEUR(toNumber(opt.price_eur), language)}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="sc-divider" />

          {/* Costo del módulo y eliminación */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'hsl(var(--text-secondary))' }}>{t('config.module_cost', 'Costo del Módulo')}</span>
              <span className="sc-mono" style={{ fontSize: '18px', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>
                {formatEUR(selectedComp.totalPrice, language)}
              </span>
            </div>
            {!isReadOnly && (
              <button
                onClick={() => removeComponentFromScene(selectedComp.uuid)}
                aria-label={t('config.delete_module_btn', 'Eliminar Módulo')}
                className="btn-secondary"
                style={{
                  width: '100%',
                  padding: '8px 0',
                  borderRadius: '6px',
                  color: 'hsl(var(--state-error))',
                  borderColor: 'hsl(var(--state-error) / 0.2)',
                  backgroundColor: 'hsl(var(--state-error) / 0.02)',
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
            <span className="sc-eyebrow" style={{ color: 'hsl(var(--brand-primary))' }}>
              {t('config.quote_summary', 'Resumen de Cotización')}
            </span>
            <h3 style={{ fontSize: '20px', fontWeight: 600, marginTop: '4px' }}>{t('config.line_details', 'Detalles de la Línea')}</h3>
          </div>

          {/* Caja de precio total */}
          <div className="sc-total" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span className="sc-eyebrow">{t('config.total_price_label', 'PRECIO TOTAL ESTIMADO')}</span>
            <span className="sc-mono" style={{ fontSize: '29px', fontWeight: 700, color: 'hsl(var(--brand-primary))', lineHeight: 1 }}>
              {formatEUR(totalPrice, language)}
            </span>
            <div className={overBudget ? 'sc-meter warn' : 'sc-meter'}>
              <i style={{ width: `${budgetPct}%` }} />
            </div>
            <small className="sc-mono" style={{ fontSize: '11px', color: 'hsl(var(--text-muted))' }}>
              {Math.round(budgetPct)}% {t('config.budget_of', 'de')} {formatEUR(params.maxBudget, language)} · {t('config.budget_noun', 'presupuesto')}
            </small>
          </div>

          {/* Validation Warnings list */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span className="sc-eyebrow">
              {t('config.rules_validations', 'Reglas y Validaciones')} ({validationWarnings.length})
            </span>

            {validationWarnings.length === 0 ? (
              <div className="sc-alert ok">
                <span className="b" />
                <span>{t('config.all_compatible', '✅ Todos los parámetros y acoplamientos son compatibles.')}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {validationWarnings.map((warn, idx) => {
                  const isError = warn.severity === 'error';
                  return (
                    <div key={idx} className={isError ? 'sc-alert err' : 'sc-alert warn'}>
                      <span className="b" />
                      <span>{warn.code ? t('warning.' + warn.code, warn.message, warn.params) : warn.message}</span>
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
