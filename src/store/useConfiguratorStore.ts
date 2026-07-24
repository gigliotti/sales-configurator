import { create } from 'zustand';
import { createCatalogSlice, type CatalogSlice } from './slices/catalogSlice';
import { createSceneSlice, type SceneSlice } from './slices/sceneSlice';
import { createProjectSlice, type ProjectSlice } from './slices/projectSlice';
import { createAuthSlice, type AuthSlice } from './slices/authSlice';
import { createI18nSlice, type I18nSlice } from './slices/i18nSlice';

// Re-exportes de compatibilidad: tipos y helpers que históricamente vivían aquí.
export type {
  ClientParams,
  ComponentSpecs,
  OptionDetails,
  CatalogComponent,
  PlacedComponent,
  PlacedComponentOption,
  ValidationWarning,
  WarningCode,
  UserProfile,
  Project,
  ProjectVersion,
  ProjectSnapshot,
  ProjectStatus,
  ComponentOption,
  ProductionLine,
  AppStep,
  TransportType,
} from './types';
export { getComponentPhysicalDimensions, computeGeometricSnap } from '../lib/geometry';
export { defaultParams } from './slices/sceneSlice';

/**
 * Estado global del configurador, compuesto por slices:
 * - CatalogSlice: catálogo de componentes y recomendaciones
 * - SceneSlice: escena 3D, líneas, validaciones y undo/redo
 * - ProjectSlice: persistencia de proyectos, versiones y compartir
 * - AuthSlice: sesión, perfiles y roles
 * - I18nSlice: idioma y traducciones
 */
export type ConfiguratorState = CatalogSlice & SceneSlice & ProjectSlice & AuthSlice & I18nSlice;

export const useConfiguratorStore = create<ConfiguratorState>()((...args) => ({
  ...createCatalogSlice(...args),
  ...createSceneSlice(...args),
  ...createProjectSlice(...args),
  ...createAuthSlice(...args),
  ...createI18nSlice(...args),
}));
