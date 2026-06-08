/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
// Seed data based on 001_catalog_data.sql
export const mockComponents = [
  {
    id: 1,
    component_type_id: 1,
    code: 'VE069108',
    name: 'V-STACK 315',
    available: true,
    location_id: null,
    price_eur: 139869.00,
    model_id: null,
    model_path: null,
    component_types: { name: 'palletizer' },
    component_transport_types: [{ transport_types: { name: 'NONE' } }],
    component_product_types: [{ product_types: { name: 'CAJA' } }]
  },
  {
    id: 2,
    component_type_id: 1,
    code: 'VE052439',
    name: 'V-STACK 320',
    available: true,
    location_id: null,
    price_eur: 383914.06,
    model_id: null,
    model_path: null,
    component_types: { name: 'palletizer' },
    component_transport_types: [{ transport_types: { name: 'RODILLO' } }],
    component_product_types: [{ product_types: { name: 'CAJA' } }]
  },
  {
    id: 3,
    component_type_id: 1,
    code: 'VE047037',
    name: 'V-STACK 535',
    available: true,
    location_id: null,
    price_eur: 740000.00,
    model_id: 'v-stack_535',
    model_path: '/3d/Palletizer/v-stack_535.glb',
    component_types: { name: 'palletizer' },
    component_transport_types: [{ transport_types: { name: 'RODILLO' } }],
    component_product_types: [{ product_types: { name: 'CAJA' } }]
  },
  {
    id: 6,
    component_type_id: 1,
    code: '79564',
    name: 'V-STACK 410',
    available: true,
    location_id: null,
    price_eur: 78483.28,
    model_id: 'v-stack_410',
    model_path: '/3d/Palletizer/v-stack_410.glb',
    component_types: { name: 'palletizer' },
    component_transport_types: [{ transport_types: { name: 'RODILLO' } }],
    component_product_types: [{ product_types: { name: 'BOLSA' } }]
  },
  {
    id: 8,
    component_type_id: 1,
    code: 'VE060827',
    name: 'V-STACK 620',
    available: true,
    location_id: null,
    price_eur: 270613.75,
    model_id: null,
    model_path: null,
    component_types: { name: 'palletizer' },
    component_transport_types: [{ transport_types: { name: 'RODILLO' } }, { transport_types: { name: 'CADENA' } }],
    component_product_types: [{ product_types: { name: 'CAJA' } }, { product_types: { name: 'BOLSA' } }]
  },
  {
    id: 9,
    component_type_id: 1,
    code: 'VE088035',
    name: 'V-STACK 630',
    available: true,
    location_id: null,
    price_eur: 315000.00,
    model_id: 'v-stack_630',
    model_path: '/3d/Palletizer/v-stack_630.glb',
    component_types: { name: 'palletizer' },
    component_transport_types: [{ transport_types: { name: 'RODILLO' } }, { transport_types: { name: 'CADENA' } }],
    component_product_types: [{ product_types: { name: 'CAJA' } }, { product_types: { name: 'BOLSA' } }]
  },
  {
    id: 11,
    component_type_id: 2,
    code: 'VE054374',
    name: 'Roller Conveyor VE054374',
    available: true,
    location_id: 0,
    price_eur: 4980.00,
    model_id: 'RollerConveyor_VE054374',
    model_path: '/3d/Modules/RollerConveyor/RollerConveyor_VE054374.glb',
    component_types: { name: 'conveyor' },
    component_transport_types: [{ transport_types: { name: 'RODILLO' } }],
    component_product_types: [{ product_types: { name: 'CAJA' } }, { product_types: { name: 'BOLSA' } }]
  },
  {
    id: 17,
    component_type_id: 2,
    code: 'VE045455',
    name: 'Chain Conveyor VE045455',
    available: true,
    location_id: 1,
    price_eur: 9400.00,
    model_id: 'ChainConveyor_VE045455',
    model_path: '/3d/Modules/ChainConveyor/ChainConveyor_VE045455.glb',
    component_types: { name: 'conveyor' },
    component_transport_types: [{ transport_types: { name: 'CADENA' } }],
    component_product_types: [{ product_types: { name: 'CAJA' } }, { product_types: { name: 'BOLSA' } }]
  },
  {
    id: 32,
    component_type_id: 3,
    code: 'VE045438',
    name: 'Infeed VE045438',
    available: true,
    location_id: 2,
    price_eur: 0.00, // zero price component
    model_id: 'InfeedSection_VE045438',
    model_path: '/3d/Modules/Infeed/InfeedSection_VE045438.glb',
    component_types: { name: 'infeed' },
    component_transport_types: [],
    component_product_types: [{ product_types: { name: 'CAJA' } }, { product_types: { name: 'BOLSA' } }]
  },
  {
    id: 36,
    component_type_id: 4,
    code: '62369',
    name: 'Tube Manipulator',
    available: true,
    location_id: 2,
    price_eur: 0.00,
    model_id: null,
    model_path: null,
    component_types: { name: 'manipulator' },
    component_transport_types: [],
    component_product_types: [{ product_types: { name: 'BOLSA' } }]
  },
  {
    id: 37,
    component_type_id: 4,
    code: 'VE031821',
    name: 'Big Manipulator',
    available: true,
    location_id: 2,
    price_eur: 0.00,
    model_id: null,
    model_path: null,
    component_types: { name: 'manipulator' },
    component_transport_types: [],
    component_product_types: [{ product_types: { name: 'BOLSA' } }]
  },
  {
    id: 39,
    component_type_id: 5,
    code: '7500.0051',
    name: 'VSW-MB',
    available: true,
    location_id: 1,
    price_eur: 8318.00,
    model_id: null,
    model_path: null,
    component_types: { name: 'wrapper' },
    component_transport_types: [{ transport_types: { name: 'NONE' } }],
    component_product_types: [{ product_types: { name: 'CAJA' } }, { product_types: { name: 'BOLSA' } }]
  },
  {
    id: 40,
    component_type_id: 5,
    code: 'VE051089',
    name: 'Wrapper ASM',
    available: true,
    location_id: 1,
    price_eur: 58025.00,
    model_id: 'RollerWrapper_VE051089',
    model_path: '/3d/Modules/Wrapper/RollerWrapper_VE051089.glb',
    component_types: { name: 'wrapper' },
    component_transport_types: [{ transport_types: { name: 'RODILLO' } }],
    component_product_types: [{ product_types: { name: 'CAJA' } }, { product_types: { name: 'BOLSA' } }]
  },
  {
    id: 47,
    component_type_id: 6,
    code: 'VE045467',
    name: 'Turn Unit CC',
    available: true,
    location_id: 1,
    price_eur: 36000.00,
    model_id: 'TurnUnit_VE045467',
    model_path: '/3d/Modules/Pallet/TurnUnit_VE045467.glb',
    component_types: { name: 'turn_unit' },
    component_transport_types: [{ transport_types: { name: 'CADENA' } }],
    component_product_types: [{ product_types: { name: 'CAJA' } }, { product_types: { name: 'BOLSA' } }]
  },
  {
    id: 50,
    component_type_id: 7,
    code: '7200.5004',
    name: 'VPM MW',
    available: true,
    location_id: 0,
    price_eur: 22784.00,
    model_id: 'PalletDispenser_7200-5004',
    model_path: '/3d/Modules/PalletDispenser/PalletDispenser_7200-5004.glb',
    component_types: { name: 'pallet_dispenser' },
    component_transport_types: [{ transport_types: { name: 'RODILLO' } }],
    component_product_types: [{ product_types: { name: 'CAJA' } }, { product_types: { name: 'BOLSA' } }]
  },
  {
    id: 58,
    component_type_id: 8,
    code: 'VE045494',
    name: 'Sheet Dispenser VE045494',
    available: true,
    location_id: 0,
    price_eur: 0.00,
    model_id: 'SheetDispenser_VE045494',
    model_path: '/3d/Modules/SheetDispenser/SheetDispenser_VE045494.glb',
    component_types: { name: 'sheet_dispenser' },
    component_transport_types: [{ transport_types: { name: 'CADENA' } }],
    component_product_types: [{ product_types: { name: 'CAJA' } }, { product_types: { name: 'BOLSA' } }]
  },
  {
    id: 59,
    component_type_id: 9,
    code: 'VE086516',
    name: 'V-LOAD 500',
    available: true,
    location_id: 2,
    price_eur: 48255.00,
    model_id: null,
    model_path: null,
    component_types: { name: 'end_of_line' },
    component_transport_types: [],
    component_product_types: [{ product_types: { name: 'BOLSA' } }]
  },
  {
    id: 62,
    component_type_id: 10,
    code: 'VE027018',
    name: 'Collar Eléctrico',
    available: true,
    location_id: null,
    price_eur: 0.00,
    model_id: null,
    model_path: null,
    component_types: { name: 'collar' },
    component_transport_types: [],
    component_product_types: [{ product_types: { name: 'CAJA' } }, { product_types: { name: 'BOLSA' } }]
  },
  {
    id: 65,
    component_type_id: 11,
    code: 'VE054362',
    name: 'Main Frame VE054362',
    available: true,
    location_id: null,
    price_eur: 0.00,
    model_id: null,
    model_path: null,
    component_types: { name: 'main_frame' },
    component_transport_types: [{ transport_types: { name: 'RODILLO' } }, { transport_types: { name: 'CADENA' } }],
    component_product_types: [{ product_types: { name: 'CAJA' } }, { product_types: { name: 'BOLSA' } }]
  }
];

