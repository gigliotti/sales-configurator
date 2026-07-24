// Tipos compartidos del configurador.
// Mantener sincronizados con el esquema de Supabase (ver supabase/migrations/).

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

export interface PlacedComponentOption {
  id: number;
  optionType: string; // 'conveyor_accessory' | 'wrapper_config' | 'turn_unit_config' | 'main_frame_config' | 'infeed_coupling_config'
  name: string;
  code: string;
  price: number;
  details: OptionDetails | null;
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
  options: PlacedComponentOption[];
  lineId?: string; // Production line association
}

export type WarningCode =
  | 'no_palletizer'
  | 'mainframe_conflict'
  | 'tube_manipulator_limit'
  | 'big_manipulator_limit'
  | 'bolsa_exclusive'
  | 'pallet_length_conveyor_limit'
  | 'pallet_width_conveyor_limit'
  | 'pallet_height_wrapper_limit'
  | 'budget_exceeded';

export interface ValidationWarning {
  severity: 'warning' | 'error';
  message: string;
  /** Código estable para traducir en la UI sin depender del texto. */
  code?: WarningCode;
  /** Valores interpolables asociados al código. */
  params?: Record<string, string | number>;
}

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  preferred_language?: string;
}

export type ProjectStatus = 'draft' | 'sent' | 'approved' | 'rejected';

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
  share_token?: string | null;
  deleted_at?: string | null;
}

export interface ProjectVersion {
  id?: string | number;
  project_id: string;
  version: number;
  snapshot: ProjectSnapshot;
  created_by?: string | null;
  created_at?: string;
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

export interface ProductionLine {
  id: string;
  name: string;
  productType: 'CAJA' | 'BOLSA';
  params?: ClientParams;
  transportType?: 'RODILLO' | 'CADENA';
}

/** Instantánea completa del proyecto: se usa para versiones y autosave. */
export interface ProjectSnapshot {
  projectName: string;
  clientName: string;
  clientEmail: string;
  totalPrice: number;
  lines: ProductionLine[];
  placedComponents: PlacedComponent[];
  params: ClientParams;
}

export type AppStep = 'WIZARD' | 'EDITOR' | 'LOBBY' | 'CATALOG_ADMIN';
export type TransportType = 'RODILLO' | 'CADENA';
export type Language = 'es' | 'en';
