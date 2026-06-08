import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

export interface ClientParams {
  productType: 'CAJA' | 'BOLSA';
  productLength: number;
  productWidth: number;
  productHeight: number;
  productWeight: number;
  desiredSpeed: number;
  palletLength: number;
  palletWidth: number;
  unitsPerLayer: number;
  totalPalletHeight: number;
  preferredWrapType: 'RED' | 'FILM';
  maxBudget: number;
}

export interface ComponentSpecs {
  conveyor_length_mm?: number;
  conveyor_width_mm?: number;
  max_production_rate?: number;
  min_product_length_mm?: number;
  max_product_length_mm?: number;
  min_product_width_mm?: number;
  max_product_width_mm?: number;
  min_product_height_mm?: number;
  max_product_height_mm?: number;
  max_weight_large_kg?: number;
  max_pallet_length_mm?: number;
  max_pallet_width_mm?: number;
  max_wrap_height_mm?: number;
  max_weight_medium_kg?: number;
  rotation_degrees?: number;
  rotation_direction?: string;
  max_stacking_units?: number;
  max_sheet_stack_mm?: number;
  max_layer_length_mm?: number;
}

export interface OptionDetails {
  integrated_sheet_dispenser?: boolean;
  wrap_type?: string;
  paper_addition?: boolean;
  cut_and_seal?: string;
  pallet_brake?: boolean;
  pallet_guide?: boolean;
  height_mm?: number;
  lower_collar?: boolean;
}

export interface CatalogComponent {
  id: number;
  component_type_id: number;
  component_type_name: string;
  code: string;
  name: string;
  price_eur: number;
  location_id: number;
  model_id: string;
  model_path: string;
  available: boolean;
  transport_types: string[];
  product_types: string[];
  specs: ComponentSpecs;
}

export interface PlacedComponent {
  uuid: string; // Unique instance ID in scene
  id: number;   // Catalog ID
  name: string;
  code: string;
  componentType: string;
  locationId: number;
  basePrice: number;
  totalPrice: number;
  position: [number, number, number];
  rotation: [number, number, number];
  connectedTo: string | null;
  connectionPointId: string | null;
  model_id: string;
  model_path: string;
  specs: ComponentSpecs;
  options: {
    id: number;
    optionType: string; // 'conveyor_accessory' | 'wrapper_config' | 'turn_unit_config' | 'main_frame_config' | 'infeed_coupling_config'
    name: string;
    code: string;
    price: number;
    details: OptionDetails | null;
  }[];
  lineId?: string; // Production line association
}

export interface ValidationWarning {
  severity: 'warning' | 'error';
  message: string;
}

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  preferred_language?: string;
}

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  client_name?: string;
  client_email?: string;
  total_price_eur?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ComponentOption {
  id: number;
  name?: string;
  coupling_code?: string;
  code?: string;
  price_eur?: string | number;
  integrated_sheet_dispenser?: boolean;
  wrap_type?: string;
  paper_addition?: boolean;
  cut_and_seal?: string;
  pallet_brake?: boolean;
  pallet_guide?: boolean;
  height_mm?: number;
  lower_collar?: boolean;
}

interface SupabaseClientWithRest {
  rest: {
    headers: {
      delete: (key: string) => void;
      set: (key: string, value: string) => void;
    };
  };
}

interface DBComponent {
  id: number;
  component_type_id: number;
  code: string;
  name: string;
  price_eur: string | number | null;
  location_id: number;
  model_id: string;
  model_path: string;
  available: boolean;
  component_types?: { name: string } | null;
  component_transport_types?: { transport_types?: { name?: string } | null }[] | null;
  component_product_types?: { product_types?: { name?: string } | null }[] | null;
}

interface DBLineComponent {
  id: number;
  line_id: string;
  component_id: number;
  pos_x: number;
  pos_y: number;
  pos_z: number;
  rot_y: number | null;
  connected_to: number | null;
  parent_snap_point_id?: string | number | null;
}

export interface ConfiguratorState {
  step: 'WIZARD' | 'EDITOR' | 'LOBBY' | 'CATALOG_ADMIN';
  params: ClientParams;
  projectName: string;
  clientName: string;
  clientEmail: string;
  recommendedPalletizers: CatalogComponent[];
  catalog: CatalogComponent[];
  placedComponents: PlacedComponent[];
  selectedComponentUuid: string | null;
  replacingComponentUuid: string | null;
  totalPrice: number;
  validationWarnings: ValidationWarning[];
  loading: boolean;
  transportType: 'RODILLO' | 'CADENA';
  infeedCompatibilities: { infeed_id: number; palletizer_id: number }[];
  mainFrameCompatibilities: { main_frame_id: number; palletizer_id: number }[];
  activeProfile: { id: string; name: string; role: string; email: string } | null;
  profiles: UserProfile[];
  projectsList: Project[];
  favoriteProjectIds: string[];
  
  // Language & i18n state
  language: 'es' | 'en';
  translations: Record<string, string>;
  
  // Multi-line and project persistence state
  currentProjectId: string | null;
  lines: {
    id: string;
    name: string;
    productType: 'CAJA' | 'BOLSA';
    params?: ClientParams;
    transportType?: 'RODILLO' | 'CADENA';
  }[];
  activeLineId: string | null;
  isReadOnly: boolean;
  shareToken: string | null;
  
  // Actions
  setStep: (step: 'WIZARD' | 'EDITOR' | 'LOBBY' | 'CATALOG_ADMIN') => void;
  setParams: (params: Partial<ClientParams>) => void;
  setProjectMeta: (name: string, client: string, email: string) => void;
  loadCatalog: () => Promise<void>;
  fetchRecommendations: () => Promise<void>;
  selectPalletizer: (palletizer: CatalogComponent, transportType: 'RODILLO' | 'CADENA') => void;
  addComponentToScene: (component: CatalogComponent, position?: [number, number, number]) => void;
  removeComponentFromScene: (uuid: string) => void;
  selectComponent: (uuid: string | null) => void;
  setReplacingComponentUuid: (uuid: string | null) => void;
  replaceComponent: (uuid: string, newComponent: CatalogComponent) => void;
  updateComponentPosition: (uuid: string, position: [number, number, number]) => void;
  updateComponentRotation: (uuid: string, rotation: [number, number, number]) => void;
  toggleComponentOption: (uuid: string, optionType: string, option: ComponentOption) => void;
  clearScene: () => void;
  saveProject: () => Promise<{ success: boolean; projectId?: string; error?: string }>;
  validateScene: () => void;
  setActiveProfile: (profileId: string | null) => Promise<void>;
  loadProfiles: () => Promise<void>;
  loadProjectsList: () => Promise<void>;
  toggleFavoriteProject: (projectId: string) => Promise<void>;
  loadProject: (projectId: string, fromShare?: boolean) => Promise<void>;
  loadSharedProject: (token: string) => Promise<boolean>;
  deleteProject: (projectId: string) => Promise<void>;
  resetConfiguratorState: () => void;
  
