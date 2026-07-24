/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, beforeEach } from 'vitest';
import { useConfiguratorStore, type ConfiguratorState } from '../store/useConfiguratorStore';
import { mockDb, resetMockDb } from '../lib/__mocks__/supabaseClient';

// Proxy del store para leer siempre el estado actual de Zustand (evita referencias stale)
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
  },
});

const SELLER_ID = '11111111-1111-1111-1111-111111111111';

/** Monta una escena básica: paletizadora V-STACK 535 en el origen + conveyor de rodillos lejos. */
async function setupBasicScene() {
  await store.loadCatalog();
  const palletizer = store.catalog.find((c) => c.id === 3)!;
  store.selectPalletizer(palletizer, 'RODILLO');
  const conveyor = store.catalog.find((c) => c.id === 11)!;
  store.addComponentToScene(conveyor, [10, 0, 0]);
}

describe('New store capabilities (feature/mejoras-integrales)', () => {
  beforeEach(async () => {
    resetMockDb();
    // resetMockDb no conoce project_versions (se crea bajo demanda): limpiarla explícitamente
    mockDb.project_versions = [];
    useConfiguratorStore.getState().resetConfiguratorState();
    await useConfiguratorStore.getState().setActiveProfile(null);
  });

  // 1. undo/redo
  test('undo/redo: navigates history and a new action clears the redo future', async () => {
    await store.loadCatalog();
    const conveyor = store.catalog.find((c) => c.id === 11)!;
    const chainConveyor = store.catalog.find((c) => c.id === 17)!;

    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(false);

    store.addComponentToScene(conveyor, [0, 0, 0]);
    store.addComponentToScene(chainConveyor, [20, 0, 0]);
    expect(store.placedComponents.length).toBe(2);
    expect(store.canUndo).toBe(true);

    store.undo();
    expect(store.placedComponents.length).toBe(1);
    expect(store.canUndo).toBe(true);
    expect(store.canRedo).toBe(true);

    store.undo();
    expect(store.placedComponents.length).toBe(0);
    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(true);

    store.redo();
    expect(store.placedComponents.length).toBe(1);
    expect(store.canRedo).toBe(true);

    // Nueva acción tras un undo: limpia el futuro
    store.addComponentToScene(conveyor, [40, 0, 0]);
    expect(store.placedComponents.length).toBe(2);
    expect(store.canRedo).toBe(false);
    expect(store.canUndo).toBe(true);
  });

  // 2. commitComponentTransform
  test('commitComponentTransform: snaps near an edge and keeps exact transform when far away', async () => {
    await setupBasicScene();

    const palletizer = store.placedComponents.find((c) => c.componentType === 'palletizer')!;
    const conveyor = store.placedComponents.find((c) => c.componentType === 'conveyor')!;
    expect(palletizer.position).toEqual([0, 0, 0]);
    // Colocado lejos: sin snap inicial
    expect(conveyor.position).toEqual([10, 0, 0]);
    expect(conveyor.connectedTo).toBeNull();

    // Commit a <0.6m del borde derecho de la paletizadora: debe snapear
    // Paletizadora 2.8m de largo (mitad 1.4) + conveyor 2.64m (mitad 1.32) => x esperado 2.72
    store.commitComponentTransform(conveyor.uuid, [3.0, 0, 0.1], [0, 0, 0]);
    let moved = store.placedComponents.find((c) => c.uuid === conveyor.uuid)!;
    const expectedX = 2.8 / 2 + 2.64 / 2;
    expect(moved.connectedTo).toBe(palletizer.uuid);
    expect(moved.connectionPointId).not.toBeNull();
    expect(moved.position[0]).toBeCloseTo(expectedX, 5);
    expect(moved.position[2]).toBeCloseTo(0, 5); // alineado al centro en Z

    // Commit a una posición lejana: no snapea, posición/rotación exactas
    store.commitComponentTransform(conveyor.uuid, [15, 0, 6], [0, Math.PI / 2, 0]);
    moved = store.placedComponents.find((c) => c.uuid === conveyor.uuid)!;
    expect(moved.position).toEqual([15, 0, 6]);
    expect(moved.rotation).toEqual([0, Math.PI / 2, 0]);
    expect(moved.connectedTo).toBeNull();
    expect(moved.connectionPointId).toBeNull();
  });

  // 3. Warnings estructurados
  test('structured warnings: budget_exceeded and tube_manipulator_limit carry code, params and Spanish message', async () => {
    await store.loadCatalog();

    // V-STACK 535 cuesta 740.000 > presupuesto por defecto (600.000)
    const palletizer = store.catalog.find((c) => c.id === 3)!;
    store.selectPalletizer(palletizer, 'RODILLO');

    const budgetWarning = store.validationWarnings.find((w) => w.code === 'budget_exceeded')!;
    expect(budgetWarning).toBeDefined();
    expect(budgetWarning.params).toBeDefined();
    expect(budgetWarning.params!.cost).toBe((740000).toLocaleString());
    expect(budgetWarning.params!.budget).toBe((600000).toLocaleString());
    expect(budgetWarning.message).toContain('supera el presupuesto');

    // Peso > 25 kg con Tube Manipulator
    store.setParams({ productType: 'BOLSA', productWeight: 30 });
    const tubeManipulator = store.catalog.find((c) => c.id === 36)!;
    store.addComponentToScene(tubeManipulator);

    const tubeWarning = store.validationWarnings.find((w) => w.code === 'tube_manipulator_limit')!;
    expect(tubeWarning).toBeDefined();
    expect(tubeWarning.severity).toBe('error');
    expect(tubeWarning.params).toBeDefined();
    expect(tubeWarning.params!.weight).toBe(30);
    expect(tubeWarning.message).toContain('supera el límite');
  });

  // 4. getSnapshot / restoreSnapshot
  test('getSnapshot/restoreSnapshot: restores scene, params and project name, revalidates and clears history', async () => {
    await setupBasicScene();
    store.setProjectMeta('Proyecto Snapshot', 'Cliente Snap', 'snap@cliente.com');
    store.setParams({ productWeight: 22 });

    const priceBefore = store.totalPrice;
    expect(priceBefore).toBeGreaterThan(0);
    const componentCount = store.placedComponents.length;
    const snapshot = store.getSnapshot();

    expect(snapshot.projectName).toBe('Proyecto Snapshot');
    expect(snapshot.placedComponents.length).toBe(componentCount);

    store.resetConfiguratorState();
    expect(store.placedComponents.length).toBe(0);
    expect(store.totalPrice).toBe(0);
    expect(store.projectName).toBe('Nueva Cotización');

    store.restoreSnapshot(snapshot);

    expect(store.projectName).toBe('Proyecto Snapshot');
    expect(store.clientName).toBe('Cliente Snap');
    expect(store.placedComponents.length).toBe(componentCount);
    expect(store.lines.length).toBe(snapshot.lines.length);
    expect(store.activeLineId).toBe(snapshot.lines[0].id);
    expect(store.params.productWeight).toBe(22);
    // validateScene se ejecutó: totalPrice recalculado desde los componentes restaurados
    expect(store.totalPrice).toBe(priceBefore);
    expect(store.validationWarnings.some((w) => w.code === 'budget_exceeded')).toBe(true);
    // Historial limpio
    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(false);
  });

  // 5. duplicateProjectAsNew
  test('duplicateProjectAsNew: detaches from saved project and a later save creates a second project', async () => {
    await store.setActiveProfile(SELLER_ID);
    store.setProjectMeta('Proyecto Original', 'Cliente', 'c@x.com');

    const firstSave = await store.saveProject();
    expect(firstSave.success).toBe(true);
    expect(mockDb.projects.length).toBe(1);
    expect(store.currentProjectId).toBe(firstSave.projectId);
    expect(store.shareToken).not.toBeNull();

    store.duplicateProjectAsNew();
    expect(store.currentProjectId).toBeNull();
    expect(store.shareToken).toBeNull();
    expect(store.isReadOnly).toBe(false);
    expect(store.projectName.endsWith('(copia)')).toBe(true);
    expect(store.projectVersions).toEqual([]);

    const secondSave = await store.saveProject();
    expect(secondSave.success).toBe(true);
    expect(secondSave.projectId).not.toBe(firstSave.projectId);
    expect(mockDb.projects.length).toBe(2);
    const copy = mockDb.projects.find((p) => p.id === secondSave.projectId)!;
    expect(copy.name).toBe('Proyecto Original (copia)');
  });

  // 6. updateProjectStatus
  test('updateProjectStatus: persists the status in mockDb and updates projectsList', async () => {
    await store.setActiveProfile(SELLER_ID);
    store.setProjectMeta('Proyecto Estado', 'Cliente', 'c@x.com');
    const saveRes = await store.saveProject();
    expect(saveRes.success).toBe(true);
    const projectId = saveRes.projectId!;

    await store.loadProjectsList();
    expect(store.projectsList.find((p) => p.id === projectId)?.status).toBe('draft');

    await store.updateProjectStatus(projectId, 'sent');

    const dbProject = mockDb.projects.find((p) => p.id === projectId)!;
    expect(dbProject.status).toBe('sent');
    expect(store.projectsList.find((p) => p.id === projectId)?.status).toBe('sent');
  });

  // 7. loadVersions
  test('loadVersions: two saves produce two versions returned in descending order', async () => {
    await store.setActiveProfile(SELLER_ID);
    store.setProjectMeta('Proyecto Versiones', 'Cliente', 'c@x.com');

    const firstSave = await store.saveProject();
    expect(firstSave.success).toBe(true);
    const projectId = firstSave.projectId!;

    store.setProjectMeta('Proyecto Versiones v2', 'Cliente', 'c@x.com');
    const secondSave = await store.saveProject();
    expect(secondSave.success).toBe(true);
    expect(secondSave.projectId).toBe(projectId);

    const versions = await store.loadVersions(projectId);
    expect(versions.length).toBe(2);
    expect(versions[0].version).toBe(2);
    expect(versions[1].version).toBe(1);
    expect(versions.every((v) => v.project_id === projectId)).toBe(true);
    expect(store.projectVersions.length).toBe(2);
    expect(store.projectVersions[0].version).toBe(2);
  });

  // 8. t() con interpolación, fallback y clave
  test('t(): interpolates params from the local dictionary and falls back to fallback/key', () => {
    expect(store.language).toBe('es');

    const interpolated = store.t('warning.budget_exceeded', undefined, { cost: '1', budget: '2' });
    expect(interpolated).toBe('El costo total (€1) supera el presupuesto del cliente (€2).');
    expect(interpolated).toContain('supera el presupuesto');

    // Clave inexistente con fallback del llamador
    expect(store.t('clave.que.no.existe', 'texto de respaldo')).toBe('texto de respaldo');
    // Clave inexistente sin fallback: devuelve la propia clave
    expect(store.t('clave.que.no.existe')).toBe('clave.que.no.existe');
  });

  // 9. deleteProject sin RPC (borrado duro)
  test('deleteProject without rpc in mock: performs hard delete and cleans local lists', async () => {
    await store.setActiveProfile(SELLER_ID);
    store.setProjectMeta('Proyecto A Borrar', 'Cliente', 'c@x.com');
    const saveRes = await store.saveProject();
    expect(saveRes.success).toBe(true);
    const projectId = saveRes.projectId!;

    await store.loadProjectsList();
    expect(store.projectsList.length).toBe(1);
    expect(mockDb.projects.length).toBe(1);

    await store.deleteProject(projectId);

    // El mock no tiene .rpc => camino directo: borrado duro en la tabla
    expect(mockDb.projects.length).toBe(0);
    expect(store.projectsList.find((p) => p.id === projectId)).toBeUndefined();
    expect(store.favoriteProjectIds.includes(projectId)).toBe(false);
  });

  // 10. regenerateShareToken / revokeShareToken (fallback directo)
  test('regenerateShareToken/revokeShareToken: direct fallback updates mockDb and store state', async () => {
    await store.setActiveProfile(SELLER_ID);
    store.setProjectMeta('Proyecto Share', 'Cliente', 'c@x.com');
    const saveRes = await store.saveProject();
    expect(saveRes.success).toBe(true);
    const projectId = saveRes.projectId!;

    const originalToken = store.shareToken;
    expect(originalToken).not.toBeNull();
    expect(mockDb.projects.find((p) => p.id === projectId)!.share_token).toBe(originalToken);

    const newToken = await store.regenerateShareToken();
    expect(newToken).not.toBeNull();
    expect(newToken).not.toBe(originalToken);
    expect(store.shareToken).toBe(newToken);
    expect(mockDb.projects.find((p) => p.id === projectId)!.share_token).toBe(newToken);

    await store.revokeShareToken();
    expect(store.shareToken).toBeNull();
    expect(mockDb.projects.find((p) => p.id === projectId)!.share_token).toBeNull();
  });
});