export const mockPalletizerSpecs = [
  { component_id: 1, max_production_rate: 15, max_weight_medium_kg: 25, max_weight_large_kg: 25, min_product_length_mm: 300, max_product_length_mm: 400, min_product_width_mm: 400, max_product_width_mm: 600, min_product_height_mm: 85, max_product_height_mm: 450 },
  { component_id: 2, max_production_rate: 20, max_weight_medium_kg: 25, max_weight_large_kg: 25, min_product_length_mm: 200, max_product_length_mm: 400, min_product_width_mm: 200, max_product_width_mm: 600, min_product_height_mm: 100, max_product_height_mm: 400 },
  { component_id: 3, max_production_rate: 35, max_weight_medium_kg: 25, max_weight_large_kg: 25, min_product_length_mm: 200, max_product_length_mm: 400, min_product_width_mm: 200, max_product_width_mm: 600, min_product_height_mm: 100, max_product_height_mm: 400 },
  { component_id: 6, max_production_rate: 10, max_weight_medium_kg: 25, max_weight_large_kg: 50, min_product_length_mm: 350, max_product_length_mm: 900, min_product_width_mm: 220, max_product_width_mm: 560, min_product_height_mm: 50, max_product_height_mm: 240 },
  { component_id: 8, max_production_rate: 18, max_weight_medium_kg: 25, max_weight_large_kg: 50, min_product_length_mm: 350, max_product_length_mm: 880, min_product_width_mm: 220, max_product_width_mm: 590, min_product_height_mm: 50, max_product_height_mm: 325 },
  { component_id: 9, max_production_rate: 30, max_weight_medium_kg: 25, max_weight_large_kg: 50, min_product_length_mm: 350, max_product_length_mm: 880, min_product_width_mm: 220, max_product_width_mm: 590, min_product_height_mm: 50, max_product_height_mm: 325 }
];