  // Line Actions
  addLine: (name: string, productType: 'CAJA' | 'BOLSA') => void;
  deleteLine: (id: string) => void;
  setActiveLineId: (id: string | null) => void;

  // i18n & Auth actions
  initAuthListener: () => () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loadTranslations: () => Promise<void>;
  setLanguage: (lang: 'es' | 'en') => Promise<void>;
  t: (key: string, fallback?: string) => string;
}

export function getComponentPhysicalDimensions(comp: PlacedComponent | CatalogComponent) {
  const type = ('componentType' in comp ? comp.componentType : comp.component_type_name) || '';
  const specs = comp.specs || {};
  let length = 2.0;
  let width = 1.5;
  let height = 1.2;

  const parseDim = (val: unknown, defaultVal: number): number => {
    if (typeof val === 'number') return val / 1000;
    if (typeof val === 'string') {
      const num = parseFloat(val);
      if (!isNaN(num)) return num / 1000;
    }
    return defaultVal;
  };

  switch (type) {
    case 'palletizer':
      length = 2.8;
      width = 2.8;
      height = 3.5;
      break;
    case 'conveyor':
      length = parseDim(specs.conveyor_length_mm, 2.0);
      width = parseDim(specs.conveyor_width_mm, 1.2);
      height = 0.8;
      break;
    case 'wrapper':
      length = 2.2;
      width = 2.2;
      height = 2.5;
      break;
    case 'turn_unit':
      length = 1.5;
      width = 1.5;
      height = 0.9;
      break;
    case 'pallet_dispenser':
      length = 1.6;
      width = 1.8;
      height = 2.2;
      break;
    case 'sheet_dispenser':
      length = 1.4;
      width = 1.6;
      height = 1.8;
      break;
    case 'manipulator':
      length = 0.8;
      width = 0.8;
      height = 1.0;
      break;
  }
  return { length, width, height };
}

export function computeGeometricSnap(
  target: PlacedComponent,
  proposedPos: [number, number, number],
  allComponents: PlacedComponent[],
  threshold = 0.6
): {
  position: [number, number, number];
  connectedTo: string | null;
  connectionPointId: string | null;
} {
  const [px, py, pz] = proposedPos;
  const lineId = target.lineId;

  if (!lineId) {
    return { position: proposedPos, connectedTo: null, connectionPointId: null };
  }

  const dimsT = getComponentPhysicalDimensions(target);
  const rotationY_t = target.rotation ? target.rotation[1] : 0;
  const cosT = Math.abs(Math.cos(rotationY_t));
  const sinT = Math.abs(Math.sin(rotationY_t));
  const dx_t = dimsT.length * cosT + dimsT.width * sinT;
  const dz_t = dimsT.length * sinT + dimsT.width * cosT;

  let bestSnap: {
    position: [number, number, number];
    connectedTo: string | null;
    connectionPointId: string | null;
    distance: number;
  } | null = null;

  for (const other of allComponents) {
    if (other.uuid === target.uuid) continue;
    if (other.lineId !== lineId) continue;

    const dimsO = getComponentPhysicalDimensions(other);
    const rotationY_o = other.rotation ? other.rotation[1] : 0;
    const cosO = Math.abs(Math.cos(rotationY_o));
    const sinO = Math.abs(Math.sin(rotationY_o));
    const dx_o = dimsO.length * cosO + dimsO.width * sinO;
    const dz_o = dimsO.length * sinO + dimsO.width * cosO;

    const [ox, , oz] = other.position;

    const gapX_overlap = Math.max(0, (ox - dx_o / 2) - (px + dx_t / 2), (px - dx_t / 2) - (ox + dx_o / 2));
    const gapZ_overlap = Math.max(0, (oz - dz_o / 2) - (pz + dz_t / 2), (pz - dz_t / 2) - (oz + dz_o / 2));

    if (gapZ_overlap <= threshold) {
      // Option X1: target to the left of other (px < ox)
      const px_x1 = ox - dx_o / 2 - dx_t / 2;
      const distX1 = Math.abs(px - px_x1);
      if (distX1 <= threshold) {
        const zAlignments = [oz, oz - dz_o / 2 + dz_t / 2, oz + dz_o / 2 - dz_t / 2];
        let bestZ = pz;
        let minZDiff = Infinity;
        for (const zVal of zAlignments) {
          const diff = Math.abs(pz - zVal);
          if (diff < minZDiff) {
            minZDiff = diff;
            bestZ = zVal;
          }
        }
        if (!bestSnap || distX1 < bestSnap.distance) {
          bestSnap = {
            position: [px_x1, py, bestZ],
            connectedTo: other.uuid,
            connectionPointId: `snap-pt-${target.componentType}-out`,
            distance: distX1
          };
        }
      }

      // Option X2: target to the right of other (px > ox)
      const px_x2 = ox + dx_o / 2 + dx_t / 2;
      const distX2 = Math.abs(px - px_x2);
      if (distX2 <= threshold) {
        const zAlignments = [oz, oz - dz_o / 2 + dz_t / 2, oz + dz_o / 2 - dz_t / 2];
        let bestZ = pz;
        let minZDiff = Infinity;
        for (const zVal of zAlignments) {
          const diff = Math.abs(pz - zVal);
          if (diff < minZDiff) {
            minZDiff = diff;
            bestZ = zVal;
          }
        }
        if (!bestSnap || distX2 < bestSnap.distance) {
          bestSnap = {
            position: [px_x2, py, bestZ],
            connectedTo: other.uuid,
            connectionPointId: `snap-pt-${target.componentType}-in`,
            distance: distX2
          };
        }
      }
    }

    if (gapX_overlap <= threshold) {
      // Option Z1: target in front of other (pz < oz)
      const pz_z1 = oz - dz_o / 2 - dz_t / 2;
      const distZ1 = Math.abs(pz - pz_z1);
      if (distZ1 <= threshold) {
        const xAlignments = [ox, ox - dx_o / 2 + dx_t / 2, ox + dx_o / 2 - dx_t / 2];
        let bestX = px;
        let minXDiff = Infinity;
        for (const xVal of xAlignments) {
          const diff = Math.abs(px - xVal);
          if (diff < minXDiff) {
            minXDiff = diff;
            bestX = xVal;
          }
        }
        if (!bestSnap || distZ1 < bestSnap.distance) {
          bestSnap = {
            position: [bestX, py, pz_z1],
            connectedTo: other.uuid,
            connectionPointId: `snap-pt-${target.componentType}-out`,
            distance: distZ1
          };
        }
      }

      // Option Z2: target behind other (pz > oz)
      const pz_z2 = oz + dz_o / 2 + dz_t / 2;
      const distZ2 = Math.abs(pz - pz_z2);
      if (distZ2 <= threshold) {
        const xAlignments = [ox, ox - dx_o / 2 + dx_t / 2, ox + dx_o / 2 - dx_t / 2];
        let bestX = px;
        let minXDiff = Infinity;
        for (const xVal of xAlignments) {
          const diff = Math.abs(px - xVal);
          if (diff < minXDiff) {
            minXDiff = diff;
            bestX = xVal;
          }
        }
        if (!bestSnap || distZ2 < bestSnap.distance) {
          bestSnap = {
            position: [bestX, py, pz_z2],
            connectedTo: other.uuid,
            connectionPointId: `snap-pt-${target.componentType}-in`,
            distance: distZ2
          };
        }
      }
    }
  }

  if (bestSnap) {
    return {
      position: bestSnap.position,
      connectedTo: bestSnap.connectedTo,
      connectionPointId: bestSnap.connectionPointId
    };
  }

  return { position: proposedPos, connectedTo: null, connectionPointId: null };
}

