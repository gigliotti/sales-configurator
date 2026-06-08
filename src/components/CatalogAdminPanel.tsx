import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useConfiguratorStore } from '../store/useConfiguratorStore';

interface ComponentType {
  id: number;
  name: string;
  label_key: string;
}

interface LocationType {
  id: number;
  name: string;
}

interface TransportType {
  id: number;
  name: string;
}

interface ProductType {
  id: number;
  name: string;
}

interface OrientationType {
  id: number;
  name: string;
}

interface CatalogComponent {
  id: number;
  component_type_id: number;
  code: string;
  name: string;
  available: boolean;
  location_id: number | null;
  price_eur: number | null;
  model_id: string | null;
  model_path: string | null;
}

interface SpecField {
  label: string;
  field: string;
  type: 'number' | 'text' | 'select' | 'select_orientation';
  options?: string[];
}

const SPEC_FIELDS_MAP: Record<string, SpecField[]> = {
  palletizer: [
    { label: 'Max Production Rate (u/min)', field: 'max_production_rate', type: 'number' },
    { label: 'Units (5-row pallet)', field: 'units_5_per_layer', type: 'number' },
    { label: 'Units (13-row pallet)', field: 'units_13_per_layer', type: 'number' },
    { label: 'Max Layer Length (mm)', field: 'max_layer_length_mm', type: 'number' },
    { label: 'Max Layer Width (mm)', field: 'max_layer_width_mm', type: 'number' },
    { label: 'Max Weight Medium (kg)', field: 'max_weight_medium_kg', type: 'number' },
    { label: 'Max Weight Large (kg)', field: 'max_weight_large_kg', type: 'number' },
    { label: 'Min Product Length (mm)', field: 'min_product_length_mm', type: 'number' },
    { label: 'Min Product Width (mm)', field: 'min_product_width_mm', type: 'number' },
    { label: 'Min Product Height (mm)', field: 'min_product_height_mm', type: 'number' },
    { label: 'Max Product Length (mm)', field: 'max_product_length_mm', type: 'number' },
    { label: 'Max Product Width (mm)', field: 'max_product_width_mm', type: 'number' },
    { label: 'Max Product Height (mm)', field: 'max_product_height_mm', type: 'number' },
  ],
  conveyor: [
    { label: 'Conveyor Length (mm)', field: 'conveyor_length_mm', type: 'number' },
    { label: 'Conveyor Width (mm)', field: 'conveyor_width_mm', type: 'number' },
    { label: 'Max Pallet Length (mm)', field: 'max_pallet_length_mm', type: 'number' },
    { label: 'Max Pallet Width (mm)', field: 'max_pallet_width_mm', type: 'number' },
  ],
  manipulator: [
    { label: 'Max Product Width (mm)', field: 'max_product_width_mm', type: 'number' },
    { label: 'Max Product Length (mm)', field: 'max_product_length_mm', type: 'number' },
    { label: 'Max Product Weight (kg)', field: 'max_product_weight_kg', type: 'number' },
  ],
  wrapper: [
    { label: 'Max Pallet Length (mm)', field: 'max_pallet_length_mm', type: 'number' },
    { label: 'Max Pallet Width (mm)', field: 'max_pallet_width_mm', type: 'number' },
    { label: 'Max Wrap Height (mm)', field: 'max_wrap_height_mm', type: 'number' },
    { label: 'Max Load (kg)', field: 'max_load_kg', type: 'number' },
    { label: 'Wrap Speed (units/hr)', field: 'wrap_speed_units_per_hour', type: 'number' },
  ],
  turn_unit: [
    { label: 'Max Pallet Width (mm)', field: 'max_pallet_width_mm', type: 'number' },
    { label: 'Max Weight (kg)', field: 'max_weight_kg', type: 'number' },
    { label: 'Rotation Direction', field: 'rotation_direction', type: 'select', options: ['CW', 'CCW', 'BOTH'] },
    { label: 'Rotation Degrees', field: 'rotation_degrees', type: 'number' },
  ],
  pallet_dispenser: [
    { label: 'Max Pallet Length (mm)', field: 'max_pallet_length_mm', type: 'number' },
    { label: 'Max Pallet Width (mm)', field: 'max_pallet_width_mm', type: 'number' },
    { label: 'Orientation', field: 'orientation_id', type: 'select_orientation' },
    { label: 'Max Stacking Units', field: 'max_stacking_units', type: 'number' },
    { label: 'Max Weight (kg)', field: 'max_weight_kg', type: 'number' },
  ],
  sheet_dispenser: [
    { label: 'Max Pallet Length (mm)', field: 'max_pallet_length_mm', type: 'number' },
    { label: 'Max Pallet Width (mm)', field: 'max_pallet_width_mm', type: 'number' },
    { label: 'Orientation', field: 'orientation_id', type: 'select_orientation' },
    { label: 'Max Sheet Stack (mm)', field: 'max_sheet_stack_mm', type: 'number' },
  ],
  end_of_line: [
    { label: 'Capacity (u/min)', field: 'capacity_units_per_min', type: 'number' },
  ],
  collar: [
    { label: 'Max Collar Length (mm)', field: 'max_collar_length_mm', type: 'number' },
    { label: 'Max Collar Width (mm)', field: 'max_collar_width_mm', type: 'number' },
    { label: 'Programmable Sides', field: 'programmable_sides', type: 'number' },
  ],
  main_frame: [
    { label: 'Frame Length (mm)', field: 'main_frame_length_mm', type: 'number' },
    { label: 'Frame Width (mm)', field: 'main_frame_width_mm', type: 'number' },
  ],
};

