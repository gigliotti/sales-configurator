import type { StateCreator } from 'zustand';
import { computeGeometricSnap } from '../../lib/geometry';
import { toNumber } from '../../lib/format';
import type {
  AppStep,
  CatalogComponent,
  ClientParams,
  ComponentOption,
  PlacedComponent,
  ProductionLine,
  TransportType,
  ValidationWarning,
} from '../types';
import type { ConfiguratorState } from '../useConfiguratorStore';

export const defaultParams: ClientParams = {
  productType: 'CAJA',
  productLength: 400,
  productWidth: 300,
  productHeight: 200,
  productWeight: 15,
  desiredSpeed: 18,
  palletLength: 1200,
  palletWidth: 1000,
  unitsPerLayer: 8,
  totalPalletHeight: 1800,
  preferredWrapType: 'RED',
  maxBudget: 600000,
};

export const DEFAULT_LINE: ProductionLine = {
  id: 'default-line-id',
  name: 'Línea de Paletizado 1',
  productType: 'CAJA',
};

const HISTORY_LIMIT = 50;
/** Ventana para agrupar cambios continuos (sliders/gizmo) en una sola entrada de undo. */
const HISTORY_COALESCE_MS = 800;

/** Entrada del historial undo/redo: escena + líneas + línea activa (deleteLine muta las tres). */
export interface SceneHistoryEntry {
  placedComponents: PlacedComponent[];
  lines: ProductionLine[];
  activeLineId: string | null;
}

export interface SceneSlice {
  step: AppStep;
  params: ClientParams;
  placedComponents: PlacedComponent[];
  selectedComponentUuid: string | null;
  replacingComponentUuid: string | null;
  totalPrice: number;
  validationWarnings: ValidationWarning[];
  transportType: TransportType;
  lines: ProductionLine[];
  activeLineId: string | null;

  // Historial undo/redo (escena de componentes + líneas)
  _historyPast: SceneHistoryEntry[];
  _historyFuture: SceneHistoryEntry[];
  _lastHistoryKey: string | null;
  _lastHistoryAt: number;
  canUndo: boolean;
  canRedo: boolean;

  setStep: (step: AppStep) => void;
  setParams: (params: Partial<ClientParams>) => void;
  selectPalletizer: (palletizer: CatalogComponent, transportType: TransportType) => void;
  addComponentToScene: (component: CatalogComponent, position?: [number, number, number]) => void;
  removeComponentFromScene: (uuid: string) => void;
  selectComponent: (uuid: string | null) => void;
  setReplacingComponentUuid: (uuid: string | null) => void;
  replaceComponent: (uuid: string, newComponent: CatalogComponent) => void;
  updateComponentPosition: (uuid: string, position: [number, number, number]) => void;
  updateComponentRotation: (uuid: string, rotation: [number, number, number]) => void;
  /** Aplica posición+rotación al soltar el gizmo, con snap y una sola entrada de undo. */
  commitComponentTransform: (
    uuid: string,
    position: [number, number, number],
    rotation: [number, number, number]
  ) => void;
  toggleComponentOption: (uuid: string, optionType: string, option: ComponentOption) => void;
  clearScene: () => void;
  validateScene: () => void;
  undo: () => void;
  redo: () => void;

  addLine: (name: string, productType: 'CAJA' | 'BOLSA') => void;
  deleteLine: (id: string) => void;
  setActiveLineId: (id: string | null) => void;
}

const cloneHistoryEntry = (entry: SceneHistoryEntry): SceneHistoryEntry =>
  JSON.parse(JSON.stringify(entry)) as SceneHistoryEntry;

const snapshotHistoryEntry = (state: {
  placedComponents: PlacedComponent[];
  lines: ProductionLine[];
  activeLineId: string | null;
}): SceneHistoryEntry =>
  cloneHistoryEntry({
    placedComponents: state.placedComponents,
    lines: state.lines,
    activeLineId: state.activeLineId,
  });