export const mockConveyorSpecs = [
  { component_id: 11, conveyor_length_mm: 2640, conveyor_width_mm: 1100, max_pallet_length_mm: 1200, max_pallet_width_mm: 1000 },
  { component_id: 17, conveyor_length_mm: 2250, conveyor_width_mm: 1070, max_pallet_length_mm: 1165, max_pallet_width_mm: 1165 }
];

export const mockManipulatorSpecs = [
  { component_id: 36, max_product_width_mm: 530, max_product_length_mm: 770, max_product_weight_kg: 25 },
  { component_id: 37, max_product_width_mm: 590, max_product_length_mm: 880, max_product_weight_kg: 50 }
];

export const mockWrapperSpecs = [
  { component_id: 39, max_pallet_length_mm: 1250, max_pallet_width_mm: 1250, max_wrap_height_mm: 2500, max_load_kg: 1750 },
  { component_id: 40, max_pallet_length_mm: 1200, max_pallet_width_mm: 1000, max_wrap_height_mm: 2500, max_load_kg: 1500 }
];

export const mockTurnUnitSpecs = [
  { component_id: 47, max_pallet_width_mm: 1350, max_weight_kg: 650 }
];

export const mockPalletDispenserSpecs = [
  { component_id: 50, max_pallet_length_mm: 1600, max_pallet_width_mm: 1200 }
];