const SPEC_TABLE_MAP: Record<string, string> = {
  palletizer: 'palletizer_specs',
  conveyor: 'conveyor_specs',
  manipulator: 'manipulator_specs',
  wrapper: 'wrapper_specs',
  turn_unit: 'turn_unit_specs',
  pallet_dispenser: 'pallet_dispenser_specs',
  sheet_dispenser: 'sheet_dispenser_specs',
  end_of_line: 'end_of_line_specs',
  collar: 'collar_specs',
  main_frame: 'main_frame_specs'
};

export const CatalogAdminPanel: React.FC = () => {
  const { setStep, loadCatalog } = useConfiguratorStore();

  // Reference tables data
  const [componentTypes, setComponentTypes] = useState<ComponentType[]>([]);
  const [locations, setLocations] = useState<LocationType[]>([]);
  const [transportTypes, setTransportTypes] = useState<TransportType[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [orientations, setOrientations] = useState<OrientationType[]>([]);

  // Catalog data
  const [components, setComponents] = useState<CatalogComponent[]>([]);
  const [transportJunctions, setTransportJunctions] = useState<{ component_id: number; transport_type_id: number }[]>([]);
  const [productJunctions, setProductJunctions] = useState<{ component_id: number; product_type_id: number }[]>([]);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeIdFilter, setSelectedTypeIdFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [selectedComponent, setSelectedComponent] = useState<CatalogComponent | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [price, setPrice] = useState('');
  const [locationId, setLocationId] = useState<string>('');
  const [modelId, setModelId] = useState('');
  const [modelPath, setModelPath] = useState('');
  const [available, setAvailable] = useState(true);
  const [componentTypeId, setComponentTypeId] = useState<string>('');
  const [checkedTransportTypes, setCheckedTransportTypes] = useState<number[]>([]);
  const [checkedProductTypes, setCheckedProductTypes] = useState<number[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [specFormValues, setSpecFormValues] = useState<Record<string, any>>({});
  const [loadingSpecs, setLoadingSpecs] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch metadata lookup tables
      const { data: ctData } = await supabase.from('component_types').select('*');
      const { data: locData } = await supabase.from('locations').select('*');
      const { data: ttData } = await supabase.from('transport_types').select('*');
      const { data: ptData } = await supabase.from('product_types').select('*');
      const { data: orData } = await supabase.from('orientations').select('*');

      setComponentTypes(ctData || []);
      setLocations(locData || []);
      setTransportTypes(ttData || []);
      setProductTypes(ptData || []);
      setOrientations(orData || []);

      // 2. Fetch all components (available & unavailable)
      const { data: compData, error: compErr } = await supabase
        .from('components')
        .select('*')
        .order('id', { ascending: true });

      if (compErr) throw compErr;
      setComponents(compData || []);

      // 3. Fetch junction tables
      const { data: tjData } = await supabase.from('component_transport_types').select('*');
      const { data: pjData } = await supabase.from('component_product_types').select('*');

      setTransportJunctions(tjData || []);
      setProductJunctions(pjData || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Error al cargar los datos del catálogo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      await Promise.resolve();
      if (active) {
        fetchData();
      }
    };
    run();
    return () => {
      active = false;
    };
  }, []);

  // Handle component selection
  const handleSelectComponent = async (comp: CatalogComponent) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsCreatingNew(false);
    setSelectedComponent(comp);

    // Populate base fields
    setName(comp.name || '');
    setCode(comp.code || '');
    setPrice(comp.price_eur !== null ? String(comp.price_eur) : '');
    setLocationId(comp.location_id !== null ? String(comp.location_id) : '');
    setModelId(comp.model_id || '');
    setModelPath(comp.model_path || '');
    setAvailable(Boolean(comp.available));
    setComponentTypeId(String(comp.component_type_id));

    // Get junctions
    const tTypes = transportJunctions
      .filter((j) => j.component_id === comp.id)
      .map((j) => j.transport_type_id);
    const pTypes = productJunctions
      .filter((j) => j.component_id === comp.id)
      .map((j) => j.product_type_id);

    setCheckedTransportTypes(tTypes);
    setCheckedProductTypes(pTypes);

    // Fetch specifications on-demand
    const typeObj = componentTypes.find((t) => t.id === comp.component_type_id);
    const typeName = typeObj?.name || '';
    const specTable = SPEC_TABLE_MAP[typeName];

    if (specTable) {
      setLoadingSpecs(true);
      try {
        const { data: specs, error } = await supabase
          .from(specTable)
          .select('*')
          .eq('component_id', comp.id);
        
        if (error) throw error;
        if (specs && specs.length > 0) {
          setSpecFormValues(specs[0]);
        } else {
          setSpecFormValues({});
        }
      } catch (err) {
        console.error('Error loading specs:', err);
        setSpecFormValues({});
      } finally {
        setLoadingSpecs(false);
      }
    } else {
      setSpecFormValues({});
    }
  };

  // Handle click on "+ Add Component"
  const handleAddNewTrigger = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSelectedComponent(null);
    setIsCreatingNew(true);

    // Reset base fields
    setName('');
    setCode('');
    setPrice('');
    setLocationId('');
    setModelId('');
    setModelPath('');
    setAvailable(true);
    
    // Default to first component type
    const defaultTypeId = componentTypes[0]?.id ? String(componentTypes[0].id) : '';
    setComponentTypeId(defaultTypeId);

    setCheckedTransportTypes([]);
    setCheckedProductTypes([]);
    setSpecFormValues({});
  };

  // Handle component type change in creation form
  const handleTypeChange = (newTypeId: string) => {
    setComponentTypeId(newTypeId);
    setSpecFormValues({});
  };

  // Handle transport type checkbox toggle
  const handleTransportCheckbox = (id: number) => {
    if (checkedTransportTypes.includes(id)) {
      setCheckedTransportTypes(checkedTransportTypes.filter((tId) => tId !== id));
    } else {
      setCheckedTransportTypes([...checkedTransportTypes, id]);
    }
  };

  // Handle product type checkbox toggle
  const handleProductCheckbox = (id: number) => {
    if (checkedProductTypes.includes(id)) {
      setCheckedProductTypes(checkedProductTypes.filter((pId) => pId !== id));
    } else {
      setCheckedProductTypes([...checkedProductTypes, id]);
    }
  };

  // Handle spec input updates
  const handleSpecInputChange = (field: string, val: string) => {
    setSpecFormValues({
      ...specFormValues,
      [field]: val,
    });
  };

  // Validate form inputs
  const validateForm = (): boolean => {
    if (!name.trim()) {
      setErrorMsg('El nombre es obligatorio.');
      return false;
    }

    if (!code.trim()) {
      setErrorMsg('El código de componente es obligatorio.');
      return false;
    }

    const codeRegex = /^[a-zA-Z0-9.\-_]+$/;
    if (!codeRegex.test(code)) {
      setErrorMsg('El código de componente debe ser alfanumérico y puede incluir guiones o puntos.');
      return false;
    }

    if (price !== '') {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        setErrorMsg('El precio debe ser un número no negativo.');
        return false;
      }
    }

    return true;
  };

  // Save changes (Insert or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!validateForm()) return;

    setSaving(true);
    try {
      const typeIdNum = parseInt(componentTypeId, 10);
      const parsedPrice = price !== '' ? parseFloat(price) : null;
      const parsedLocationId = locationId !== '' ? parseInt(locationId, 10) : null;

      let componentId: number;

      if (isCreatingNew) {
        // Create new component record
        const { data, error } = await supabase
          .from('components')
          .insert({
            component_type_id: typeIdNum,
            code: code.trim(),
            name: name.trim(),
            price_eur: parsedPrice,
            location_id: parsedLocationId,
            model_id: modelId.trim() || null,
            model_path: modelPath.trim() || null,
            available: true,
          })
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new Error('No se recibieron datos tras la inserción');
        componentId = data.id;
      } else {
        if (!selectedComponent) throw new Error('No hay componente seleccionado');
        
        // Update existing component record
        const { error } = await supabase
          .from('components')
          .update({
            code: code.trim(),
            name: name.trim(),
            price_eur: parsedPrice,
            location_id: parsedLocationId,
            model_id: modelId.trim() || null,
            model_path: modelPath.trim() || null,
            available,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedComponent.id);

        if (error) throw error;
        componentId = selectedComponent.id;
      }

      // Rebuild Junction Tables
      // 1. Delete existing transport types junctions
      const { error: delTError } = await supabase
        .from('component_transport_types')
        .delete()
        .eq('component_id', componentId);
      if (delTError) throw delTError;

      // Insert new transport types junctions
      if (checkedTransportTypes.length > 0) {
        const { error: insTError } = await supabase
          .from('component_transport_types')
          .insert(
            checkedTransportTypes.map((tId) => ({
              component_id: componentId,
              transport_type_id: tId,
            }))
          );
        if (insTError) throw insTError;
      }

      // 2. Delete existing product types junctions
      const { error: delPError } = await supabase
        .from('component_product_types')
        .delete()
        .eq('component_id', componentId);
      if (delPError) throw delPError;

      // Insert new product types junctions
      if (checkedProductTypes.length > 0) {
        const { error: insPError } = await supabase
          .from('component_product_types')
          .insert(
            checkedProductTypes.map((pId) => ({
              component_id: componentId,
              product_type_id: pId,
            }))
          );
        if (insPError) throw insPError;
      }

      // Handle specifications table
      const typeObj = componentTypes.find((t) => t.id === typeIdNum);
      const typeName = typeObj?.name || '';
      const specTable = SPEC_TABLE_MAP[typeName];

      if (specTable) {
        // Formulate spec data object to save
        const specFields = SPEC_FIELDS_MAP[typeName] || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const specDataToSave: Record<string, any> = {};

        specFields.forEach((f) => {
          const rawVal = specFormValues[f.field];
          if (rawVal === undefined || rawVal === '') {
            specDataToSave[f.field] = null;
          } else if (f.type === 'number') {
            if (f.field === 'max_product_weight_kg') {
              const parsed = parseFloat(rawVal);
              specDataToSave[f.field] = isNaN(parsed) ? null : parsed;
            } else {
              const parsed = parseInt(rawVal, 10);
              specDataToSave[f.field] = isNaN(parsed) ? null : parsed;
            }
          } else if (f.type === 'select_orientation') {
            const parsed = parseInt(rawVal, 10);
            specDataToSave[f.field] = isNaN(parsed) ? null : parsed;
          } else {
            specDataToSave[f.field] = rawVal;
          }
        });

        // Query if specs row exists (supports mock environment safely)
        const { data: existingSpecs } = await supabase
          .from(specTable)
          .select('*')
          .eq('component_id', componentId);

        if (existingSpecs && existingSpecs.length > 0) {
          // Update
          const { error: specUpdateError } = await supabase
            .from(specTable)
            .update({
              ...specDataToSave,
              updated_at: new Date().toISOString(),
            })
            .eq('component_id', componentId);
          
          if (specUpdateError) throw specUpdateError;
        } else {
          // Insert
          const { error: specInsertError } = await supabase
            .from(specTable)
            .insert({
              component_id: componentId,
              ...specDataToSave,
            });

          if (specInsertError) throw specInsertError;
        }
      }

      setSuccessMsg('Componente guardado con éxito.');
      
      // Reload local data
      await fetchData();
      
      // Reset selected or update to saved
      setSelectedComponent(null);
      setIsCreatingNew(false);
    } catch (err) {
      console.error('Error saving component:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Error al guardar los datos del componente');
    } finally {
      setSaving(false);
    }
  };

  // Back to Lobby navigation
  const handleBackToLobby = async () => {
    setStep('LOBBY');
    await loadCatalog(); // Refreshes configurator cache
  };

  // Filter components list
  const filteredComponents = components.filter((comp) => {
    const matchesSearch =
      comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (comp.code && comp.code.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType =
      selectedTypeIdFilter === 'all' ||
      String(comp.component_type_id) === selectedTypeIdFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'radial-gradient(circle at center, #111625 0%, #080a10 100%)',
        color: 'hsl(var(--text-primary))',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          padding: '20px 32px',
          borderBottom: '1px solid hsl(var(--border-color))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.3)',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'hsl(var(--brand-primary))',
              textTransform: 'uppercase',
              letterSpacing: '2px',
            }}
          >
            Panel de control
          </span>
          <h1 className="title-gradient" style={{ fontSize: '24px', marginTop: '4px', fontWeight: 700 }}>
            🛠️ Administración de Catálogo
          </h1>
        </div>

        <button className="btn-secondary" onClick={handleBackToLobby} style={{ padding: '8px 16px', borderRadius: '6px' }}>
          ⬅️ Volver al Lobby
        </button>
      </div>

      {/* Main Panel Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px' }}>
        
        {/* Left column - Components list */}
        <div
          className="glass-panel"
          style={{
            flex: '0 0 400px',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '12px',
            border: '1px solid hsl(var(--border-color))',
            backgroundColor: 'rgba(255,255,255,0.01)',
            padding: '20px',
            maxHeight: 'calc(100vh - 120px)',
          }}
        >
          {/* Search box */}
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Buscar por código o nombre..."
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px', fontSize: '13px', borderRadius: '6px' }}
            />
          </div>

          {/* Type filter */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>
              Filtrar por tipo:
            </label>
            <select
              className="form-input"
              value={selectedTypeIdFilter}
              onChange={(e) => setSelectedTypeIdFilter(e.target.value)}
              style={{ width: '100%', padding: '8px', fontSize: '13px', borderRadius: '6px', backgroundColor: 'rgba(20,25,40,0.8)' }}
            >
              <option value="all">Todos los tipos</option>
              {componentTypes.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Add Component Trigger Button */}
          <button
            className="btn-primary"
            onClick={handleAddNewTrigger}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}
          >
            ➕ Añadir Componente
          </button>

          {/* Components list scrolling container */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'hsl(var(--text-muted))' }}>
                Cargando catálogo...
              </div>
            ) : filteredComponents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'hsl(var(--text-muted))', fontSize: '13px' }}>
                No se encontraron componentes
              </div>
            ) : (
              filteredComponents.map((comp) => {
                const compType = componentTypes.find((t) => t.id === comp.component_type_id)?.name || '';
                const isSelected = selectedComponent?.id === comp.id;

                return (
                  <div
                    key={comp.id}
                    onClick={() => handleSelectComponent(comp)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: isSelected
                        ? '1px solid hsl(var(--brand-primary))'
                        : '1px solid hsl(var(--border-color) / 0.4)',
                      backgroundColor: isSelected
                        ? 'rgba(var(--brand-primary-rgb), 0.1)'
                        : 'rgba(255,255,255,0.01)',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s, border-color 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>
                        {comp.code || 'SIN CÓDIGO'}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: comp.available ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)',
                          color: comp.available ? 'hsl(145, 80%, 45%)' : 'hsl(0, 80%, 60%)',
                        }}
                      >
                        {comp.available ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '4px 0', color: 'hsl(var(--text-primary))' }}>
                      {comp.name}
                    </h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'hsl(var(--text-muted))' }}>
                      <span>Tipo: {compType}</span>
                      <span>{comp.price_eur !== null ? `€${comp.price_eur.toLocaleString()}` : 'Sin precio'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column - Editor form */}
        <div
          className="glass-panel"
          style={{
            flex: 1,
            borderRadius: '12px',
            border: '1px solid hsl(var(--border-color))',
            backgroundColor: 'rgba(255,255,255,0.01)',
            padding: '24px',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 120px)',
          }}
        >
          {errorMsg && (
            <div
              style={{
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                border: '1px solid hsl(var(--state-error))',
                color: 'hsl(var(--state-error))',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '16px',
                fontSize: '13px',
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                border: '1px solid hsl(145, 80%, 45%)',
                color: 'hsl(145, 80%, 45%)',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '16px',
                fontSize: '13px',
              }}
            >
              ✅ {successMsg}
            </div>
          )}

          {!selectedComponent && !isCreatingNew ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'hsl(var(--text-muted))',
                textAlign: 'center',
                padding: '40px',
              }}
            >
              <span style={{ fontSize: '48px', marginBottom: '16px' }}>⚙️</span>
              <h3>Formulario de Edición</h3>
              <p style={{ fontSize: '13px', marginTop: '6px', maxWidth: '360px' }}>
                Selecciona un componente de la lista de la izquierda para editar sus propiedades, o haz clic en "Añadir Componente" para crear uno nuevo.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'hsl(var(--brand-primary))', borderBottom: '1px solid hsl(var(--border-color) / 0.4)', paddingBottom: '10px' }}>
                {isCreatingNew ? 'Nuevo Componente' : `Editar Componente: ${name}`}
              </h2>

              {/* Base Component details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="comp-name" style={{ fontSize: '12px', fontWeight: 600, color: 'hsl(var(--text-muted))' }}>
                    Nombre del Componente *
                  </label>
                  <input
                    id="comp-name"
                    type="text"
                    required
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px' }}
                    placeholder="Ej. V-STACK 630"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="comp-code" style={{ fontSize: '12px', fontWeight: 600, color: 'hsl(var(--text-muted))' }}>
                    Código de Componente *
                  </label>
                  <input
                    id="comp-code"
                    type="text"
                    required
                    className="form-input"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px' }}
                    placeholder="Ej. VE088035"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="comp-price" style={{ fontSize: '12px', fontWeight: 600, color: 'hsl(var(--text-muted))' }}>
                    Precio (€)
                  </label>
                  <input
                    id="comp-price"
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px' }}
                    placeholder="Ej. 315000"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="comp-type" style={{ fontSize: '12px', fontWeight: 600, color: 'hsl(var(--text-muted))' }}>
                    Tipo de Componente *
                  </label>
                  <select
                    id="comp-type"
                    className="form-input"
                    value={componentTypeId}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    disabled={!isCreatingNew}
                    style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: isCreatingNew ? 'rgba(20,25,40,0.8)' : 'rgba(20,25,40,0.4)' }}
                  >
                    {componentTypes.map((t) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="comp-location" style={{ fontSize: '12px', fontWeight: 600, color: 'hsl(var(--text-muted))' }}>
                    Ubicación (Línea)
                  </label>
                  <select
                    id="comp-location"
                    className="form-input"
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(20,25,40,0.8)' }}
                  >
                    <option value="">Ninguna / No aplica</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={String(loc.id)}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="comp-model-id" style={{ fontSize: '12px', fontWeight: 600, color: 'hsl(var(--text-muted))' }}>
                    ID de Modelo 3D (Legacy)
                  </label>
                  <input
                    id="comp-model-id"
                    type="text"
                    className="form-input"
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px' }}
                    placeholder="Ej. v-stack_630"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }}>
                  <label htmlFor="comp-model-path" style={{ fontSize: '12px', fontWeight: 600, color: 'hsl(var(--text-muted))' }}>
                    Ruta del Archivo 3D (.glb)
                  </label>
                  <input
                    id="comp-model-path"
                    type="text"
                    className="form-input"
                    value={modelPath}
                    onChange={(e) => setModelPath(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px' }}
                    placeholder="Ej. /3d/Palletizer/v-stack_630.glb"
                  />
                </div>
              </div>

              {/* Checkboxes group for soft-delete & junctions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid hsl(var(--border-color) / 0.3)' }}>
                {/* Available toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    id="comp-available"
                    type="checkbox"
                    checked={available}
                    onChange={(e) => setAvailable(e.target.checked)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <label htmlFor="comp-available" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    Componente Disponible (Soft-delete / Toggle Activo)
                  </label>
                </div>

                {/* Transport Types Supported */}
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'hsl(var(--text-muted))', marginBottom: '8px' }}>
                    Tipos de Transporte Soportados
                  </h4>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {transportTypes.map((t) => (
                      <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={checkedTransportTypes.includes(t.id)}
                          onChange={() => handleTransportCheckbox(t.id)}
                          style={{ width: '14px', height: '14px' }}
                        />
                        {t.name}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Product Types Supported */}
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'hsl(var(--text-muted))', marginBottom: '8px' }}>
                    Formatos de Producto Soportados
                  </h4>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {productTypes.map((p) => (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={checkedProductTypes.includes(p.id)}
                          onChange={() => handleProductCheckbox(p.id)}
                          style={{ width: '14px', height: '14px' }}
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Specifications Sub-Form (Dynamic) */}
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(var(--brand-secondary))', marginBottom: '12px', borderBottom: '1px solid hsl(var(--border-color) / 0.4)', paddingBottom: '6px' }}>
                  Especificaciones Técnicas (Dinámicas)
                </h3>

                {loadingSpecs ? (
                  <div style={{ color: 'hsl(var(--text-muted))', fontSize: '13px' }}>
                    Cargando especificaciones desde la base de datos...
                  </div>
                ) : (() => {
                  const typeObj = componentTypes.find((t) => t.id === parseInt(componentTypeId, 10));
                  const typeName = typeObj?.name || '';

                  if (typeName === 'infeed') {
                    return (
                      <p style={{ fontSize: '13px', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>
                        Este tipo de componente ("infeed") no requiere especificaciones técnicas adicionales en el modelo de base de datos.
                      </p>
                    );
                  }

                  const specFields = SPEC_FIELDS_MAP[typeName] || [];
                  if (specFields.length === 0) {
                    return (
                      <p style={{ fontSize: '13px', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>
                        Selecciona un tipo de componente válido para definir sus especificaciones.
                      </p>
                    );
                  }

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      {specFields.map((f) => {
                        const inputId = `spec-${f.field}`;
                        const currentVal = specFormValues[f.field] !== undefined ? String(specFormValues[f.field]) : '';

                        if (f.type === 'select' && f.options) {
                          return (
                            <div key={f.field} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label htmlFor={inputId} style={{ fontSize: '12px', fontWeight: 600, color: 'hsl(var(--text-muted))' }}>
                                {f.label}
                              </label>
                              <select
                                id={inputId}
                                className="form-input"
                                value={currentVal}
                                onChange={(e) => handleSpecInputChange(f.field, e.target.value)}
                                style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(20,25,40,0.8)' }}
                              >
                                <option value="">Seleccionar...</option>
                                {f.options.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        }

                        if (f.type === 'select_orientation') {
                          return (
                            <div key={f.field} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label htmlFor={inputId} style={{ fontSize: '12px', fontWeight: 600, color: 'hsl(var(--text-muted))' }}>
                                {f.label}
                              </label>
                              <select
                                id={inputId}
                                className="form-input"
                                value={currentVal}
                                onChange={(e) => handleSpecInputChange(f.field, e.target.value)}
                                style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(20,25,40,0.8)' }}
                              >
                                <option value="">Seleccionar orientación...</option>
                                {orientations.map((o) => (
                                  <option key={o.id} value={String(o.id)}>
                                    {o.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        }

                        return (
                          <div key={f.field} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label htmlFor={inputId} style={{ fontSize: '12px', fontWeight: 600, color: 'hsl(var(--text-muted))' }}>
                              {f.label}
                            </label>
                            <input
                              id={inputId}
                              type={f.type}
                              className="form-input"
                              value={currentVal}
                              onChange={(e) => handleSpecInputChange(f.field, e.target.value)}
                              style={{ padding: '8px 12px', borderRadius: '6px' }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid hsl(var(--border-color) / 0.4)', paddingTop: '20px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                  style={{ flex: 1, padding: '12px', borderRadius: '6px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
                >
                  {saving ? 'Guardando...' : 'Guardar Componente'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setSelectedComponent(null);
                    setIsCreatingNew(false);
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="btn-secondary"
                  style={{ padding: '12px 24px', borderRadius: '6px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CatalogAdminPanel;