const defaultParams: ClientParams = {
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

export const useConfiguratorStore = create<ConfiguratorState>((set, get) => ({
  step: 'LOBBY',
  params: defaultParams,
  projectName: 'Nueva Cotización',
  clientName: '',
  clientEmail: '',
  recommendedPalletizers: [],
  catalog: [],
  placedComponents: [],
  selectedComponentUuid: null,
  replacingComponentUuid: null,
  totalPrice: 0,
  validationWarnings: [],
  loading: false,
  transportType: 'RODILLO',
  infeedCompatibilities: [],
  mainFrameCompatibilities: [],
  activeProfile: null,
  profiles: [],
  projectsList: [],
  favoriteProjectIds: [],
  language: 'es',
  translations: {},
  currentProjectId: null,
  lines: [{ id: 'default-line-id', name: 'Línea de Paletizado 1', productType: 'CAJA' }],
  activeLineId: 'default-line-id',
  isReadOnly: false,
  shareToken: null,

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
              params: { ...(l.params || state.params), ...newParams }
            }
          : l
      );
    }
    return {
      params: updatedParams,
      lines: updatedLines
    };
  }),

  setProjectMeta: (projectName, clientName, clientEmail) => 
    set({ projectName, clientName, clientEmail }),

  loadCatalog: async () => {
    set({ loading: true });
    try {
      // Fetch components
      const { data: components, error: compError } = await supabase
        .from('components')
        .select(`
          *,
          component_types ( name ),
          component_transport_types ( transport_types ( name ) ),
          component_product_types ( product_types ( name ) )
        `)
        .eq('available', true);

      if (compError) throw compError;

      // Fetch all specifications tables to map metadata
      const specsMap: Record<string, Record<string, unknown>[]> = {};
      const specTables = [
        'palletizer_specs', 'conveyor_specs', 'manipulator_specs',
        'wrapper_specs', 'turn_unit_specs', 'pallet_dispenser_specs',
        'sheet_dispenser_specs', 'end_of_line_specs', 'collar_specs',
        'main_frame_specs'
      ];

      for (const table of specTables) {
        const { data } = await supabase.from(table).select('*');
        if (data) specsMap[table] = data as Record<string, unknown>[];
      }

      // Fetch N:M compatibility tables
      const { data: infeedComp } = await supabase.from('infeed_palletizer_compatibility').select('*');
      const { data: mainFrameComp } = await supabase.from('main_frame_palletizer_compatibility').select('*');

      const formattedCatalog: CatalogComponent[] = (components as unknown as DBComponent[]).map((comp) => {
        const transport_types = comp.component_transport_types
          ?.map((t) => t.transport_types?.name)
          .filter((n): n is string => typeof n === 'string') || [];
        const product_types = comp.component_product_types
          ?.map((p) => p.product_types?.name)
          .filter((n): n is string => typeof n === 'string') || [];
        const typeName = comp.component_types?.name || '';
        
        // Match specific spec table
        let specs = {};
        const specTableKey = `${typeName}_specs`;
        if (specsMap[specTableKey]) {
          specs = specsMap[specTableKey].find((s) => s.component_id === comp.id) || {};
        }

        return {
          id: comp.id,
          component_type_id: comp.component_type_id,
          component_type_name: typeName,
          code: comp.code,
          name: comp.name,
          price_eur: comp.price_eur ? parseFloat(String(comp.price_eur)) : 0,
          location_id: comp.location_id,
          model_id: comp.model_id,
          model_path: comp.model_path,
          available: comp.available,
          transport_types,
          product_types,
          specs,
        };
      });
      set({ 
        catalog: formattedCatalog,
        infeedCompatibilities: infeedComp || [],
        mainFrameCompatibilities: mainFrameComp || []
      });
    } catch (err) {
      console.error('Error loading catalog:', err);
    } finally {
      set({ loading: false });
    }
  },

  fetchRecommendations: async () => {
    const { params, catalog } = get();
    
    // Recommendations logic based on DB specs loaded in catalog
    const palletizers = catalog.filter((c) => c.component_type_name === 'palletizer');
    
    const recommendations = palletizers.filter((p) => {
      const specs = p.specs;
      if (!specs) return false;

      // Filter by product type
      const supportsProductType = p.product_types.includes(params.productType);
      if (!supportsProductType) return false;

      // Filter by max production rate (speed)
      if (specs.max_production_rate && specs.max_production_rate < params.desiredSpeed) return false;

      // Filter by product dimensions
      if (specs.min_product_length_mm && params.productLength < specs.min_product_length_mm) return false;
      if (specs.max_product_length_mm && params.productLength > specs.max_product_length_mm) return false;
      
      if (specs.min_product_width_mm && params.productWidth < specs.min_product_width_mm) return false;
      if (specs.max_product_width_mm && params.productWidth > specs.max_product_width_mm) return false;
      
      if (specs.min_product_height_mm && params.productHeight < specs.min_product_height_mm) return false;
      if (specs.max_product_height_mm && params.productHeight > specs.max_product_height_mm) return false;

      // Filter by weight (max_weight_medium_kg is usually the baseline, max_weight_large_kg is 50kg)
      const maxWeight = specs.max_weight_large_kg || 50;
      if (params.productWeight > maxWeight) return false;

      return true;
    });

    set({ recommendedPalletizers: recommendations });
  },

  selectPalletizer: (palletizer, transportType) => {
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
      lineId: get().activeLineId || 'default-line-id',
    };

    set((state) => {
      const activeLineId = state.activeLineId || 'default-line-id';
      const otherLinesComponents = state.placedComponents.filter((c) => c.lineId !== activeLineId);
      const activeLineOtherComponents = state.placedComponents.filter((c) => c.lineId === activeLineId && c.componentType !== 'palletizer');
      
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
    
    // Set default selected transport type in parameters
    get().setParams({ preferredWrapType: get().params.preferredWrapType }); 
    get().validateScene();
  },

  addComponentToScene: (component, customPos) => {
    const { placedComponents } = get();
    const uuid = crypto.randomUUID();
    
    // Auto position offset based on location and counts
    let position: [number, number, number] = customPos || [0, 0, 0];
    if (!customPos) {
      const locationCount = placedComponents.filter((c) => c.locationId === component.location_id).length;
      if (component.location_id === 0) { // Infeed Pallet (Left)
        position = [-3 - locationCount * 2, 0, 0];
      } else if (component.location_id === 1) { // Outfeed Pallet (Right)
        position = [3 + locationCount * 2, 0, 0];
      } else if (component.location_id === 2) { // Product Infeed (Front)
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
      lineId: get().activeLineId || 'default-line-id',
    };

    // Calculate snap if applicable
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
    set((state) => {
      const list = state.placedComponents.filter((c) => c.uuid !== uuid);
      // Clean up connections pointing to this deleted component
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
    set((state) => ({
      placedComponents: state.placedComponents.map((c) =>
        c.uuid === uuid ? { ...c, rotation } : c
      ),
    }));
  },

  toggleComponentOption: (uuid, optionType, option) => {
    set((state) => {
      const placed = state.placedComponents.map((c) => {
        if (c.uuid !== uuid) return c;

        // Check if option is already toggled
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
                price: option.price_eur ? parseFloat(String(option.price_eur)) : 0,
                details: option,
              },
            ];

        // Calculate option prices
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
    const { activeLineId, placedComponents } = get();
    set({
      placedComponents: placedComponents.filter((c) => c.lineId !== activeLineId),
      selectedComponentUuid: null,
      replacingComponentUuid: null,
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
    
    // Check components on active line
    currentLineComponents.forEach((c) => {
      if (c.componentType === 'palletizer') hasPalletizer = true;
      if (c.componentType === 'sheet_dispenser') hasSheetDispenser = true;
      
      if (c.componentType === 'manipulator') {
        if (c.name.includes('Tube')) selectedManipulatorType = 'Tube';
        else if (c.name.includes('Big')) selectedManipulatorType = 'Big';
        else if (c.name.includes('Combi')) selectedManipulatorType = 'Combi';
      }

      // Check main frame options
      if (c.componentType === 'main_frame') {
        const hasIntegratedSD = c.options.some((o) => o.details?.integrated_sheet_dispenser === true);
        if (hasIntegratedSD) integratedSheetDispenser = true;
      }
    });

    // 1. Check Palletizer presence
    if (!hasPalletizer) {
      warnings.push({ severity: 'error', message: 'Se requiere una Paletizadora V-STACK en la línea.' });
    }

    // 2. Rule: Sheet Dispenser vs Integrated Main Frame sheet dispenser
    if (hasSheetDispenser && integratedSheetDispenser) {
      warnings.push({
        severity: 'error',
        message: 'Conflicto: El MainFrame ya incluye un Sheet Dispenser integrado. Elimina el SheetDispenser externo.',
      });
    }

    // 3. Rule: Weight limit check by manipulator type
    if (selectedManipulatorType === 'Tube' && params.productWeight > 25) {
      warnings.push({
        severity: 'error',
        message: `El peso del producto (${params.productWeight} kg) supera el límite del Tube Manipulator (25 kg).`,
      });
    }
    if (selectedManipulatorType === 'Big' && params.productWeight > 50) {
      warnings.push({
        severity: 'error',
        message: `El peso del producto (${params.productWeight} kg) supera el límite del Big Manipulator (50 kg).`,
      });
    }

    // 4. Rule: EndOfLine availability (Only for BOLSA)
    const hasEOL = currentLineComponents.some((c) => c.componentType === 'end_of_line');
    if (hasEOL && lineProductType === 'CAJA') {
      warnings.push({
        severity: 'error',
        message: 'Los módulos EndOfLine (V-LOAD, V-PACK, V-WEIGH) son exclusivos para formato BOLSA.',
      });
    }

    // 5. Rule: Check dimension constraints on conveyors and wrappers
    currentLineComponents.forEach((c) => {
      // Conveyor checks
      if (c.componentType === 'conveyor') {
        if (c.specs.max_pallet_length_mm && params.palletLength > c.specs.max_pallet_length_mm) {
          warnings.push({
            severity: 'warning',
            message: `El largo del pallet (${params.palletLength} mm) supera la capacidad del transportador ${c.name} (${c.specs.max_pallet_length_mm} mm).`,
          });
        }
        if (c.specs.max_pallet_width_mm && params.palletWidth > c.specs.max_pallet_width_mm) {
          warnings.push({
            severity: 'warning',
            message: `El ancho del pallet (${params.palletWidth} mm) supera la capacidad del transportador ${c.name} (${c.specs.max_pallet_width_mm} mm).`,
          });
        }
      }
      
      // Wrapper checks
      if (c.componentType === 'wrapper') {
        if (c.specs.max_wrap_height_mm && params.totalPalletHeight > c.specs.max_wrap_height_mm) {
          warnings.push({
            severity: 'warning',
            message: `La altura total de envoltura (${params.totalPalletHeight} mm) supera el límite del envolvedor ${c.name} (${c.specs.max_wrap_height_mm} mm).`,
          });
        }
      }
    });

    // 6. Budget Warning
    const activeLineCost = currentLineComponents.reduce((sum, c) => sum + c.totalPrice, 0);
    const activeLineBudget = activeLine?.params?.maxBudget ?? params.maxBudget;
    if (activeLineCost > activeLineBudget) {
      warnings.push({
        severity: 'warning',
        message: `El costo total (€${activeLineCost.toLocaleString()}) supera el presupuesto del cliente (€${activeLineBudget.toLocaleString()}).`,
      });
    }

    set({ totalPrice: totalProjectPrice, validationWarnings: warnings });
  },

  saveProject: async () => {
    const { projectName, clientName, clientEmail, params, placedComponents, totalPrice, activeProfile } = get();
    
    try {
      // 1. Get owner ID (use active profile if present, fallback to auth session, fallback to first profile)
      let ownerId = null;
      if (activeProfile) {
        ownerId = activeProfile.id;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          ownerId = user.id;
        } else {
          // Fallback: get first profile if no session exists for easy testing
          const { data: profiles } = await supabase.from('user_profiles').select('id').limit(1);
          if (profiles && profiles.length > 0) {
            ownerId = profiles[0].id;
          }
        }
      }

      if (!ownerId) {
        throw new Error('No valid user profile found to assign project owner.');
      }

      // Determine if project already exists, and perform UPDATE or INSERT
      let project;
      const targetProjectId = get().currentProjectId;
      if (targetProjectId) {
        const { data: updatedProj, error: pError } = await supabase
          .from('projects')
          .update({
            name: projectName,
            client_name: clientName,
            client_email: clientEmail,
            total_price_eur: totalPrice,
            updated_at: new Date().toISOString()
          })
          .eq('id', targetProjectId)
          .select()
          .single();
        if (pError) throw pError;
        project = updatedProj;
      } else {
        const token = crypto.randomUUID();
        const { data: newProj, error: pError } = await supabase
          .from('projects')
          .insert({
            owner_id: ownerId,
            name: projectName,
            client_name: clientName,
            client_email: clientEmail,
            total_price_eur: totalPrice,
            status: 'draft',
            share_token: token
          })
          .select()
          .single();
        if (pError) throw pError;
        project = newProj;
        set({ currentProjectId: project.id });
      }

      // Generate version snapshot and insert into project_versions
      let versionNum = 1;
      if (targetProjectId) {
        const { data: existingVersions } = await supabase
          .from('project_versions')
          .select('version')
          .eq('project_id', targetProjectId)
          .order('version', { ascending: false })
          .limit(1);
        if (existingVersions && existingVersions.length > 0) {
          versionNum = existingVersions[0].version + 1;
        }
      }

      const snapshot = {
        projectName,
        clientName,
        clientEmail,
        totalPrice,
        lines: get().lines,
        placedComponents,
        params
      };

      await supabase
        .from('project_versions')
        .insert({
          project_id: project.id,
          version: versionNum,
          snapshot,
          created_by: ownerId
        });

      // Map components to database and process each line
      const insertedComponentsMap: Record<string, string> = {};
      const linesToProcess = get().lines;

      // Fetch lookups first
      interface LookupItem {
        id: number;
        name: string;
      }
      const { data: allTransportTypes } = await supabase.from('transport_types').select('*') as { data: LookupItem[] | null };
      const { data: allProductTypes } = await supabase.from('product_types').select('*') as { data: LookupItem[] | null };

      // Prepare lines data
      const linesInsertData = linesToProcess.map((line, idx) => {
        const lineParams = line.params || params; // fallback to global params
        const lineComponents = placedComponents.filter((c) => c.lineId === line.id || (!c.lineId && idx === 0));

        // Find palletizer and transport type for this line
        const palletizerComp = lineComponents.find((c) => c.componentType === 'palletizer');
        const conveyorComp = lineComponents.find((c) => c.componentType === 'conveyor');
        
        let transportTypeId = 3; // NONE
        if (conveyorComp) {
          const transType = conveyorComp.name.toLowerCase().includes('chain') ? 'CADENA' : 'RODILLO';
          const tt = allTransportTypes?.find((t) => t.name === transType);
          if (tt) transportTypeId = tt.id;
        }

        const pt = allProductTypes?.find((p) => p.name === line.productType);
        const productTypeId = pt ? pt.id : 1;

        return {
          project_id: project.id,
          name: line.name,
          product_type_id: productTypeId,
          product_length_mm: lineParams.productLength,
          product_width_mm: lineParams.productWidth,
          product_height_mm: lineParams.productHeight,
          product_weight_kg: lineParams.productWeight,
          desired_speed_upm: lineParams.desiredSpeed,
          pallet_length_mm: lineParams.palletLength,
          pallet_width_mm: lineParams.palletWidth,
          units_per_layer: lineParams.unitsPerLayer,
          total_pallet_height_mm: lineParams.totalPalletHeight,
          preferred_wrap_type: lineParams.preferredWrapType,
          max_budget_eur: lineParams.maxBudget,
          palletizer_id: palletizerComp ? palletizerComp.id : null,
          transport_type_id: transportTypeId,
          line_price_eur: lineComponents.reduce((acc, c) => acc + c.totalPrice, 0)
        };
      });

      // Clear existing project lines right before insertion (reducing data loss time window)
      if (targetProjectId) {
        const { error: deleteLinesError } = await supabase
          .from('project_lines')
          .delete()
          .eq('project_id', targetProjectId);
        if (deleteLinesError) throw deleteLinesError;
      }

      // Insert all project lines in a single query
      const { data: insertedLines, error: lError } = await supabase
        .from('project_lines')
        .insert(linesInsertData)
        .select();

      if (lError) throw lError;
      if (!insertedLines || insertedLines.length === 0) {
        throw new Error('Failed to insert project lines.');
      }

      // Prepare components data
      const compsInsertData: Record<string, unknown>[] = [];
      const compsMappingTemp: { tempUuid: string }[] = [];

      linesToProcess.forEach((line, lineIdx) => {
        const lineComponents = placedComponents.filter((c) => c.lineId === line.id || (!c.lineId && lineIdx === 0));
        const dbLine = insertedLines[lineIdx];

        lineComponents.forEach((c) => {
          compsInsertData.push({
            line_id: dbLine.id,
            component_id: c.id,
            pos_x: c.position[0],
            pos_y: c.position[1],
            pos_z: c.position[2],
            rot_y: c.rotation[1],
            parent_snap_point_id: c.connectionPointId,
            child_snap_point_id: c.connectionPointId
          });
          compsMappingTemp.push({ tempUuid: c.uuid });
        });
      });

      // Insert components in a single query
      if (compsInsertData.length > 0) {
        const { data: insertedComps, error: lcError } = await supabase
          .from('line_components')
          .insert(compsInsertData)
          .select();

        if (lcError) throw lcError;
        if (!insertedComps) throw new Error('Failed to insert line components.');

        const insertedCompsArr = Array.isArray(insertedComps) ? insertedComps : [insertedComps];
        insertedCompsArr.forEach((dbComp, idx: number) => {
          const mapping = compsMappingTemp[idx];
          insertedComponentsMap[mapping.tempUuid] = (dbComp as { id: string }).id;
        });

        // Prepare options data
        const optionsInsertData: Record<string, unknown>[] = [];
        linesToProcess.forEach((line, lineIdx) => {
          const lineComponents = placedComponents.filter((c) => c.lineId === line.id || (!c.lineId && lineIdx === 0));
          lineComponents.forEach((c) => {
            const dbCompId = insertedComponentsMap[c.uuid];
            c.options.forEach((opt) => {
              optionsInsertData.push({
                line_component_id: dbCompId,
                option_type: opt.optionType,
                option_id: opt.id
              });
            });
          });
        });

        // Insert options in a single query
        if (optionsInsertData.length > 0) {
          const { error: optError } = await supabase
            .from('line_component_options')
            .insert(optionsInsertData);
          if (optError) throw optError;
        }
      }

      // Update connected_to references across all components
      for (const c of placedComponents) {
        if (c.connectedTo && insertedComponentsMap[c.uuid] && insertedComponentsMap[c.connectedTo]) {
          await supabase
            .from('line_components')
            .update({
              connected_to: insertedComponentsMap[c.connectedTo]
            })
            .eq('id', insertedComponentsMap[c.uuid]);
        }
      }

      set({ shareToken: project.share_token || null });
      return { success: true, projectId: project.id };
    } catch (err) {
      console.error('Error saving project:', err);
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      return { success: false, error: errMsg };
    }
  },

  setActiveProfile: async (profileId: string | null) => {
    if (!profileId) {
      ((supabase as unknown) as SupabaseClientWithRest).rest.headers.delete('x-active-profile-id');
      set({ activeProfile: null, favoriteProjectIds: [] });
      await get().loadProjectsList();
      return;
    }

    try {
      ((supabase as unknown) as SupabaseClientWithRest).rest.headers.set('x-active-profile-id', profileId);

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', profileId)
        .single();
      
      if (profileError) throw profileError;
      if (!profile) return;

      let email = '';
      if (profileId === '00000000-0000-0000-0000-000000000000') email = 'admin@example.com';
      else if (profileId === '11111111-1111-1111-1111-111111111111') email = 'seller1@example.com';
      else if (profileId === '22222222-2222-2222-2222-222222222222') email = 'seller2@example.com';

      const lang = (profile.preferred_language === 'en' || profile.preferred_language === 'es')
        ? profile.preferred_language
        : 'es';

      set({
        activeProfile: {
          id: profile.id,
          name: profile.name,
          role: profile.role,
          email
        },
        language: lang
      });

      await get().loadTranslations();
      await get().loadProjectsList();
    } catch (err) {
      console.error('Error setting active profile:', err);
      ((supabase as unknown) as SupabaseClientWithRest).rest.headers.delete('x-active-profile-id');
      set({ activeProfile: null, favoriteProjectIds: [] });
      await get().loadProjectsList();
    }
  },

  loadProfiles: async () => {
    try {
      const { data } = await supabase.from('user_profiles').select('*');
      if (data) {
        set({ profiles: data });
      }
    } catch (err) {
      console.error('Error loading profiles:', err);
    }
  },

  loadProjectsList: async () => {
    set({ loading: true });
    try {
      const { activeProfile } = get();
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;

      let favoriteIds: string[] = [];
      if (activeProfile) {
        const { data: favs } = await supabase
          .from('seller_favorite_projects')
          .select('project_id')
          .eq('seller_id', activeProfile.id);
        if (favs) {
          favoriteIds = (favs as { project_id: string }[]).map((f) => f.project_id);
        }
      }

      set({ 
        projectsList: projects || [],
        favoriteProjectIds: favoriteIds
      });
    } catch (err) {
      console.error('Error loading projects list:', err);
    } finally {
      set({ loading: false });
    }
  },

  toggleFavoriteProject: async (projectId: string) => {
    const { activeProfile, favoriteProjectIds } = get();
    if (!activeProfile) return;

    const isFav = favoriteProjectIds.includes(projectId);
    try {
      if (isFav) {
        await supabase
          .from('seller_favorite_projects')
          .delete()
          .eq('seller_id', activeProfile.id)
          .eq('project_id', projectId);
        
        set({
          favoriteProjectIds: favoriteProjectIds.filter(id => id !== projectId)
        });
      } else {
        await supabase
          .from('seller_favorite_projects')
          .insert({
            seller_id: activeProfile.id,
            project_id: projectId
          });
        
        set({
          favoriteProjectIds: [...favoriteProjectIds, projectId]
        });
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  },

  loadProject: async (projectId: string, fromShare: boolean = false) => {
    if (!fromShare) {
      try {
        ((supabase as unknown) as SupabaseClientWithRest).rest.headers.delete('x-share-token');
      } catch {
        // Ignore delete errors
      }
      set({ isReadOnly: false, shareToken: null });
    }
    set({ loading: true });
    try {
      const { data: project, error: pError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      if (pError) throw pError;

      const { data: lines, error: lError } = await supabase
        .from('project_lines')
        .select('*')
        .eq('project_id', projectId);
      if (lError) throw lError;
      if (!lines || lines.length === 0) throw new Error('No se encontraron líneas en este proyecto.');

      const formattedLines = lines.map((line) => {
        const lineParams: ClientParams = {
          productType: (line.product_type_id === 2 ? 'BOLSA' : 'CAJA') as 'CAJA' | 'BOLSA',
          productLength: line.product_length_mm || 400,
          productWidth: line.product_width_mm || 300,
          productHeight: line.product_height_mm || 200,
          productWeight: parseFloat(line.product_weight_kg) || 15,
          desiredSpeed: line.desired_speed_upm || 18,
          palletLength: line.pallet_length_mm || 1200,
          palletWidth: line.pallet_width_mm || 1000,
          unitsPerLayer: line.units_per_layer || 8,
          totalPalletHeight: line.total_pallet_height_mm || 1800,
          preferredWrapType: (line.preferred_wrap_type || 'RED') as 'RED' | 'FILM',
          maxBudget: parseFloat(line.max_budget_eur) || 600000,
        };

        let lineTransportType: 'RODILLO' | 'CADENA' = 'RODILLO';
        if (line.transport_type_id === 2) {
          lineTransportType = 'CADENA';
        }

        return {
          id: line.id,
          name: line.name,
          productType: lineParams.productType,
          params: lineParams,
          transportType: lineTransportType,
        };
      });

      const lineIds = lines.map((l) => l.id);
      const { data: lineComponents, error: lcError } = await supabase
        .from('line_components')
        .select('*')
        .in('line_id', lineIds);
      if (lcError) throw lcError;

      const dbLineComponents = (lineComponents || []) as unknown as DBLineComponent[];

      const componentIds = dbLineComponents.map(lc => lc.id);
      interface DBComponentOption {
        line_component_id: number;
        option_type: string;
        option_id: number;
      }
      let optionsData: DBComponentOption[] = [];
      if (componentIds.length > 0) {
        const { data: opts, error: optError } = await supabase
          .from('line_component_options')
          .select('*')
          .in('line_component_id', componentIds);
        if (optError) throw optError;
        optionsData = (opts || []) as unknown as DBComponentOption[];
      }



      let catalog = get().catalog;
      if (catalog.length === 0) {
        await get().loadCatalog();
        catalog = get().catalog;
      }

      const uuidMap: Record<string, string> = {};
      dbLineComponents.forEach((lc) => {
        uuidMap[lc.id] = crypto.randomUUID();
      });

      const placedComponents: PlacedComponent[] = [];

      for (const lc of dbLineComponents) {
        const componentTemplate = catalog.find((c) => c.id === lc.component_id);
        if (!componentTemplate) continue;

        const lcOptions = optionsData.filter(o => o.line_component_id === lc.id);
        const optionsList: PlacedComponent['options'] = [];

        for (const opt of lcOptions) {
          let detailRecord: OptionDetails | null = null;
          let optName = 'Opción';
          let optCode = '';
          let optPrice = 0;

          if (opt.option_type === 'conveyor_accessory') {
            const { data } = await supabase.from('conveyor_accessories').select('*').eq('id', opt.option_id).single();
            if (data) {
              detailRecord = data;
              optName = data.name;
              optCode = data.code || '';
              optPrice = data.price_eur ? parseFloat(data.price_eur) : 0;
            }
          } else if (opt.option_type === 'infeed_coupling_config') {
            const { data } = await supabase.from('infeed_coupling_compatibility').select('*').eq('id', opt.option_id).single();
            if (data) {
              detailRecord = data;
              optName = `Acople: ${data.coupling_code}`;
              optCode = data.coupling_code || '';
              optPrice = data.price_eur ? parseFloat(data.price_eur) : 0;
            }
          } else if (opt.option_type === 'main_frame_config') {
            const { data } = await supabase.from('main_frame_configurations').select('*').eq('id', opt.option_id).single();
            if (data) {
              detailRecord = data;
              optName = `Variante: H${data.height_mm} ${data.lower_collar ? '+Collar' : ''} ${data.integrated_sheet_dispenser ? '+SheetDisp' : ''}`;
              optCode = '';
              optPrice = data.price_eur ? parseFloat(data.price_eur) : 0;
            }
          } else if (opt.option_type === 'turn_unit_config') {
            const { data } = await supabase.from('turn_unit_configurations').select('*').eq('id', opt.option_id).single();
            if (data) {
              detailRecord = data;
              optName = `Freno: ${data.pallet_brake ? 'Sí' : 'No'} | Guía: ${data.pallet_guide ? 'Sí' : 'No'}`;
              optCode = '';
              optPrice = data.price_eur ? parseFloat(data.price_eur) : 0;
            }
          } else if (opt.option_type === 'wrapper_config') {
            const { data } = await supabase.from('wrapper_configurations').select('*').eq('id', opt.option_id).single();
            if (data) {
              detailRecord = data;
              optName = `${data.wrap_type} | Papel: ${data.paper_addition ? 'Sí' : 'No'} | Sello: ${data.cut_and_seal}`;
              optCode = '';
              optPrice = data.price_eur ? parseFloat(data.price_eur) : 0;
            }
          }

          optionsList.push({
            id: opt.option_id,
            optionType: opt.option_type,
            name: optName,
            code: optCode,
            price: optPrice,
            details: detailRecord,
          });
        }

        const optionsPrice = optionsList.reduce((sum, o) => sum + o.price, 0);

        placedComponents.push({
          uuid: uuidMap[lc.id],
          id: lc.component_id,
          name: componentTemplate.name,
          code: componentTemplate.code,
          componentType: componentTemplate.component_type_name,
          locationId: componentTemplate.location_id,
          basePrice: componentTemplate.price_eur,
          totalPrice: componentTemplate.price_eur + optionsPrice,
          position: [lc.pos_x, lc.pos_y, lc.pos_z],
          rotation: [0, lc.rot_y || 0, 0],
          connectedTo: lc.connected_to ? uuidMap[lc.connected_to] : null,
          connectionPointId: lc.parent_snap_point_id ? String(lc.parent_snap_point_id) : null,
          model_id: componentTemplate.model_id,
          model_path: componentTemplate.model_path,
          specs: componentTemplate.specs,
          options: optionsList,
          lineId: lc.line_id,
        });
      }



      set({
        projectName: project.name,
        clientName: project.client_name || '',
        clientEmail: project.client_email || '',
        params: formattedLines[0]?.params || defaultParams,
        placedComponents,
        transportType: formattedLines[0]?.transportType || 'RODILLO',
        selectedComponentUuid: null,
        replacingComponentUuid: null,
        step: 'EDITOR',
        currentProjectId: project.id,
        lines: formattedLines,
        activeLineId: lines[0]?.id || null,
        shareToken: project.share_token || null,
      });

      get().validateScene();
    } catch (err) {
      console.error('Error loading project:', err);
    } finally {
      set({ loading: false });
    }
  },

  loadSharedProject: async (token: string): Promise<boolean> => {
    set({ loading: true });
    try {
      ((supabase as unknown) as SupabaseClientWithRest).rest.headers.set('x-share-token', token);

      const { data, error } = await supabase
        .from('projects')
        .select('id')
        .eq('share_token', token)
        .single();

      if (error || !data) {
        throw error || new Error('No project found with this share token');
      }

      await get().loadProject(data.id, true);

      set({
        isReadOnly: true,
        shareToken: token,
      });

      return true;
    } catch (err) {
      console.error('Error loading shared project:', err);
      try {
        ((supabase as unknown) as SupabaseClientWithRest).rest.headers.delete('x-share-token');
      } catch {
        // Ignore header delete errors
      }
      set({
        isReadOnly: false,
        shareToken: null,
      });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  deleteProject: async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
      if (error) throw error;

      set((state) => ({
        projectsList: state.projectsList.filter((p) => p.id !== projectId),
        favoriteProjectIds: state.favoriteProjectIds.filter((id) => id !== projectId)
      }));
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  },

  resetConfiguratorState: () => {
    try {
      ((supabase as unknown) as SupabaseClientWithRest).rest.headers.delete('x-share-token');
    } catch {
      // Ignore header delete errors
    }
    set({
      placedComponents: [],
      selectedComponentUuid: null,
      replacingComponentUuid: null,
      totalPrice: 0,
      validationWarnings: [],
      projectName: 'Nueva Cotización',
      clientName: '',
      clientEmail: '',
      params: defaultParams,
      currentProjectId: null,
      lines: [{ id: 'default-line-id', name: 'Línea de Paletizado 1', productType: 'CAJA' }],
      activeLineId: 'default-line-id',
      catalog: [],
      recommendedPalletizers: [],
      isReadOnly: false,
      shareToken: null,
    });
  },

  addLine: (name: string, productType: 'CAJA' | 'BOLSA') => {
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

  deleteLine: (id: string) => {
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

  setActiveLineId: (id: string | null) => {
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

  initAuthListener: () => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        ((supabase as unknown) as SupabaseClientWithRest).rest.headers.delete('x-share-token');
      } catch {
        // Ignore header delete errors
      }
      set({ isReadOnly: false, shareToken: null });
      if (session?.user) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError) throw profileError;

          if (profile) {
            set({
              activeProfile: {
                id: profile.id,
                name: profile.name,
                role: profile.role,
                email: session.user.email || ''
              },
              language: (profile.preferred_language === 'en' || profile.preferred_language === 'es')
                ? profile.preferred_language
                : 'es'
            });

            if (profile.role !== 'admin') {
              ((supabase as unknown) as SupabaseClientWithRest).rest.headers.delete('x-active-profile-id');
            }
          }
        } catch (err) {
          console.error('Error in auth listener profile fetch:', err);
          set({
            activeProfile: {
              id: session.user.id,
              name: session.user.user_metadata?.name || 'User',
              role: 'client',
              email: session.user.email || ''
            }
          });
          ((supabase as unknown) as SupabaseClientWithRest).rest.headers.delete('x-active-profile-id');
        }
        await get().loadTranslations();
        await get().loadProjectsList();
      } else {
        ((supabase as unknown) as SupabaseClientWithRest).rest.headers.delete('x-active-profile-id');
        set({
          activeProfile: null,
          favoriteProjectIds: [],
          projectsList: []
        });
        await get().loadProjectsList();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  },

  login: async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      const errMsg = err instanceof Error ? err.message : 'Error de inicio de sesión';
      return { success: false, error: errMsg };
    }
  },

  logout: async () => {
    try {
      try {
        ((supabase as unknown) as SupabaseClientWithRest).rest.headers.delete('x-share-token');
        ((supabase as unknown) as SupabaseClientWithRest).rest.headers.delete('x-active-profile-id');
      } catch {
        // Ignore header delete errors
      }
      set({ isReadOnly: false, shareToken: null });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.error('Logout error:', err);
    }
  },

  loadTranslations: async () => {
    try {
      const { language } = get();
      const { data, error } = await supabase
        .from('translations')
        .select('key, value')
        .eq('language', language);
      
      if (error) throw error;
      
      const newTranslations: Record<string, string> = {};
      if (data) {
        (data as { key: string; value: string }[]).forEach((row) => {
          newTranslations[row.key] = row.value;
        });
      }
      set({ translations: newTranslations });
    } catch (err) {
      console.error('Error loading translations:', err);
    }
  },

  setLanguage: async (lang) => {
    set({ language: lang });
    const { activeProfile } = get();
    if (activeProfile) {
      try {
        const { error } = await supabase
          .from('user_profiles')
          .update({ preferred_language: lang })
          .eq('id', activeProfile.id);
        if (error) throw error;
      } catch (err) {
        console.error('Error updating profile language:', err);
      }
    }
    await get().loadTranslations();
  },

  t: (key, fallback) => {
    const { translations } = get();
    return translations[key] || fallback || key;
  },
}));
