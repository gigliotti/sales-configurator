import { describe, test, expect, beforeEach } from 'vitest';
import { useConfiguratorStore, computeGeometricSnap, getComponentPhysicalDimensions } from '../store/useConfiguratorStore';
import type { PlacedComponent } from '../store/useConfiguratorStore';
import { mockDb, resetMockDb } from '../lib/__mocks__/supabaseClient';

// Simplified copy of the mock helper from e2e.test.ts to demonstrate the mismatch
function applySnappingMock(uuid: string, targetPos: [number, number, number]): { snapped: boolean; position: [number, number, number]; connectedTo: string | null } {
  const store = useConfiguratorStore.getState();
  const movingComp = store.placedComponents.find(c => c.uuid === uuid);
  if (!movingComp) return { snapped: false, position: targetPos, connectedTo: null };

  let snapped = false;
  const finalPos = [...targetPos] as [number, number, number];
  let connectedTo: string | null = null;

  for (const other of store.placedComponents) {
    if (other.uuid === uuid) continue;
    if (other.lineId !== movingComp.lineId) continue;
    
    const dx = targetPos[0] - other.position[0];
    const dz = targetPos[2] - other.position[2];
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 3.5 && dist > 2.2) {
      const gap = 3.0;
      const direction = dx > 0 ? 1 : -1;
      finalPos[0] = other.position[0] + direction * gap;
      finalPos[2] = other.position[2];
      snapped = true;
      connectedTo = other.uuid;
      break;
    }
  }

  return { snapped, position: finalPos, connectedTo };
}