export const mockSheetDispenserSpecs = [
  { component_id: 58, max_pallet_length_mm: 1250, max_pallet_width_mm: 1250 }
];

export const mockEndOfLineSpecs = [
  { component_id: 59, capacity_units_per_min: 8 }
];

export const mockCollarSpecs = [
  { component_id: 62, max_collar_length_mm: 1600, max_collar_width_mm: 1600 }
];

export const mockMainFrameSpecs = [
  { component_id: 65, main_frame_length_mm: 1000, main_frame_width_mm: 1200 }
];

export const mockUserProfiles = [
  { id: '00000000-0000-0000-0000-000000000000', name: 'Admin', role: 'admin' },
  { id: '11111111-1111-1111-1111-111111111111', name: 'Seller 1', role: 'seller' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Seller 2', role: 'seller' }
];

export const mockProductTypes = [
  { id: 1, name: 'CAJA' },
  { id: 2, name: 'BOLSA' }
];

export const mockTransportTypes = [
  { id: 1, name: 'RODILLO' },
  { id: 2, name: 'CADENA' },
  { id: 3, name: 'NONE' }
];

export const mockConveyorAccessories = [
  { id: 1, code: 'VE035015', name: 'Pallet Centre Unit', price_eur: 1500.00 },
  { id: 2, code: 'VE061361', name: 'Pallet Bottom Board Detection', price_eur: 800.00 }
];

export const mockMainFrameConfigurations = [
  { id: 1, main_frame_id: 65, product_type_id: 2, height_mm: 2050, lower_collar: true, integrated_sheet_dispenser: true, price_eur: 5000.00 },
  { id: 2, main_frame_id: 65, product_type_id: 2, height_mm: 2050, lower_collar: true, integrated_sheet_dispenser: false, price_eur: 3000.00 }
];

export const mockTurnUnitConfigurations = [
  { id: 1, turn_unit_id: 47, pallet_brake: true, pallet_guide: true, price_eur: 1200.00 }
];

export const mockWrapperConfigurations = [
  { id: 1, wrapper_id: 39, wrap_type: 'RED', paper_addition: false, price_eur: 0 },
  { id: 2, wrapper_id: 40, wrap_type: 'RED', paper_addition: true, price_eur: 2000.00 }
];

export const mockInfeedCouplingCompatibility = [
  { id: 1, coupling_code: 'VE036214', infeed_id: 32, price_eur: 1100.00 }
];

export const mockTranslations = [
  { key: 'lobby.title', en: 'Sales Configurator Lobby', es: 'Lobby del Configurador de Ventas' },
  { key: 'warnings.no_palletizer', en: 'A V-STACK Palletizer is required in the line.', es: 'Se requiere una Paletizadora V-STACK en la línea.' }
];

// Memory database state for dynamic tables
export const mockDb: Record<string, any[]> = {
  projects: [],
  project_lines: [],
  line_components: [],
  line_component_options: [],
  seller_favorite_projects: [],
  user_profiles: [...mockUserProfiles],
  components: [...mockComponents],
  palletizer_specs: [...mockPalletizerSpecs],
  conveyor_specs: [...mockConveyorSpecs],
  manipulator_specs: [...mockManipulatorSpecs],
  wrapper_specs: [...mockWrapperSpecs],
  turn_unit_specs: [...mockTurnUnitSpecs],
  pallet_dispenser_specs: [...mockPalletDispenserSpecs],
  sheet_dispenser_specs: [...mockSheetDispenserSpecs],
  end_of_line_specs: [...mockEndOfLineSpecs],
  collar_specs: [...mockCollarSpecs],
  main_frame_specs: [...mockMainFrameSpecs],
  conveyor_accessories: [...mockConveyorAccessories],
  main_frame_configurations: [...mockMainFrameConfigurations],
  turn_unit_configurations: [...mockTurnUnitConfigurations],
  wrapper_configurations: [...mockWrapperConfigurations],
  infeed_coupling_compatibility: [...mockInfeedCouplingCompatibility],
  infeed_palletizer_compatibility: [
    { infeed_id: 32, palletizer_id: 9 },
    { infeed_id: 32, palletizer_id: 10 }
  ],
  main_frame_palletizer_compatibility: [
    { main_frame_id: 65, palletizer_id: 8 },
    { main_frame_id: 65, palletizer_id: 9 }
  ],
  product_types: [...mockProductTypes],
  transport_types: [...mockTransportTypes],
  translations: [...mockTranslations]
};

export function resetMockDb() {
  mockDb.projects = [];
  mockDb.project_lines = [];
  mockDb.line_components = [];
  mockDb.line_component_options = [];
  mockDb.seller_favorite_projects = [];
  mockDb.user_profiles = JSON.parse(JSON.stringify(mockUserProfiles));
  mockDb.components = JSON.parse(JSON.stringify(mockComponents));
  mockDb.palletizer_specs = JSON.parse(JSON.stringify(mockPalletizerSpecs));
  mockDb.conveyor_specs = JSON.parse(JSON.stringify(mockConveyorSpecs));
  mockDb.manipulator_specs = JSON.parse(JSON.stringify(mockManipulatorSpecs));
  mockDb.wrapper_specs = JSON.parse(JSON.stringify(mockWrapperSpecs));
  mockDb.turn_unit_specs = JSON.parse(JSON.stringify(mockTurnUnitSpecs));
  mockDb.pallet_dispenser_specs = JSON.parse(JSON.stringify(mockPalletDispenserSpecs));
  mockDb.sheet_dispenser_specs = JSON.parse(JSON.stringify(mockSheetDispenserSpecs));
  mockDb.end_of_line_specs = JSON.parse(JSON.stringify(mockEndOfLineSpecs));
  mockDb.collar_specs = JSON.parse(JSON.stringify(mockCollarSpecs));
  mockDb.main_frame_specs = JSON.parse(JSON.stringify(mockMainFrameSpecs));
  mockDb.conveyor_accessories = JSON.parse(JSON.stringify(mockConveyorAccessories));
  mockDb.main_frame_configurations = JSON.parse(JSON.stringify(mockMainFrameConfigurations));
  mockDb.turn_unit_configurations = JSON.parse(JSON.stringify(mockTurnUnitConfigurations));
  mockDb.wrapper_configurations = JSON.parse(JSON.stringify(mockWrapperConfigurations));
  mockDb.infeed_coupling_compatibility = JSON.parse(JSON.stringify(mockInfeedCouplingCompatibility));
  mockDb.infeed_palletizer_compatibility = [
    { infeed_id: 32, palletizer_id: 9 },
    { infeed_id: 32, palletizer_id: 10 }
  ];
  mockDb.main_frame_palletizer_compatibility = [
    { main_frame_id: 65, palletizer_id: 8 },
    { main_frame_id: 65, palletizer_id: 9 }
  ];
  mockDb.product_types = JSON.parse(JSON.stringify(mockProductTypes));
  mockDb.transport_types = JSON.parse(JSON.stringify(mockTransportTypes));
  mockDb.translations = JSON.parse(JSON.stringify(mockTranslations));
  mockCurrentUser = null;
  headers.clear();
}

let mockCurrentUser: any = null;
export function setMockCurrentUser(user: any) {
  mockCurrentUser = user;
}

const headers = new Map<string, string>();

class MockQueryBuilder {
  private tableName: string;
  private filters: Array<(item: any) => boolean> = [];
  private orderCol: string | null = null;
  private orderAsc: boolean = true;
  private limitCount: number | null = null;
  private isSingle: boolean = false;
  private isInsert: boolean = false;
  private isUpdate: boolean = false;
  private isDelete: boolean = false;
  private actionData: any = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(_fields?: string) {
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push((item) => {
      if (col === 'available' || col === 'lower_collar' || col === 'integrated_sheet_dispenser') {
        return Boolean(item[col]) === Boolean(val);
      }
      return item[col] === val || String(item[col]) === String(val);
    });
    return this;
  }

  in(col: string, valList: any[]) {
    this.filters.push((item) => valList.map(String).includes(String(item[col])));
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderAsc = opts?.ascending !== false;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  insert(data: any) {
    this.isInsert = true;
    this.actionData = data;
    return this;
  }

  update(data: any) {
    this.isUpdate = true;
    this.actionData = data;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  async execute() {
    let list = mockDb[this.tableName];
    if (!list) {
      mockDb[this.tableName] = [];
      list = mockDb[this.tableName];
    }

    if (this.isInsert) {
      const itemsToInsert = Array.isArray(this.actionData) ? this.actionData : [this.actionData];
      const insertedItems = itemsToInsert.map((item, idx) => {
        const newItem = {
          id: item.id || (crypto.randomUUID ? crypto.randomUUID() : `uuid-${Date.now()}-${idx}-${Math.random()}`),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...item
        };
        list.push(newItem);
        return newItem;
      });
      const res = Array.isArray(this.actionData) ? insertedItems : insertedItems[0];
      return { data: res, error: null };
    }

    if (this.isUpdate) {
      let affected = [...list];
      for (const filter of this.filters) {
        affected = affected.filter(filter);
      }
      affected.forEach(item => {
        Object.assign(item, this.actionData, { updated_at: new Date().toISOString() });
      });
      const res = this.isSingle ? affected[0] : affected;
      return { data: res, error: null };
    }

    if (this.isDelete) {
      let toDelete = [...list];
      for (const filter of this.filters) {
        toDelete = toDelete.filter(filter);
      }
      mockDb[this.tableName] = list.filter((item: any) => !toDelete.includes(item));
      return { data: toDelete, error: null };
    }

    // SELECT
    let result = [...list];
    if (this.tableName === 'translations') {
      const expanded: any[] = [];
      result.forEach((item: any) => {
        if (item.en !== undefined) {
          expanded.push({ ...item, language: 'en', value: item.en });
        }
        if (item.es !== undefined) {
          expanded.push({ ...item, language: 'es', value: item.es });
        }
        if (item.en === undefined && item.es === undefined) {
          expanded.push(item);
        }
      });
      result = expanded;
    }
    for (const filter of this.filters) {
      result = result.filter(filter);
    }

    if (this.orderCol) {
      const col = this.orderCol;
      const asc = this.orderAsc;
      result.sort((a, b) => {
        if (a[col] < b[col]) return asc ? -1 : 1;
        if (a[col] > b[col]) return asc ? 1 : -1;
        return 0;
      });
    }

    if (this.limitCount !== null) {
      result = result.slice(0, this.limitCount);
    }

    if (this.isSingle) {
      return { data: result.length > 0 ? result[0] : null, error: result.length > 0 ? null : new Error('Not found') };
    }

    return { data: result, error: null };
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export const supabase = {
  from: (tableName: string) => {
    return new MockQueryBuilder(tableName);
  },
  auth: {
    getUser: async () => {
      return { data: { user: mockCurrentUser }, error: null };
    },
    signUp: async (credentials: any) => {
      const newUser = { id: crypto.randomUUID ? crypto.randomUUID() : 'new-user', email: credentials.email };
      return { data: { user: newUser }, error: null };
    },
    signInWithPassword: async (credentials: any) => {
      const user = { id: '11111111-1111-1111-1111-111111111111', email: credentials.email };
      mockCurrentUser = user;
      return { data: { user }, error: null };
    },
    signOut: async () => {
      mockCurrentUser = null;
      return { error: null };
    },
    onAuthStateChange: (callback: any) => {
      callback('INITIAL_SESSION', mockCurrentUser ? { user: mockCurrentUser } : null);
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
  },
  rest: {
    headers: {
      set: (key: string, val: string) => headers.set(key, val),
      delete: (key: string) => headers.delete(key),
      get: (key: string) => headers.get(key)
    }
  }
};

export default supabase;
