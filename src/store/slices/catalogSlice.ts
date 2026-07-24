import type { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabaseClient';
import { toNumber } from '../../lib/format';
import type { CatalogComponent } from '../types';
import type { ConfiguratorState } from '../useConfiguratorStore';

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

export interface CatalogSlice {
  catalog: CatalogComponent[];
  recommendedPalletizers: CatalogComponent[];
  infeedCompatibilities: { infeed_id: number; palletizer_id: number }[];
  mainFrameCompatibilities: { main_frame_id: number; palletizer_id: number }[];
  loading: boolean;

  loadCatalog: () => Promise<void>;
  fetchRecommendations: () => Promise<void>;
}

const SPEC_TABLES = [
  'palletizer_specs', 'conveyor_specs', 'manipulator_specs',
  'wrapper_specs', 'turn_unit_specs', 'pallet_dispenser_specs',
  'sheet_dispenser_specs', 'end_of_line_specs', 'collar_specs',
  'main_frame_specs',
];

/** Forma exacta que devuelve la RPC get_catalog_full() (ver migración 20260724100200). */
interface CatalogRpcPayload {
  components?: {
    id: number;
    code: string;
    name: string;
    component_type_id: number;
    component_type: string;
    available: boolean;
    location_id: number;
    price_eur: string | number | null;
    model_id: string;
    model_path: string;
    transport_type_ids?: number[];
    product_type_ids?: number[];
    specs?: Record<string, unknown> | null;
  }[];
  transport_types?: { id: number; name: string }[];
  product_types?: { id: number; name: string }[];
  infeed_palletizer_compatibility?: { infeed_id: number; palletizer_id: number }[];
  main_frame_palletizer_compatibility?: { main_frame_id: number; palletizer_id: number }[];
}

/** Intenta cargar el catálogo con la RPC agregada; null si la función no existe aún. */
async function tryLoadCatalogViaRpc(): Promise<CatalogRpcPayload | null> {
  const client = supabase as unknown as {
    rpc?: (fn: string) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>;
  };
  if (typeof client.rpc !== 'function') return null;
  try {
    const { data, error } = await client.rpc('get_catalog_full');
    if (error) return null;
    if (!data || typeof data !== 'object') return null;
    return data as CatalogRpcPayload;
  } catch {
    return null;
  }
}

export const createCatalogSlice: StateCreator<ConfiguratorState, [], [], CatalogSlice> = (set, get) => ({
  catalog: [],
  recommendedPalletizers: [],
  infeedCompatibilities: [],
  mainFrameCompatibilities: [],
  loading: false,

  loadCatalog: async () => {
    set({ loading: true });
    try {
      // Camino rápido: una sola llamada RPC con el catálogo ya ensamblado.
      const rpcData = await tryLoadCatalogViaRpc();
      if (rpcData && Array.isArray(rpcData.components)) {
        const transportNameById = new Map(
          (rpcData.transport_types || []).map((t) => [t.id, t.name])
        );
        const productNameById = new Map(
          (rpcData.product_types || []).map((p) => [p.id, p.name])
        );
        const formatted: CatalogComponent[] = rpcData.components.map((comp) => ({
          id: comp.id,
          component_type_id: comp.component_type_id,
          component_type_name: comp.component_type || '',
          code: comp.code,
          name: comp.name,
          price_eur: toNumber(comp.price_eur),
          location_id: comp.location_id,
          model_id: comp.model_id,
          model_path: comp.model_path,
          available: comp.available,
          transport_types: (comp.transport_type_ids || [])
            .map((id) => transportNameById.get(id))
            .filter((n): n is string => typeof n === 'string'),
          product_types: (comp.product_type_ids || [])
            .map((id) => productNameById.get(id))
            .filter((n): n is string => typeof n === 'string'),
          specs: (comp.specs as CatalogComponent['specs']) || {},
        }));
        set({
          catalog: formatted,
          infeedCompatibilities: rpcData.infeed_palletizer_compatibility || [],
          mainFrameCompatibilities: rpcData.main_frame_palletizer_compatibility || [],
        });
        return;
      }

      // Camino legado: componentes + tablas de specs + compatibilidades en paralelo.
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

      const specsMap: Record<string, Record<string, unknown>[]> = {};

      const [specsResults, infeedCompResult, mainFrameCompResult] = await Promise.all([
        Promise.all(
          SPEC_TABLES.map(async (table) => {
            const { data } = await supabase.from(table).select('*');
            return { table, data };
          })
        ),
        supabase.from('infeed_palletizer_compatibility').select('*'),
        supabase.from('main_frame_palletizer_compatibility').select('*'),
      ]);

      specsResults.forEach(({ table, data }) => {
        if (data) specsMap[table] = data as Record<string, unknown>[];
      });

      const formattedCatalog: CatalogComponent[] = (components as unknown as DBComponent[]).map((comp) => {
        const transport_types = comp.component_transport_types
          ?.map((t) => t.transport_types?.name)
          .filter((n): n is string => typeof n === 'string') || [];
        const product_types = comp.component_product_types
          ?.map((p) => p.product_types?.name)
          .filter((n): n is string => typeof n === 'string') || [];
        const typeName = comp.component_types?.name || '';

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
          price_eur: toNumber(comp.price_eur),
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
        infeedCompatibilities: (infeedCompResult.data as { infeed_id: number; palletizer_id: number }[] | null) || [],
        mainFrameCompatibilities: (mainFrameCompResult.data as { main_frame_id: number; palletizer_id: number }[] | null) || [],
      });
    } catch (err) {
      console.error('Error loading catalog:', err);
    } finally {
      set({ loading: false });
    }
  },

  fetchRecommendations: async () => {
    const { params, catalog } = get();

    const palletizers = catalog.filter((c) => c.component_type_name === 'palletizer');

    const recommendations = palletizers.filter((p) => {
      const specs = p.specs;
      if (!specs) return false;

      if (!p.product_types.includes(params.productType)) return false;

      if (specs.max_production_rate && specs.max_production_rate < params.desiredSpeed) return false;

      if (specs.min_product_length_mm && params.productLength < specs.min_product_length_mm) return false;
      if (specs.max_product_length_mm && params.productLength > specs.max_product_length_mm) return false;

      if (specs.min_product_width_mm && params.productWidth < specs.min_product_width_mm) return false;
      if (specs.max_product_width_mm && params.productWidth > specs.max_product_width_mm) return false;

      if (specs.min_product_height_mm && params.productHeight < specs.min_product_height_mm) return false;
      if (specs.max_product_height_mm && params.productHeight > specs.max_product_height_mm) return false;

      // La capa máxima del palletizer debe admitir el pallet elegido.
      if (specs.max_layer_length_mm && params.palletLength > specs.max_layer_length_mm) return false;

      const maxWeight = specs.max_weight_large_kg || 50;
      if (params.productWeight > maxWeight) return false;

      return true;
    });

    // Más baratas primero: facilita quedarse dentro del presupuesto.
    recommendations.sort((a, b) => (a.price_eur || 0) - (b.price_eur || 0));

    set({ recommendedPalletizers: recommendations });
  },
});