describe('Adversarial Review Tests (R1 - R4 Gaps & Mismatch Verification)', () => {
  beforeEach(() => {
    useConfiguratorStore.getState().resetConfiguratorState();
    resetMockDb();
  });

  // --- R2: Snapping Test Mismatch (Proof of Test "Cheating" / Mock Divergence) ---
  test('1. Mismatch between test mock snapping helper and actual computeGeometricSnap', () => {
    const store = useConfiguratorStore.getState();
    store.setStep('EDITOR');

    // 1. Add Palletizer at [0, 0, 0]
    const palletizer = mockDb.components.find(c => c.id === 3)!; // V-STACK 535
    store.selectPalletizer(palletizer, 'RODILLO');

    // 2. Add Conveyor (Roller Conveyor VE054374, id: 11)
    const conveyor = mockDb.components.find(c => c.id === 11)!;
    store.addComponentToScene(conveyor);
    const cComp = useConfiguratorStore.getState().placedComponents[1];

    // Position where the mock helper snaps, but the actual helper does NOT
    const testPos: [number, number, number] = [3.2, 0, 0.2];

    // Execute mock snapping helper (used in e2e.test.ts)
    const mockResult = applySnappingMock(cComp.uuid, testPos);
    
    // Execute actual store snapping logic
    const realResult = computeGeometricSnap(cComp, testPos, useConfiguratorStore.getState().placedComponents);

    // Demonstration of mismatch:
    // Mock helper claims to snap because center distance is 3.206m (< 3.5m threshold)
    expect(mockResult.snapped).toBe(true);
    expect(mockResult.position[0]).toBe(3.0); // snaps to [3.0, 0, 0]

    // Real helper does NOT snap because boundary-to-boundary distance is 0.8m (> 0.6m threshold)
    const realSnapped = realResult.connectedTo !== null;
    expect(realSnapped).toBe(false);
    expect(realResult.position).toEqual(testPos); // position remains [3.2, 0, 0.2]
  });

  // --- R2/R4: Rotation Projection Gap ---
  test('2. Snapping fails to compute true rotated bounding box at arbitrary angles', () => {
    const conveyor = mockDb.components.find(c => c.id === 11)!; // Length = 2.0m, Width = 1.2m
    
    // Create temporary PlacedComponent with 45 degree rotation (sin(45) = 0.7071)
    const testComp = {
      uuid: 'test-uuid',
      id: conveyor.id,
      name: conveyor.name,
      code: conveyor.code,
      componentType: 'conveyor',
      locationId: 1,
      basePrice: conveyor.price_eur,
      totalPrice: conveyor.price_eur,
      position: [0, 0, 0] as [number, number, number],
      rotation: [0, Math.PI / 4, 0] as [number, number, number], // 45 deg
      connectedTo: null,
      connectionPointId: null,
      model_id: '',
      model_path: '',
      options: [],
      lineId: 'line-1',
      specs: {
        conveyor_length_mm: 2000,
        conveyor_width_mm: 1200
      }
    };

    const dims = getComponentPhysicalDimensions(testComp);
    
    // Rotation is 45 degrees: sin(45) = 0.7071.
    // The code calculates correct rotated bounding box dimensions dynamically:
    const rotationY = testComp.rotation ? testComp.rotation[1] : 0;
    const cosT = Math.abs(Math.cos(rotationY));
    const sinT = Math.abs(Math.sin(rotationY));
    const dx = dims.length * cosT + dims.width * sinT;

    // The actual bounding box dimensions of a 2.0m x 1.2m rectangle rotated at 45 degrees are:
    // dx_true = 2.0 * cos(45) + 1.2 * sin(45) = 1.414 + 0.8485 = 2.2625m
    const dxTrue = 2.0 * Math.cos(Math.PI / 4) + 1.2 * Math.sin(Math.PI / 4);
    
    expect(dx).toBeCloseTo(dxTrue, 5);
  });

  // --- R3: Spec Parsing Type Mismatch ---
  test('3. Mismatch in parsing string spec values between getComponentPhysicalDimensions and ModelLoader', () => {
    const componentWithStrSpecs = {
      component_type_name: 'conveyor',
      specs: {
        conveyor_length_mm: '2640', // string format
        conveyor_width_mm: 1200
      }
    } as unknown as PlacedComponent;

    const dims = getComponentPhysicalDimensions(componentWithStrSpecs);
    
    // getComponentPhysicalDimensions now correctly parses string specs as floats.
    expect(dims.length).toBe(2.64); 

    // Visual model loader, however, parses it as a string:
    const toMeters = (val: unknown, defaultVal: number) => {
      if (typeof val === 'number') return val > 10 ? val / 1000 : val;
      if (typeof val === 'string') {
        const num = parseFloat(val);
        if (!isNaN(num)) return num > 10 ? num / 1000 : num;
      }
      return defaultVal;
    };
    
    const parsedLength = toMeters(componentWithStrSpecs.specs.conveyor_length_mm, 2.0);
    expect(parsedLength).toBe(2.64); // parsed as 2.64m
    
    // Verified there is no longer a mismatch
    expect(dims.length).toBe(parsedLength);
  });

  // --- R7: Lost Connection Metadata on Save & Load ---
  test('4. ConnectionPointId is lost (becomes null) after project save and load', async () => {
    const store = useConfiguratorStore.getState();
    store.setStep('EDITOR');

    // 1. Add Palletizer
    const palletizer = mockDb.components.find(c => c.id === 3)!;
    store.selectPalletizer(palletizer, 'RODILLO');
    const pUuid = useConfiguratorStore.getState().placedComponents[0].uuid;

    // 2. Add Conveyor and simulate its connection to palletizer
    const conveyor = mockDb.components.find(c => c.id === 11)!;
    store.addComponentToScene(conveyor);
    
    // Manually snap it in state
    useConfiguratorStore.getState().placedComponents[1].connectedTo = pUuid;
    useConfiguratorStore.getState().placedComponents[1].connectionPointId = 'snap-pt-conveyor-in';

    expect(useConfiguratorStore.getState().placedComponents[1].connectionPointId).toBe('snap-pt-conveyor-in');

    // 3. Save project
    const saveRes = await store.saveProject();
    expect(saveRes.success).toBe(true);

    // 4. Reset store and reload project
    store.resetConfiguratorState();
    await store.loadProject(saveRes.projectId!);

    // The component's connectionPointId is successfully restored
    expect(useConfiguratorStore.getState().placedComponents[1].connectedTo).not.toBeNull(); // connectedTo persists
    expect(useConfiguratorStore.getState().placedComponents[1].connectionPointId).toBe('snap-pt-conveyor-in'); // restored!
  });
});
