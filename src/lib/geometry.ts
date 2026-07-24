import type { CatalogComponent, PlacedComponent } from '../store/types';

/**
 * Dimensiones físicas de fallback por tipo de componente, en metros.
 * Única fuente de verdad: la usan tanto la lógica de snap del store como
 * el ModelLoader para las cajas de reemplazo cuando falta el modelo GLB.
 */
export const DEFAULT_DIMENSIONS: Record<string, { length: number; width: number; height: number }> = {
  palletizer: { length: 2.8, width: 2.8, height: 3.5 },
  conveyor: { length: 2.0, width: 1.2, height: 0.8 },
  wrapper: { length: 2.2, width: 2.2, height: 2.5 },
  turn_unit: { length: 1.5, width: 1.5, height: 0.9 },
  pallet_dispenser: { length: 1.6, width: 1.8, height: 2.2 },
  sheet_dispenser: { length: 1.4, width: 1.6, height: 1.8 },
  manipulator: { length: 0.8, width: 0.8, height: 1.0 },
};

export const GENERIC_DIMENSIONS = { length: 2.0, width: 1.5, height: 1.2 };

/** Convierte un valor de specs (mm, posiblemente string) a metros. */
export function parseDimensionToMeters(val: unknown, defaultVal: number): number {
  if (typeof val === 'number') return val / 1000;
  if (typeof val === 'string') {
    const num = parseFloat(val);
    if (!isNaN(num)) return num / 1000;
  }
  return defaultVal;
}

export function getComponentPhysicalDimensions(comp: PlacedComponent | CatalogComponent) {
  const type = ('componentType' in comp ? comp.componentType : comp.component_type_name) || '';
  const specs = comp.specs || {};
  const base = DEFAULT_DIMENSIONS[type] || GENERIC_DIMENSIONS;
  let { length, width } = base;
  const height = base.height;

  if (type === 'conveyor') {
    length = parseDimensionToMeters(specs.conveyor_length_mm, base.length);
    width = parseDimensionToMeters(specs.conveyor_width_mm, base.width);
  }
  return { length, width, height };
}

export interface SnapResult {
  position: [number, number, number];
  connectedTo: string | null;
  connectionPointId: string | null;
}

/**
 * Snap geométrico por proximidad de cajas (AABB con proyección de la rotación Y).
 * Solo conecta componentes de la misma línea de producción.
 */
export function computeGeometricSnap(
  target: PlacedComponent,
  proposedPos: [number, number, number],
  allComponents: PlacedComponent[],
  threshold = 0.6
): SnapResult {
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

  let bestSnap: (SnapResult & { distance: number }) | null = null;

  const considerSnap = (candidate: SnapResult & { distance: number }) => {
    if (!bestSnap || candidate.distance < bestSnap.distance) {
      bestSnap = candidate;
    }
  };

  const closestAlignment = (value: number, alignments: number[]): number => {
    let best = value;
    let minDiff = Infinity;
    for (const a of alignments) {
      const diff = Math.abs(value - a);
      if (diff < minDiff) {
        minDiff = diff;
        best = a;
      }
    }
    return best;
  };

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
      const zAlignments = [oz, oz - dz_o / 2 + dz_t / 2, oz + dz_o / 2 - dz_t / 2];

      // Opción X1: target a la izquierda de other
      const px_x1 = ox - dx_o / 2 - dx_t / 2;
      const distX1 = Math.abs(px - px_x1);
      if (distX1 <= threshold) {
        considerSnap({
          position: [px_x1, py, closestAlignment(pz, zAlignments)],
          connectedTo: other.uuid,
          connectionPointId: `snap-pt-${target.componentType}-out`,
          distance: distX1,
        });
      }

      // Opción X2: target a la derecha de other
      const px_x2 = ox + dx_o / 2 + dx_t / 2;
      const distX2 = Math.abs(px - px_x2);
      if (distX2 <= threshold) {
        considerSnap({
          position: [px_x2, py, closestAlignment(pz, zAlignments)],
          connectedTo: other.uuid,
          connectionPointId: `snap-pt-${target.componentType}-in`,
          distance: distX2,
        });
      }
    }

    if (gapX_overlap <= threshold) {
      const xAlignments = [ox, ox - dx_o / 2 + dx_t / 2, ox + dx_o / 2 - dx_t / 2];

      // Opción Z1: target delante de other
      const pz_z1 = oz - dz_o / 2 - dz_t / 2;
      const distZ1 = Math.abs(pz - pz_z1);
      if (distZ1 <= threshold) {
        considerSnap({
          position: [closestAlignment(px, xAlignments), py, pz_z1],
          connectedTo: other.uuid,
          connectionPointId: `snap-pt-${target.componentType}-out`,
          distance: distZ1,
        });
      }

      // Opción Z2: target detrás de other
      const pz_z2 = oz + dz_o / 2 + dz_t / 2;
      const distZ2 = Math.abs(pz - pz_z2);
      if (distZ2 <= threshold) {
        considerSnap({
          position: [closestAlignment(px, xAlignments), py, pz_z2],
          connectedTo: other.uuid,
          connectionPointId: `snap-pt-${target.componentType}-in`,
          distance: distZ2,
        });
      }
    }
  }

  if (bestSnap) {
    const { position, connectedTo, connectionPointId } = bestSnap as SnapResult & { distance: number };
    return { position, connectedTo, connectionPointId };
  }

  return { position: proposedPos, connectedTo: null, connectionPointId: null };
}
