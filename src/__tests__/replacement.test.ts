/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, beforeEach } from 'vitest';
import { useConfiguratorStore, type ConfiguratorState } from '../store/useConfiguratorStore';
import { mockDb, resetMockDb } from '../lib/__mocks__/supabaseClient';

// Store Proxy to prevent reading stale Zustand state references in tests
const store: ConfiguratorState = new Proxy({} as any, {
  get(_target, prop) {
    const state = useConfiguratorStore.getState();
    const val = (state as any)[prop];
    if (typeof val === 'function') {
      return val.bind(state);
    }
    return val;
  },
  set(_target, prop, value) {
    const state = useConfiguratorStore.getState();
    (state as any)[prop] = value;
    return true;
  }
});

describe('Configurator Component Replacement Tests', () => {
  beforeEach(async () => {
    useConfiguratorStore.getState().resetConfiguratorState();
    await useConfiguratorStore.getState().setActiveProfile(null);
    resetMockDb();
  });

  test('should successfully replace a component preserving position, rotation, and clearing options', async () => {
    store.setStep('EDITOR');

    // 1. Load the mock catalog into the store
    await store.loadCatalog();
    expect(store.catalog.length).toBeGreaterThan(0);

    // 2. Select a palletizer (V-STACK 535, id: 3)
    const palletizer = store.catalog.find((c) => c.id === 3)!;
    store.selectPalletizer(palletizer, 'RODILLO');
    expect(store.placedComponents.length).toBe(1);

    // 3. Add a conveyor (Roller Conveyor, id: 11)
    const conveyor = store.catalog.find((c) => c.id === 11)!;
    store.addComponentToScene(conveyor, [2.5, 0, -1.5]);
    expect(store.placedComponents.length).toBe(2);

    const placedConveyor = store.placedComponents.find((c) => c.id === 11)!;
    expect(placedConveyor).toBeDefined();
    
    // Save the snapped position of the placed conveyor
    const originalPlacedPosition = [...placedConveyor.position] as [number, number, number];
    
    // Simulate setting custom rotation and mock option accessories on the placed conveyor
    store.updateComponentRotation(placedConveyor.uuid, [0, Math.PI / 2, 0]);
    store.toggleComponentOption(placedConveyor.uuid, 'conveyor_accessory', {
      id: 1,
      name: 'Pallet Centre Unit',
      price_eur: 1500.00
    });

    const modifiedConveyor = store.placedComponents.find((c) => c.uuid === placedConveyor.uuid)!;
    expect(modifiedConveyor.rotation).toEqual([0, Math.PI / 2, 0]);
    expect(modifiedConveyor.options.length).toBe(1);

    // 4. Enter replacement mode for this conveyor
    store.setReplacingComponentUuid(placedConveyor.uuid);
    expect(store.replacingComponentUuid).toBe(placedConveyor.uuid);

    // 5. Replace with another conveyor (Chain Conveyor, id: 17)
    const newConveyor = store.catalog.find((c) => c.id === 17)!;
    store.replaceComponent(placedConveyor.uuid, newConveyor);

    // 6. Verify replacement results
    const replaced = store.placedComponents.find((c) => c.uuid === placedConveyor.uuid)!;
    expect(replaced).toBeDefined();
    expect(replaced.id).toBe(17);
    expect(replaced.name).toBe(newConveyor.name);
    
    // Position and rotation must be preserved exactly
    expect(replaced.position).toEqual(originalPlacedPosition);
    expect(replaced.rotation).toEqual([0, Math.PI / 2, 0]);
    
    // Options must be cleared
    expect(replaced.options.length).toBe(0);
    
    // Replacement mode must be cleared
    expect(store.replacingComponentUuid).toBeNull();
  });

  test('should automatically cancel replacement mode when selecting a different component or deselecting', () => {
    store.setStep('EDITOR');

    // Add two components
    const conveyor1 = mockDb.components.find((c) => c.id === 11)!;
    store.addComponentToScene(conveyor1, [1, 0, 0]);
    const uuid1 = store.placedComponents[0].uuid;

    const conveyor2 = mockDb.components.find((c) => c.id === 17)!;
    store.addComponentToScene(conveyor2, [2, 0, 0]);
    const uuid2 = store.placedComponents[1].uuid;

    // Start replacement mode for component 1 (select it first)
    store.selectComponent(uuid1);
    store.setReplacingComponentUuid(uuid1);
    expect(store.replacingComponentUuid).toBe(uuid1);

    // Select component 2
    store.selectComponent(uuid2);
    expect(store.replacingComponentUuid).toBeNull();
    expect(store.selectedComponentUuid).toBe(uuid2);

    // Start replacement mode for component 2
    store.setReplacingComponentUuid(uuid2);
    expect(store.replacingComponentUuid).toBe(uuid2);

    // Deselect (selectComponent(null))
    store.selectComponent(null);
    expect(store.replacingComponentUuid).toBeNull();
    expect(store.selectedComponentUuid).toBeNull();
  });

  test('should cancel replacement mode when removing the replacing component itself', () => {
    const conveyor = mockDb.components.find((c) => c.id === 11)!;
    store.addComponentToScene(conveyor, [0, 0, 0]);
    const uuid = store.placedComponents[0].uuid;

    store.setReplacingComponentUuid(uuid);
    expect(store.replacingComponentUuid).toBe(uuid);

    // Remove the component
    store.removeComponentFromScene(uuid);
    expect(store.replacingComponentUuid).toBeNull();
  });
});
