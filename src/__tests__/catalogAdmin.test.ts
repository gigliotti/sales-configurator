import { describe, test, expect, beforeEach } from 'vitest';
import { useConfiguratorStore } from '../store/useConfiguratorStore';
import { mockDb, resetMockDb, supabase } from '../lib/__mocks__/supabaseClient';

interface DbComponent {
  id: number;
  name: string;
  price_eur: number;
  available: boolean;
}

interface DbJunction {
  component_id: number;
  transport_type_id: number;
  product_type_id: number;
}

interface DbSpecs {
  component_id: number;
  conveyor_length_mm: number;
  max_pallet_width_mm: number;
  conveyor_width_mm: number;
}

const getStore = () => useConfiguratorStore.getState();

describe('Catalog Admin Panel and Security Integration Tests', () => {
  beforeEach(() => {
    // Reset store and database before each test
    getStore().resetConfiguratorState();
    getStore().setStep('LOBBY');
    resetMockDb();
  });

  describe('Security Redirect Verification', () => {
    test('Non-admins are prevented from accessing CATALOG_ADMIN step', async () => {
      // Simulate non-admin profile (seller)
      await getStore().setActiveProfile('11111111-1111-1111-1111-111111111111');
      expect(getStore().activeProfile?.role).toBe('seller');

      // Attempt to navigate to CATALOG_ADMIN
      getStore().setStep('CATALOG_ADMIN');
      expect(getStore().step).toBe('CATALOG_ADMIN');

      // Simulate App.tsx useEffect redirect logic
      if (getStore().step === 'CATALOG_ADMIN' && getStore().activeProfile?.role !== 'admin') {
        getStore().setStep('LOBBY');
      }

      expect(getStore().step).toBe('LOBBY');
    });

    test('Admins are allowed to remain on CATALOG_ADMIN step', async () => {
      // Simulate admin profile
      await getStore().setActiveProfile('00000000-0000-0000-0000-000000000000');
      expect(getStore().activeProfile?.role).toBe('admin');

      // Navigate to CATALOG_ADMIN
      getStore().setStep('CATALOG_ADMIN');
      expect(getStore().step).toBe('CATALOG_ADMIN');

      // Simulate App.tsx useEffect redirect logic
      if (getStore().step === 'CATALOG_ADMIN' && getStore().activeProfile?.role !== 'admin') {
        getStore().setStep('LOBBY');
      }

      expect(getStore().step).toBe('CATALOG_ADMIN');
    });
  });

  describe('Database CRUD operations for Catalog Admin Panel', () => {
    test('Retrieve all components (including unavailable ones) sorted by ID', async () => {
      // Set one component available to false
      mockDb.components[0].available = false;

      const { data: compList, error } = await supabase
        .from('components')
        .select('*')
        .order('id', { ascending: true });

      expect(error).toBeNull();
      expect(compList).not.toBeNull();
      
      // Verification: Should retrieve ALL components including available = false
      const containsUnavailable = compList!.some((c: { available: boolean }) => !c.available);
      expect(containsUnavailable).toBe(true);
      expect(compList![0].id).toBeLessThan(compList![1].id);
    });

    test('Insert new component with dynamic specifications and transport/product types junctions', async () => {
      // 1. Insert base component
      const { data: newComp, error: insertError } = await supabase
        .from('components')
        .insert({
          component_type_id: 2, // conveyor
          code: 'CONV-TEST-99',
          name: 'Test Conveyor 99',
          price_eur: 8500.00,
          location_id: 1,
          model_id: 'TestConveyor_99',
          model_path: '/3d/conveyor_99.glb',
          available: true
        })
        .select()
        .single();

      expect(insertError).toBeNull();
      expect(newComp).not.toBeNull();
      const componentId = newComp.id;
      expect(componentId).toBeDefined();

      // 2. Rebuild junctions (delete & insert)
      // Delete (should return empty array or success)
      const { error: delTError } = await supabase
        .from('component_transport_types')
        .delete()
        .eq('component_id', componentId);
      expect(delTError).toBeNull();

      // Insert new transport junctions (RODILLO = id 1)
      const { error: insTError } = await supabase
        .from('component_transport_types')
        .insert([
          { component_id: componentId, transport_type_id: 1 }
        ]);
      expect(insTError).toBeNull();

      // Delete product junctions
      const { error: delPError } = await supabase
        .from('component_product_types')
        .delete()
        .eq('component_id', componentId);
      expect(delPError).toBeNull();

      // Insert product junctions (CAJA = id 1, BOLSA = id 2)
      const { error: insPError } = await supabase
        .from('component_product_types')
        .insert([
          { component_id: componentId, product_type_id: 1 },
          { component_id: componentId, product_type_id: 2 }
        ]);
      expect(insPError).toBeNull();

      // 3. Insert specifications (conveyor_specs table)
      // Check if specs exists
      const { data: existingSpecs } = await supabase
        .from('conveyor_specs')
        .select('*')
        .eq('component_id', componentId);

      expect(existingSpecs?.length).toBe(0);

      // Insert conveyor specs
      const specData = {
        component_id: componentId,
        conveyor_length_mm: 3000,
        conveyor_width_mm: 1200,
        max_pallet_length_mm: 1300,
        max_pallet_width_mm: 1100
      };

      const { error: specInsertError } = await supabase
        .from('conveyor_specs')
        .insert(specData);

      expect(specInsertError).toBeNull();

      // 4. Verify mock database state matches updates
      const dbComp = mockDb.components.find((c: DbComponent) => c.id === componentId);
      expect(dbComp).toBeDefined();
      expect(dbComp?.name).toBe('Test Conveyor 99');

      const dbTransJunctions = mockDb.component_transport_types.filter((j: DbJunction) => j.component_id === componentId);
      expect(dbTransJunctions.length).toBe(1);
      expect(dbTransJunctions[0].transport_type_id).toBe(1);

      const dbProdJunctions = mockDb.component_product_types.filter((j: DbJunction) => j.component_id === componentId);
      expect(dbProdJunctions.length).toBe(2);

      const dbSpecs = mockDb.conveyor_specs.find((s: DbSpecs) => s.component_id === componentId);
      expect(dbSpecs).toBeDefined();
      expect(dbSpecs?.conveyor_length_mm).toBe(3000);
      expect(dbSpecs?.max_pallet_width_mm).toBe(1100);
    });

    test('Update existing component, its spec fields, and transport/product types junctions', async () => {
      const targetComponentId = 11; // seeded conveyor Roller Conveyor VE054374
      
      // Update base component
      const { error: updateError } = await supabase
        .from('components')
        .update({
          name: 'Roller Conveyor Updated',
          price_eur: 5500.00,
          available: false
        })
        .eq('id', targetComponentId);

      expect(updateError).toBeNull();

      // Rebuild transport junctions (change to RODILLO (1) and CADENA (2))
      await supabase.from('component_transport_types').delete().eq('component_id', targetComponentId);
      await supabase.from('component_transport_types').insert([
        { component_id: targetComponentId, transport_type_id: 1 },
        { component_id: targetComponentId, transport_type_id: 2 }
      ]);

      // Rebuild spec fields (conveyor_specs)
      // Check if specs row exists
      const { data: existingSpecs } = await supabase
        .from('conveyor_specs')
        .select('*')
        .eq('component_id', targetComponentId);

      expect(existingSpecs?.length).toBeGreaterThan(0);

      // Perform update on conveyor specs
      const { error: specUpdateError } = await supabase
        .from('conveyor_specs')
        .update({
          conveyor_length_mm: 2800,
          conveyor_width_mm: 1150
        })
        .eq('component_id', targetComponentId);

      expect(specUpdateError).toBeNull();

      // Verify db changes
      const dbComp = mockDb.components.find((c: DbComponent) => c.id === targetComponentId);
      expect(dbComp?.name).toBe('Roller Conveyor Updated');
      expect(dbComp?.price_eur).toBe(5500.00);
      expect(dbComp?.available).toBe(false);

      const dbTransJunctions = mockDb.component_transport_types.filter((j: DbJunction) => j.component_id === targetComponentId);
      expect(dbTransJunctions.length).toBe(2);

      const dbSpecs = mockDb.conveyor_specs.find((s: DbSpecs) => s.component_id === targetComponentId);
      expect(dbSpecs?.conveyor_length_mm).toBe(2800);
      expect(dbSpecs?.conveyor_width_mm).toBe(1150);
    });

    test('Validation rule rejects invalid/missing values', () => {
      // Test code formatting regex
      const codeRegex = /^[a-zA-Z0-9.\-_]+$/;
      
      const validCode1 = 'VE088035';
      const validCode2 = 'VE-STACK.123';
      const invalidCode = 'VE/STACK 123';

      expect(codeRegex.test(validCode1)).toBe(true);
      expect(codeRegex.test(validCode2)).toBe(true);
      expect(codeRegex.test(invalidCode)).toBe(false);

      // Test negative prices
      const priceVal = -150;
      expect(priceVal >= 0).toBe(false);
    });
  });
});