export const createSceneSlice: StateCreator<ConfiguratorState, [], [], SceneSlice> = (set, get) => {
  /** Guarda el estado actual de la escena antes de una mutación. */
  const pushHistory = (coalesceKey?: string) => {
    const state = get();
    const now = Date.now();
    if (
      coalesceKey &&
      state._lastHistoryKey === coalesceKey &&
      now - state._lastHistoryAt < HISTORY_COALESCE_MS
    ) {
      set({ _lastHistoryAt: now });
      return;
    }
    const past = [...state._historyPast, snapshotHistoryEntry(state)].slice(-HISTORY_LIMIT);
    set({
      _historyPast: past,
      _historyFuture: [],
      _lastHistoryKey: coalesceKey ?? null,
      _lastHistoryAt: now,
      canUndo: true,
      canRedo: false,
    });
  };

  return {
    step: 'LOBBY',
    params: defaultParams,
    placedComponents: [],
    selectedComponentUuid: null,
    replacingComponentUuid: null,
    totalPrice: 0,
    validationWarnings: [],
    transportType: 'RODILLO',
    lines: [{ ...DEFAULT_LINE }],
    activeLineId: DEFAULT_LINE.id,

    _historyPast: [],
    _historyFuture: [],
    _lastHistoryKey: null,
    _lastHistoryAt: 0,
    canUndo: false,
    canRedo: false,

    setStep: (step) => set({ step }),

    setParams: (newParams) => set((state) => {
      const updatedParams = { ...state.params, ...newParams };
      let updatedLines = state.lines;
      if (state.activeLineId) {
        updatedLines = state.lines.map((l) =>
          l.id === state.activeLineId
            ? {
                ...l,
                productType: newParams.productType || l.productType,
                params: { ...(l.params || state.params), ...newParams },
              }
            : l
        );
      }
      return {
        params: updatedParams,
        lines: updatedLines,
      };
    }),

    selectPalletizer: (palletizer, transportType) => {
      pushHistory();
      const uuid = crypto.randomUUID();
      const placed: PlacedComponent = {
        uuid,
        id: palletizer.id,
        name: palletizer.name,
        code: palletizer.code,
        componentType: 'palletizer',
        locationId: 1, // Central
        basePrice: palletizer.price_eur,
        totalPrice: palletizer.price_eur,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        connectedTo: null,
        connectionPointId: null,
        model_id: palletizer.model_id,
        model_path: palletizer.model_path,
        specs: palletizer.specs,
        options: [],
        lineId: get().activeLineId || DEFAULT_LINE.id,
      };

      set((state) => {
        const activeLineId = state.activeLineId || DEFAULT_LINE.id;
        const otherLinesComponents = state.placedComponents.filter((c) => c.lineId !== activeLineId);
        const activeLineOtherComponents = state.placedComponents.filter(
          (c) => c.lineId === activeLineId && c.componentType !== 'palletizer'
        );

        const updatedLines = state.lines.map((l) =>
          l.id === activeLineId ? { ...l, transportType } : l
        );

        return {
          placedComponents: [...otherLinesComponents, ...activeLineOtherComponents, placed],
          selectedComponentUuid: uuid,
          step: 'EDITOR',
          transportType,
          lines: updatedLines,
        };
      });

      get().setParams({ preferredWrapType: get().params.preferredWrapType });
      get().validateScene();
    },

    addComponentToScene: (component, customPos) => {
      pushHistory();
      const { placedComponents } = get();
      const uuid = crypto.randomUUID();

      // Offset automático según ubicación y cantidad ya colocada
      let position: [number, number, number] = customPos || [0, 0, 0];
      if (!customPos) {
        const locationCount = placedComponents.filter((c) => c.locationId === component.location_id).length;
        if (component.location_id === 0) { // Infeed Pallet (izquierda)
          position = [-3 - locationCount * 2, 0, 0];
        } else if (component.location_id === 1) { // Outfeed Pallet (derecha)
          position = [3 + locationCount * 2, 0, 0];
        } else if (component.location_id === 2) { // Product Infeed (frente)
          position = [0, 0, -3 - locationCount * 2];
        }
      }

      const placed: PlacedComponent = {
        uuid,
        id: component.id,
        name: component.name,
        code: component.code,
        componentType: component.component_type_name,
        locationId: component.location_id,
        basePrice: component.price_eur,
        totalPrice: component.price_eur,
        position,
        rotation: [0, 0, 0],
        connectedTo: null,
        connectionPointId: null,
        model_id: component.model_id,
        model_path: component.model_path,
        specs: component.specs,
        options: [],
        lineId: get().activeLineId || DEFAULT_LINE.id,
      };

      const snapResult = computeGeometricSnap(placed, position, placedComponents);
      placed.position = snapResult.position;
      placed.connectedTo = snapResult.connectedTo;
      placed.connectionPointId = snapResult.connectionPointId;

      set((state) => ({
        placedComponents: [...state.placedComponents, placed],
        selectedComponentUuid: uuid,
      }));

      get().validateScene();
    },

    removeComponentFromScene: (uuid) => {
      pushHistory();
      set((state) => {
        const list = state.placedComponents.filter((c) => c.uuid !== uuid);
        // Limpia conexiones que apuntaban al componente eliminado
        const cleaned = list.map((c) => {
          if (c.connectedTo === uuid) {
            return { ...c, connectedTo: null, connectionPointId: null };
          }
          return c;
        });
        return {
          placedComponents: cleaned,
          selectedComponentUuid: state.selectedComponentUuid === uuid ? null : state.selectedComponentUuid,
          replacingComponentUuid: state.replacingComponentUuid === uuid ? null : state.replacingComponentUuid,
        };
      });
      get().validateScene();
    },

    selectComponent: (uuid) => set((state) => {
      const isDifferent = state.selectedComponentUuid !== uuid;
      return {
        selectedComponentUuid: uuid,
        replacingComponentUuid: isDifferent ? null : state.replacingComponentUuid,
      };
    }),

    setReplacingComponentUuid: (uuid) => set({ replacingComponentUuid: uuid }),

    replaceComponent: (uuid, newComponent) => {
      pushHistory();
      set((state) => {
        const comp = state.placedComponents.find((c) => c.uuid === uuid);
        if (!comp) return {};

        const updated = state.placedComponents.map((c) => {
          if (c.uuid === uuid) {
            return {
              ...c,
              id: newComponent.id,
              name: newComponent.name,
              code: newComponent.code,
              componentType: newComponent.component_type_name,
              locationId: newComponent.location_id,
              basePrice: newComponent.price_eur,
              totalPrice: newComponent.price_eur,
              model_id: newComponent.model_id,
              model_path: newComponent.model_path,
              specs: newComponent.specs,
              options: [],
            };
          }
          return c;
        });

        return {
          placedComponents: updated,
          replacingComponentUuid: null,
        };
      });
      get().validateScene();
    },

    updateComponentPosition: (uuid, position) => {
      pushHistory(`pos:${uuid}`);
      set((state) => {
        const comp = state.placedComponents.find((c) => c.uuid === uuid);
        if (!comp) return {};

        return {
          placedComponents: state.placedComponents.map((c) =>
            c.uuid === uuid
              ? {
                  ...c,
                  position: position,
                  connectedTo: null,
                  connectionPointId: null,
                }
              : c
          ),
        };
      });
      get().validateScene();
    },

    updateComponentRotation: (uuid, rotation) => {
      pushHistory(`rot:${uuid}`);
      set((state) => ({
        placedComponents: state.placedComponents.map((c) =>
          c.uuid === uuid ? { ...c, rotation } : c
        ),
      }));
    },

    commitComponentTransform: (uuid, position, rotation) => {
      const state = get();
      const comp = state.placedComponents.find((c) => c.uuid === uuid);
      if (!comp) return;

      pushHistory();
      const moved: PlacedComponent = { ...comp, position, rotation };
      const snap = computeGeometricSnap(moved, position, state.placedComponents);

      set((s) => ({
        placedComponents: s.placedComponents.map((c) =>
          c.uuid === uuid
            ? {
                ...c,
                position: snap.position,
                rotation,
                connectedTo: snap.connectedTo,
                connectionPointId: snap.connectionPointId,
              }
            : c
        ),
      }));
      get().validateScene();
    },

    toggleComponentOption: (uuid, optionType, option) => {
      pushHistory();
      set((state) => {
        const placed = state.placedComponents.map((c) => {
          if (c.uuid !== uuid) return c;

          const exists = c.options.some((o) => o.id === option.id && o.optionType === optionType);
          const newOptions = exists
            ? c.options.filter((o) => !(o.id === option.id && o.optionType === optionType))
            : [
                ...c.options,
                {
                  id: option.id,
                  optionType,
                  name: option.name || option.coupling_code || 'Opción',
                  code: option.code || option.coupling_code || '',
                  price: toNumber(option.price_eur),
                  details: option,
                },
              ];

          const optionsPrice = newOptions.reduce((sum, o) => sum + o.price, 0);

          return {
            ...c,
            options: newOptions,
            totalPrice: c.basePrice + optionsPrice,
          };
        });

        return { placedComponents: placed };
      });

      get().validateScene();
    },

    clearScene: () => {
      pushHistory();
      const { activeLineId, placedComponents } = get();
      set({
        placedComponents: placedComponents.filter((c) => c.lineId !== activeLineId),
        selectedComponentUuid: null,
        replacingComponentUuid: null,
      });
      get().validateScene();
    },

    undo: () => {
      const current = get();
      const { _historyPast, _historyFuture } = current;
      if (_historyPast.length === 0) return;
      const previous = _historyPast[_historyPast.length - 1];
      const past = _historyPast.slice(0, -1);
      const future = [..._historyFuture, snapshotHistoryEntry(current)].slice(-HISTORY_LIMIT);
      const validUuids = new Set(previous.placedComponents.map((c) => c.uuid));
      set((state) => {
        const targetLine = previous.lines.find((l) => l.id === previous.activeLineId);
        return {
          placedComponents: previous.placedComponents,
          lines: previous.lines,
          activeLineId: previous.activeLineId,
          params: targetLine
            ? targetLine.params || { ...state.params, productType: targetLine.productType }
            : state.params,
          transportType: targetLine ? targetLine.transportType || 'RODILLO' : state.transportType,
          _historyPast: past,
          _historyFuture: future,
          _lastHistoryKey: null,
          canUndo: past.length > 0,
          canRedo: true,
          selectedComponentUuid:
            state.selectedComponentUuid && validUuids.has(state.selectedComponentUuid)
              ? state.selectedComponentUuid
              : null,
          replacingComponentUuid: null,
        };
      });
      get().validateScene();
    },

    redo: () => {
      const current = get();
      const { _historyPast, _historyFuture } = current;
      if (_historyFuture.length === 0) return;
      const next = _historyFuture[_historyFuture.length - 1];
      const future = _historyFuture.slice(0, -1);
      const past = [..._historyPast, snapshotHistoryEntry(current)].slice(-HISTORY_LIMIT);
      const validUuids = new Set(next.placedComponents.map((c) => c.uuid));
      set((state) => {
        const targetLine = next.lines.find((l) => l.id === next.activeLineId);
        return {
          placedComponents: next.placedComponents,
          lines: next.lines,
          activeLineId: next.activeLineId,
          params: targetLine
            ? targetLine.params || { ...state.params, productType: targetLine.productType }
            : state.params,
          transportType: targetLine ? targetLine.transportType || 'RODILLO' : state.transportType,
          _historyPast: past,
          _historyFuture: future,
          _lastHistoryKey: null,
          canUndo: true,
          canRedo: future.length > 0,
          selectedComponentUuid:
            state.selectedComponentUuid && validUuids.has(state.selectedComponentUuid)
              ? state.selectedComponentUuid
              : null,
          replacingComponentUuid: null,
        };
      });
      get().validateScene();
    },

    validateScene: () => {
      const { placedComponents, params, activeLineId, lines } = get();
      const warnings: ValidationWarning[] = [];

      const activeLine = lines.find((l) => l.id === activeLineId);
      const lineProductType = activeLine ? activeLine.productType : params.productType;
      const currentLineComponents = placedComponents.filter((c) => c.lineId === activeLineId);

      const totalProjectPrice = placedComponents.reduce((sum, c) => sum + c.totalPrice, 0);
      let hasPalletizer = false;
      let hasSheetDispenser = false;
      let integratedSheetDispenser = false;
      let selectedManipulatorType: 'Tube' | 'Big' | 'Combi' | null = null;

      currentLineComponents.forEach((c) => {
        if (c.componentType === 'palletizer') hasPalletizer = true;
        if (c.componentType === 'sheet_dispenser') hasSheetDispenser = true;

        if (c.componentType === 'manipulator') {
          if (c.name.includes('Tube')) selectedManipulatorType = 'Tube';
          else if (c.name.includes('Big')) selectedManipulatorType = 'Big';
          else if (c.name.includes('Combi')) selectedManipulatorType = 'Combi';
        }

        if (c.componentType === 'main_frame') {
          const hasIntegratedSD = c.options.some((o) => o.details?.integrated_sheet_dispenser === true);
          if (hasIntegratedSD) integratedSheetDispenser = true;
        }
      });

      // 1. Debe existir una paletizadora en la línea
      if (!hasPalletizer) {
        warnings.push({
          severity: 'error',
          code: 'no_palletizer',
          message: 'Se requiere una Paletizadora V-STACK en la línea.',
        });
      }

      // 2. Sheet Dispenser externo vs integrado en MainFrame
      if (hasSheetDispenser && integratedSheetDispenser) {
        warnings.push({
          severity: 'error',
          code: 'mainframe_conflict',
          message: 'Conflicto: El MainFrame ya incluye un Sheet Dispenser integrado. Elimina el SheetDispenser externo.',
        });
      }

      // 3. Límite de peso según manipulador
      if (selectedManipulatorType === 'Tube' && params.productWeight > 25) {
        warnings.push({
          severity: 'error',
          code: 'tube_manipulator_limit',
          params: { weight: params.productWeight },
          message: `El peso del producto (${params.productWeight} kg) supera el límite del Tube Manipulator (25 kg).`,
        });
      }
      if (selectedManipulatorType === 'Big' && params.productWeight > 50) {
        warnings.push({
          severity: 'error',
          code: 'big_manipulator_limit',
          params: { weight: params.productWeight },
          message: `El peso del producto (${params.productWeight} kg) supera el límite del Big Manipulator (50 kg).`,
        });
      }

      // 4. Módulos EndOfLine solo para BOLSA
      const hasEOL = currentLineComponents.some((c) => c.componentType === 'end_of_line');
      if (hasEOL && lineProductType === 'CAJA') {
        warnings.push({
          severity: 'error',
          code: 'bolsa_exclusive',
          message: 'Los módulos EndOfLine (V-LOAD, V-PACK, V-WEIGH) son exclusivos para formato BOLSA.',
        });
      }

      // 5. Restricciones dimensionales de transportadores y envolvedoras
      currentLineComponents.forEach((c) => {
        if (c.componentType === 'conveyor') {
          if (c.specs.max_pallet_length_mm && params.palletLength > c.specs.max_pallet_length_mm) {
            warnings.push({
              severity: 'warning',
              code: 'pallet_length_conveyor_limit',
              params: { value: params.palletLength, name: c.name, max: c.specs.max_pallet_length_mm },
              message: `El largo del pallet (${params.palletLength} mm) supera la capacidad del transportador ${c.name} (${c.specs.max_pallet_length_mm} mm).`,
            });
          }
          if (c.specs.max_pallet_width_mm && params.palletWidth > c.specs.max_pallet_width_mm) {
            warnings.push({
              severity: 'warning',
              code: 'pallet_width_conveyor_limit',
              params: { value: params.palletWidth, name: c.name, max: c.specs.max_pallet_width_mm },
              message: `El ancho del pallet (${params.palletWidth} mm) supera la capacidad del transportador ${c.name} (${c.specs.max_pallet_width_mm} mm).`,
            });
          }
        }

        if (c.componentType === 'wrapper') {
          if (c.specs.max_wrap_height_mm && params.totalPalletHeight > c.specs.max_wrap_height_mm) {
            warnings.push({
              severity: 'warning',
              code: 'pallet_height_wrapper_limit',
              params: { value: params.totalPalletHeight, name: c.name, max: c.specs.max_wrap_height_mm },
              message: `La altura total de envoltura (${params.totalPalletHeight} mm) supera el límite del envolvedor ${c.name} (${c.specs.max_wrap_height_mm} mm).`,
            });
          }
        }
      });

      // 6. Presupuesto de la línea activa
      const activeLineCost = currentLineComponents.reduce((sum, c) => sum + c.totalPrice, 0);
      const activeLineBudget = activeLine?.params?.maxBudget ?? params.maxBudget;
      if (activeLineCost > activeLineBudget) {
        warnings.push({
          severity: 'warning',
          code: 'budget_exceeded',
          params: { cost: activeLineCost.toLocaleString(), budget: activeLineBudget.toLocaleString() },
          message: `El costo total (€${activeLineCost.toLocaleString()}) supera el presupuesto del cliente (€${activeLineBudget.toLocaleString()}).`,
        });
      }

      set({ totalPrice: totalProjectPrice, validationWarnings: warnings });
    },

    addLine: (name, productType) => {
      const id = crypto.randomUUID();
      const newLineParams: ClientParams = {
        ...defaultParams,
        productType,
      };
      set((state) => ({
        lines: [...state.lines, { id, name, productType, params: newLineParams, transportType: 'RODILLO' }],
        activeLineId: id,
        params: newLineParams,
        transportType: 'RODILLO',
      }));
      get().validateScene();
    },

    deleteLine: (id) => {
      pushHistory();
      set((state) => {
        const remainingLines = state.lines.filter((l) => l.id !== id);
        const nextActiveId = remainingLines.length > 0 ? remainingLines[0].id : null;
        const remainingComponents = state.placedComponents.filter((c) => c.lineId !== id);

        let nextParams = state.params;
        let nextTransportType = state.transportType;

        if (nextActiveId !== null) {
          const nextLine = remainingLines.find((l) => l.id === nextActiveId);
          if (nextLine) {
            nextParams = nextLine.params || { ...defaultParams, productType: nextLine.productType };
            nextTransportType = nextLine.transportType || 'RODILLO';
          }
        } else {
          nextParams = defaultParams;
          nextTransportType = 'RODILLO';
        }

        return {
          lines: remainingLines,
          activeLineId: nextActiveId,
          placedComponents: remainingComponents,
          params: nextParams,
          transportType: nextTransportType,
        };
      });
      get().validateScene();
    },

    setActiveLineId: (id) => {
      set((state) => {
        const targetLine = state.lines.find((l) => l.id === id);
        if (!targetLine) return { activeLineId: id };
        return {
          activeLineId: id,
          params: targetLine.params || { ...state.params, productType: targetLine.productType },
          transportType: targetLine.transportType || 'RODILLO',
        };
      });
      get().validateScene();
    },
  };
};
