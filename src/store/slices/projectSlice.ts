import type { StateCreator } from 'zustand';
import { supabase, deleteRequestHeader, setRequestHeader } from '../../lib/supabaseClient';
import { toNumber } from '../../lib/format';
import type {
  ClientParams,
  OptionDetails,
  PlacedComponent,
  Project,
  ProjectSnapshot,
  ProjectStatus,
  ProjectVersion,
  TransportType,
} from '../types';
import type { ConfiguratorState } from '../useConfiguratorStore';
import { DEFAULT_LINE, defaultParams } from './sceneSlice';

interface DBLineComponent {
  id: number;
  line_id: string;
  component_id: number;
  pos_x: number;
  pos_y: number;
  pos_z: number;
  rot_y: number | null;
  connected_to: number | null;
  parent_snap_point_id?: string | number | null;
}

interface DBComponentOption {
  line_component_id: number;
  option_type: string;
  option_id: number;
}

type RpcResult = { data: unknown; error: { code?: string; message?: string } | null };
type RpcCapableClient = {
  rpc?: (fn: string, args?: Record<string, unknown>) => PromiseLike<RpcResult>;
};

/** true si el error indica que la función RPC aún no existe en la BD (migración sin aplicar). */
function isMissingFunctionError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === 'PGRST202' || error.code === '42883') return true;
  return /could not find the function|does not exist/i.test(error.message || '');
}

function getRpc(): RpcCapableClient['rpc'] | null {
  const client = supabase as unknown as RpcCapableClient;
  return typeof client.rpc === 'function' ? client.rpc.bind(supabase) : null;
}

const OPTION_TABLE_BY_TYPE: Record<string, string> = {
  conveyor_accessory: 'conveyor_accessories',
  infeed_coupling_config: 'infeed_coupling_compatibility',
  main_frame_config: 'main_frame_configurations',
  turn_unit_config: 'turn_unit_configurations',
  wrapper_config: 'wrapper_configurations',
};

/** Construye la etiqueta legible de una opción según su tipo (mismos formatos que la UI). */
function buildOptionLabel(optionType: string, data: Record<string, unknown>): { name: string; code: string } {
  const d = data as OptionDetails & { name?: string; code?: string; coupling_code?: string };
  switch (optionType) {
    case 'conveyor_accessory':
      return { name: (d.name as string) || 'Opción', code: (d.code as string) || '' };
    case 'infeed_coupling_config':
      return { name: `Acople: ${d.coupling_code}`, code: (d.coupling_code as string) || '' };
    case 'main_frame_config':
      return {
        name: `Variante: H${d.height_mm} ${d.lower_collar ? '+Collar' : ''} ${d.integrated_sheet_dispenser ? '+SheetDisp' : ''}`,
        code: '',
      };
    case 'turn_unit_config':
      return {
        name: `Freno: ${d.pallet_brake ? 'Sí' : 'No'} | Guía: ${d.pallet_guide ? 'Sí' : 'No'}`,
        code: '',
      };
    case 'wrapper_config':
      return {
        name: `${d.wrap_type} | Papel: ${d.paper_addition ? 'Sí' : 'No'} | Sello: ${d.cut_and_seal}`,
        code: '',
      };
    default:
      return { name: 'Opción', code: '' };
  }
}

export interface ProjectSlice {
  projectName: string;
  clientName: string;
  clientEmail: string;
  currentProjectId: string | null;
  isReadOnly: boolean;
  shareToken: string | null;
  projectsList: Project[];
  favoriteProjectIds: string[];
  projectVersions: ProjectVersion[];

  setProjectMeta: (name: string, client: string, email: string) => void;
  saveProject: () => Promise<{ success: boolean; projectId?: string; error?: string }>;
  loadProjectsList: () => Promise<void>;
  toggleFavoriteProject: (projectId: string) => Promise<void>;
  loadProject: (projectId: string, fromShare?: boolean) => Promise<void>;
  loadSharedProject: (token: string) => Promise<boolean>;
  deleteProject: (projectId: string) => Promise<void>;
  resetConfiguratorState: () => void;

  // Nuevas capacidades
  getSnapshot: () => ProjectSnapshot;
  restoreSnapshot: (snapshot: ProjectSnapshot) => void;
  duplicateProjectAsNew: () => void;
  /** Devuelve true si el estado se actualizó; false si falló (p. ej. RLS afectó 0 filas). */
  updateProjectStatus: (projectId: string, status: ProjectStatus) => Promise<boolean>;
  loadVersions: (projectId: string) => Promise<ProjectVersion[]>;
  regenerateShareToken: (expiresAt?: string | null) => Promise<string | null>;
  revokeShareToken: () => Promise<void>;
}

export const createProjectSlice: StateCreator<ConfiguratorState, [], [], ProjectSlice> = (set, get) => ({
  projectName: 'Nueva Cotización',
  clientName: '',
  clientEmail: '',
  currentProjectId: null,
  isReadOnly: false,
  shareToken: null,
  projectsList: [],
  favoriteProjectIds: [],
  projectVersions: [],

  setProjectMeta: (projectName, clientName, clientEmail) =>
    set({ projectName, clientName, clientEmail }),

  getSnapshot: () => {
    const { projectName, clientName, clientEmail, totalPrice, lines, placedComponents, params } = get();
    return { projectName, clientName, clientEmail, totalPrice, lines, placedComponents, params };
  },

  restoreSnapshot: (snapshot) => {
    // Derivar params/transportType de la línea que queda activa (misma lógica que
    // setActiveLineId/loadProject) para no dejar estado desincronizado.
    const lines = snapshot.lines?.length ? snapshot.lines : [{ ...DEFAULT_LINE }];
    const activeLine = lines[0];
    set({
      projectName: snapshot.projectName ?? 'Nueva Cotización',
      clientName: snapshot.clientName ?? '',
      clientEmail: snapshot.clientEmail ?? '',
      lines,
      activeLineId: activeLine.id,
      placedComponents: snapshot.placedComponents ?? [],
      params: activeLine.params ?? snapshot.params ?? defaultParams,
      transportType: activeLine.transportType ?? 'RODILLO',
      selectedComponentUuid: null,
      replacingComponentUuid: null,
      _historyPast: [],
      _historyFuture: [],
      canUndo: false,
      canRedo: false,
    });
    get().validateScene();
  },

  duplicateProjectAsNew: () => {
    const { projectName } = get();
    set({
      currentProjectId: null,
      shareToken: null,
      isReadOnly: false,
      projectName: `${projectName} (copia)`,
      projectVersions: [],
    });
  },

  saveProject: async () => {
    const { projectName, clientName, clientEmail, params, placedComponents, totalPrice, activeProfile } = get();

    try {
      // 1. Determinar el dueño (perfil activo > sesión auth > primer perfil para testing)
      let ownerId = null;
      if (activeProfile) {
        ownerId = activeProfile.id;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          ownerId = user.id;
        } else {
          const { data: profiles } = await supabase.from('user_profiles').select('id').limit(1);
          if (profiles && profiles.length > 0) {
            ownerId = profiles[0].id;
          }
        }
      }

      if (!ownerId) {
        throw new Error('No valid user profile found to assign project owner.');
      }

      const snapshot: ProjectSnapshot = get().getSnapshot();

      // 2. Camino preferido: RPC atómica (una transacción en Postgres).
      const rpc = getRpc();
      if (rpc) {
        const linesPayload = get().lines.map((line, idx) => {
          const lineParams = line.params || params;
          const lineComponents = placedComponents.filter((c) => c.lineId === line.id || (!c.lineId && idx === 0));
          const palletizerComp = lineComponents.find((c) => c.componentType === 'palletizer');
          return {
            name: line.name,
            product_type: line.productType,
            palletizer_id: palletizerComp ? palletizerComp.id : null,
            product_length_mm: lineParams.productLength,
            product_width_mm: lineParams.productWidth,
            product_height_mm: lineParams.productHeight,
            product_weight_kg: lineParams.productWeight,
            desired_speed_upm: lineParams.desiredSpeed,
            pallet_length_mm: lineParams.palletLength,
            pallet_width_mm: lineParams.palletWidth,
            units_per_layer: lineParams.unitsPerLayer,
            total_pallet_height_mm: lineParams.totalPalletHeight,
            preferred_wrap_type: lineParams.preferredWrapType,
            max_budget_eur: lineParams.maxBudget,
            transport_type: line.transportType || null,
            line_price_eur: lineComponents.reduce((acc, c) => acc + c.totalPrice, 0),
            components: lineComponents.map((c) => ({
              component_id: c.id,
              client_uuid: c.uuid,
              connected_to_client_uuid: c.connectedTo,
              parent_snap_point_id: c.connectionPointId,
              pos_x: c.position[0],
              pos_y: c.position[1],
              pos_z: c.position[2],
              rot_y: c.rotation[1],
              options: c.options.map((o) => ({ option_type: o.optionType, option_id: o.id })),
            })),
          };
        });

        const { data, error } = await rpc('save_project_atomic', {
          payload: {
            project: {
              id: get().currentProjectId,
              name: projectName,
              client_name: clientName,
              client_email: clientEmail,
              total_price_eur: totalPrice,
            },
            lines: linesPayload,
            snapshot,
          },
        });

        if (!error && data && typeof data === 'object') {
          const result = data as { project_id?: string; share_token?: string | null };
          if (result.project_id) {
            set({
              currentProjectId: result.project_id,
              shareToken: result.share_token || null,
            });
            return { success: true, projectId: result.project_id };
          }
        }
        if (error && !isMissingFunctionError(error)) {
          throw new Error(error.message || 'Error al guardar el proyecto');
        }
        // Función aún no desplegada: continuar con el camino legado.
      }

      // 3. Camino legado (multi-request). Se mantiene para BDs sin la RPC aplicada.
      let project;
      const targetProjectId = get().currentProjectId;
      if (targetProjectId) {
        const { data: updatedProj, error: pError } = await supabase
          .from('projects')
          .update({
            name: projectName,
            client_name: clientName,
            client_email: clientEmail,
            total_price_eur: totalPrice,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetProjectId)
          .select()
          .single();
        if (pError) throw pError;
        project = updatedProj;
      } else {
        const token = crypto.randomUUID();
        const { data: newProj, error: pError } = await supabase
          .from('projects')
          .insert({
            owner_id: ownerId,
            name: projectName,
            client_name: clientName,
            client_email: clientEmail,
            total_price_eur: totalPrice,
            status: 'draft',
            share_token: token,
          })
          .select()
          .single();
        if (pError) throw pError;
        project = newProj;
        set({ currentProjectId: project.id });
      }

      // Snapshot de versión
      let versionNum = 1;
      if (targetProjectId) {
        const { data: existingVersions } = await supabase
          .from('project_versions')
          .select('version')
          .eq('project_id', targetProjectId)
          .order('version', { ascending: false })
          .limit(1);
        if (existingVersions && existingVersions.length > 0) {
          versionNum = existingVersions[0].version + 1;
        }
      }

      await supabase
        .from('project_versions')
        .insert({
          project_id: project.id,
          version: versionNum,
          snapshot,
          created_by: ownerId,
        });

      const insertedComponentsMap: Record<string, string> = {};
      const linesToProcess = get().lines;

      interface LookupItem {
        id: number;
        name: string;
      }
      const { data: allTransportTypes } = await supabase.from('transport_types').select('*') as { data: LookupItem[] | null };
      const { data: allProductTypes } = await supabase.from('product_types').select('*') as { data: LookupItem[] | null };

      const linesInsertData = linesToProcess.map((line, idx) => {
        const lineParams = line.params || params;
        const lineComponents = placedComponents.filter((c) => c.lineId === line.id || (!c.lineId && idx === 0));

        const palletizerComp = lineComponents.find((c) => c.componentType === 'palletizer');
        const conveyorComp = lineComponents.find((c) => c.componentType === 'conveyor');

        let transportTypeId = 3; // NONE
        if (conveyorComp) {
          const transType = conveyorComp.name.toLowerCase().includes('chain') ? 'CADENA' : 'RODILLO';
          const tt = allTransportTypes?.find((t) => t.name === transType);
          if (tt) transportTypeId = tt.id;
        }

        const pt = allProductTypes?.find((p) => p.name === line.productType);
        const productTypeId = pt ? pt.id : 1;

        return {
          project_id: project.id,
          name: line.name,
          product_type_id: productTypeId,
          product_length_mm: lineParams.productLength,
          product_width_mm: lineParams.productWidth,
          product_height_mm: lineParams.productHeight,
          product_weight_kg: lineParams.productWeight,
          desired_speed_upm: lineParams.desiredSpeed,
          pallet_length_mm: lineParams.palletLength,
          pallet_width_mm: lineParams.palletWidth,
          units_per_layer: lineParams.unitsPerLayer,
          total_pallet_height_mm: lineParams.totalPalletHeight,
          preferred_wrap_type: lineParams.preferredWrapType,
          max_budget_eur: lineParams.maxBudget,
          palletizer_id: palletizerComp ? palletizerComp.id : null,
          transport_type_id: transportTypeId,
          line_price_eur: lineComponents.reduce((acc, c) => acc + c.totalPrice, 0),
        };
      });

      // Borrar líneas anteriores justo antes de insertar (ventana mínima de pérdida)
      if (targetProjectId) {
        const { error: deleteLinesError } = await supabase
          .from('project_lines')
          .delete()
          .eq('project_id', targetProjectId);
        if (deleteLinesError) throw deleteLinesError;
      }

      const { data: insertedLines, error: lError } = await supabase
        .from('project_lines')
        .insert(linesInsertData)
        .select();

      if (lError) throw lError;
      if (!insertedLines || insertedLines.length === 0) {
        throw new Error('Failed to insert project lines.');
      }

      const compsInsertData: Record<string, unknown>[] = [];
      const compsMappingTemp: { tempUuid: string }[] = [];

      linesToProcess.forEach((line, lineIdx) => {
        const lineComponents = placedComponents.filter((c) => c.lineId === line.id || (!c.lineId && lineIdx === 0));
        const dbLine = insertedLines[lineIdx];

        lineComponents.forEach((c) => {
          compsInsertData.push({
            line_id: dbLine.id,
            component_id: c.id,
            pos_x: c.position[0],
            pos_y: c.position[1],
            pos_z: c.position[2],
            rot_y: c.rotation[1],
            parent_snap_point_id: c.connectionPointId,
            child_snap_point_id: c.connectionPointId,
          });
          compsMappingTemp.push({ tempUuid: c.uuid });
        });
      });

      if (compsInsertData.length > 0) {
        const { data: insertedComps, error: lcError } = await supabase
          .from('line_components')
          .insert(compsInsertData)
          .select();

        if (lcError) throw lcError;
        if (!insertedComps) throw new Error('Failed to insert line components.');

        const insertedCompsArr = Array.isArray(insertedComps) ? insertedComps : [insertedComps];
        insertedCompsArr.forEach((dbComp, idx: number) => {
          const mapping = compsMappingTemp[idx];
          insertedComponentsMap[mapping.tempUuid] = (dbComp as { id: string }).id;
        });

        const optionsInsertData: Record<string, unknown>[] = [];
        linesToProcess.forEach((line, lineIdx) => {
          const lineComponents = placedComponents.filter((c) => c.lineId === line.id || (!c.lineId && lineIdx === 0));
          lineComponents.forEach((c) => {
            const dbCompId = insertedComponentsMap[c.uuid];
            c.options.forEach((opt) => {
              optionsInsertData.push({
                line_component_id: dbCompId,
                option_type: opt.optionType,
                option_id: opt.id,
              });
            });
          });
        });

        if (optionsInsertData.length > 0) {
          const { error: optError } = await supabase
            .from('line_component_options')
            .insert(optionsInsertData);
          if (optError) throw optError;
        }
      }

      // Resolver referencias connected_to entre componentes insertados
      for (const c of placedComponents) {
        if (c.connectedTo && insertedComponentsMap[c.uuid] && insertedComponentsMap[c.connectedTo]) {
          await supabase
            .from('line_components')
            .update({
              connected_to: insertedComponentsMap[c.connectedTo],
            })
            .eq('id', insertedComponentsMap[c.uuid]);
        }
      }

      set({ shareToken: project.share_token || null });
      return { success: true, projectId: project.id };
    } catch (err) {
      console.error('Error saving project:', err);
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      return { success: false, error: errMsg };
    }
  },

  loadProjectsList: async () => {
    set({ loading: true });
    try {
      const { activeProfile } = get();
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      let favoriteIds: string[] = [];
      if (activeProfile) {
        const { data: favs } = await supabase
          .from('seller_favorite_projects')
          .select('project_id')
          .eq('seller_id', activeProfile.id);
        if (favs) {
          favoriteIds = (favs as { project_id: string }[]).map((f) => f.project_id);
        }
      }

      const visibleProjects = ((projects as Project[]) || []).filter((p) => !p.deleted_at);

      set({
        projectsList: visibleProjects,
        favoriteProjectIds: favoriteIds,
      });
    } catch (err) {
      console.error('Error loading projects list:', err);
    } finally {
      set({ loading: false });
    }
  },

  toggleFavoriteProject: async (projectId) => {
    const { activeProfile, favoriteProjectIds } = get();
    if (!activeProfile) return;

    const isFav = favoriteProjectIds.includes(projectId);
    try {
      if (isFav) {
        await supabase
          .from('seller_favorite_projects')
          .delete()
          .eq('seller_id', activeProfile.id)
          .eq('project_id', projectId);

        set({
          favoriteProjectIds: favoriteProjectIds.filter((id) => id !== projectId),
        });
      } else {
        await supabase
          .from('seller_favorite_projects')
          .insert({
            seller_id: activeProfile.id,
            project_id: projectId,
          });

        set({
          favoriteProjectIds: [...favoriteProjectIds, projectId],
        });
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  },

  loadProject: async (projectId, fromShare = false) => {
    if (!fromShare) {
      deleteRequestHeader('x-share-token');
      set({ isReadOnly: false, shareToken: null });
    }
    set({ loading: true });
    try {
      const { data: project, error: pError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      if (pError) throw pError;

      const { data: lines, error: lError } = await supabase
        .from('project_lines')
        .select('*')
        .eq('project_id', projectId);
      if (lError) throw lError;
      if (!lines || lines.length === 0) throw new Error('No se encontraron líneas en este proyecto.');

      const formattedLines = lines.map((line) => {
        const lineParams: ClientParams = {
          productType: (line.product_type_id === 2 ? 'BOLSA' : 'CAJA') as 'CAJA' | 'BOLSA',
          productLength: line.product_length_mm || 400,
          productWidth: line.product_width_mm || 300,
          productHeight: line.product_height_mm || 200,
          productWeight: toNumber(line.product_weight_kg, 15) || 15,
          desiredSpeed: line.desired_speed_upm || 18,
          palletLength: line.pallet_length_mm || 1200,
          palletWidth: line.pallet_width_mm || 1000,
          unitsPerLayer: line.units_per_layer || 8,
          totalPalletHeight: line.total_pallet_height_mm || 1800,
          preferredWrapType: (line.preferred_wrap_type || 'RED') as 'RED' | 'FILM',
          maxBudget: toNumber(line.max_budget_eur, 600000) || 600000,
        };

        let lineTransportType: TransportType = 'RODILLO';
        if (line.transport_type_id === 2) {
          lineTransportType = 'CADENA';
        }

        return {
          id: line.id,
          name: line.name,
          productType: lineParams.productType,
          params: lineParams,
          transportType: lineTransportType,
        };
      });

      const lineIds = lines.map((l) => l.id);
      const { data: lineComponents, error: lcError } = await supabase
        .from('line_components')
        .select('*')
        .in('line_id', lineIds);
      if (lcError) throw lcError;

      const dbLineComponents = (lineComponents || []) as unknown as DBLineComponent[];

      const componentIds = dbLineComponents.map((lc) => lc.id);
      let optionsData: DBComponentOption[] = [];
      if (componentIds.length > 0) {
        const { data: opts, error: optError } = await supabase
          .from('line_component_options')
          .select('*')
          .in('line_component_id', componentIds);
        if (optError) throw optError;
        optionsData = (opts || []) as unknown as DBComponentOption[];
      }

      // Cargar detalles de opciones agrupados por tipo (evita N+1 consultas)
      const optionIdsByType = new Map<string, Set<number>>();
      optionsData.forEach((opt) => {
        if (!OPTION_TABLE_BY_TYPE[opt.option_type]) return;
        if (!optionIdsByType.has(opt.option_type)) optionIdsByType.set(opt.option_type, new Set());
        optionIdsByType.get(opt.option_type)!.add(opt.option_id);
      });

      const optionDetailsMap = new Map<string, Record<string, unknown>>();
      await Promise.all(
        Array.from(optionIdsByType.entries()).map(async ([optionType, ids]) => {
          const table = OPTION_TABLE_BY_TYPE[optionType];
          const { data } = await supabase.from(table).select('*').in('id', Array.from(ids));
          ((data as Record<string, unknown>[] | null) || []).forEach((row) => {
            optionDetailsMap.set(`${optionType}:${row.id}`, row);
          });
        })
      );

      let catalog = get().catalog;
      if (catalog.length === 0) {
        await get().loadCatalog();
        catalog = get().catalog;
      }

      const uuidMap: Record<string, string> = {};
      dbLineComponents.forEach((lc) => {
        uuidMap[lc.id] = crypto.randomUUID();
      });

      const placedComponents: PlacedComponent[] = [];

      for (const lc of dbLineComponents) {
        const componentTemplate = catalog.find((c) => c.id === lc.component_id);
        if (!componentTemplate) continue;

        const lcOptions = optionsData.filter((o) => o.line_component_id === lc.id);
        const optionsList: PlacedComponent['options'] = [];

        for (const opt of lcOptions) {
          const detailRecord = optionDetailsMap.get(`${opt.option_type}:${opt.option_id}`) || null;
          let optName = 'Opción';
          let optCode = '';
          let optPrice = 0;

          if (detailRecord) {
            const label = buildOptionLabel(opt.option_type, detailRecord);
            optName = label.name;
            optCode = label.code;
            optPrice = toNumber(detailRecord.price_eur);
          }

          optionsList.push({
            id: opt.option_id,
            optionType: opt.option_type,
            name: optName,
            code: optCode,
            price: optPrice,
            details: detailRecord as OptionDetails | null,
          });
        }

        const optionsPrice = optionsList.reduce((sum, o) => sum + o.price, 0);

        placedComponents.push({
          uuid: uuidMap[lc.id],
          id: lc.component_id,
          name: componentTemplate.name,
          code: componentTemplate.code,
          componentType: componentTemplate.component_type_name,
          locationId: componentTemplate.location_id,
          basePrice: componentTemplate.price_eur,
          totalPrice: componentTemplate.price_eur + optionsPrice,
          position: [lc.pos_x, lc.pos_y, lc.pos_z],
          rotation: [0, lc.rot_y || 0, 0],
          connectedTo: lc.connected_to ? uuidMap[lc.connected_to] : null,
          connectionPointId: lc.parent_snap_point_id ? String(lc.parent_snap_point_id) : null,
          model_id: componentTemplate.model_id,
          model_path: componentTemplate.model_path,
          specs: componentTemplate.specs,
          options: optionsList,
          lineId: lc.line_id,
        });
      }

      set({
        projectName: project.name,
        clientName: project.client_name || '',
        clientEmail: project.client_email || '',
        params: formattedLines[0]?.params || defaultParams,
        placedComponents,
        transportType: formattedLines[0]?.transportType || 'RODILLO',
        selectedComponentUuid: null,
        replacingComponentUuid: null,
        step: 'EDITOR',
        currentProjectId: project.id,
        lines: formattedLines,
        activeLineId: lines[0]?.id || null,
        shareToken: project.share_token || null,
        projectVersions: [],
        _historyPast: [],
        _historyFuture: [],
        canUndo: false,
        canRedo: false,
      });

      get().validateScene();
    } catch (err) {
      console.error('Error loading project:', err);
    } finally {
      set({ loading: false });
    }
  },

  loadSharedProject: async (token) => {
    set({ loading: true });
    try {
      setRequestHeader('x-share-token', token);

      const { data, error } = await supabase
        .from('projects')
        .select('id')
        .eq('share_token', token)
        .single();

      if (error || !data) {
        throw error || new Error('No project found with this share token');
      }

      await get().loadProject(data.id, true);

      set({
        isReadOnly: true,
        shareToken: token,
      });

      return true;
    } catch (err) {
      console.error('Error loading shared project:', err);
      deleteRequestHeader('x-share-token');
      set({
        isReadOnly: false,
        shareToken: null,
      });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  deleteProject: async (projectId) => {
    try {
      // Preferir borrado suave (RPC); si la función no existe, borrado definitivo.
      const rpc = getRpc();
      let softDeleted = false;
      if (rpc) {
        const { error } = await rpc('soft_delete_project', { p_project_id: projectId });
        if (!error) {
          softDeleted = true;
        } else if (!isMissingFunctionError(error)) {
          throw new Error(error.message || 'Error al eliminar el proyecto');
        }
      }

      if (!softDeleted) {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId);
        if (error) throw error;
      }

      set((state) => ({
        projectsList: state.projectsList.filter((p) => p.id !== projectId),
        favoriteProjectIds: state.favoriteProjectIds.filter((id) => id !== projectId),
      }));
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  },

  updateProjectStatus: async (projectId, status) => {
    try {
      // .select('id') permite verificar cuántas filas afectó el UPDATE: con RLS,
      // un no-dueño afecta 0 filas sin error y la UI no debe reportar éxito.
      const { data, error } = await supabase
        .from('projects')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', projectId)
        .select('id');
      if (error) throw error;
      if (Array.isArray(data) && data.length === 0) {
        throw new Error('No tienes permisos para modificar este proyecto');
      }
      set((state) => ({
        projectsList: state.projectsList.map((p) => (p.id === projectId ? { ...p, status } : p)),
      }));
      return true;
    } catch (err) {
      console.error('Error updating project status:', err);
      return false;
    }
  },

  loadVersions: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('project_versions')
        .select('*')
        .eq('project_id', projectId)
        .order('version', { ascending: false });
      if (error) throw error;
      const versions = ((data as ProjectVersion[] | null) || []);
      set({ projectVersions: versions });
      return versions;
    } catch (err) {
      console.error('Error loading versions:', err);
      return [];
    }
  },

  regenerateShareToken: async (expiresAt = null) => {
    const projectId = get().currentProjectId;
    if (!projectId) return null;
    try {
      const rpc = getRpc();
      if (rpc) {
        const { data, error } = await rpc('regenerate_share_token', {
          p_project_id: projectId,
          p_expires_at: expiresAt,
        });
        if (!error && typeof data === 'string') {
          set({ shareToken: data });
          return data;
        }
        if (error && !isMissingFunctionError(error)) throw new Error(error.message);
      }
      // Fallback directo (RLS del dueño sigue aplicando)
      const token = crypto.randomUUID();
      const { data, error } = await supabase
        .from('projects')
        .update({ share_token: token })
        .eq('id', projectId)
        .select('id');
      if (error) throw error;
      if (Array.isArray(data) && data.length === 0) {
        // RLS afectó 0 filas: no fijar un token que no existe en la BD.
        return null;
      }
      set({ shareToken: token });
      return token;
    } catch (err) {
      console.error('Error regenerating share token:', err);
      return null;
    }
  },

  revokeShareToken: async () => {
    const projectId = get().currentProjectId;
    if (!projectId) return;
    try {
      const rpc = getRpc();
      if (rpc) {
        const { error } = await rpc('revoke_share_token', { p_project_id: projectId });
        if (!error) {
          set({ shareToken: null });
          return;
        }
        if (!isMissingFunctionError(error)) throw new Error(error.message);
      }
      const { data, error } = await supabase
        .from('projects')
        .update({ share_token: null })
        .eq('id', projectId)
        .select('id');
      if (error) throw error;
      if (Array.isArray(data) && data.length === 0) {
        // RLS afectó 0 filas: el token sigue vigente en la BD, no tocar el estado local.
        console.warn('revokeShareToken: 0 filas afectadas (sin permisos sobre el proyecto)');
        return;
      }
      set({ shareToken: null });
    } catch (err) {
      console.error('Error revoking share token:', err);
    }
  },

  resetConfiguratorState: () => {
    deleteRequestHeader('x-share-token');
    set({
      placedComponents: [],
      selectedComponentUuid: null,
      replacingComponentUuid: null,
      totalPrice: 0,
      validationWarnings: [],
      projectName: 'Nueva Cotización',
      clientName: '',
      clientEmail: '',
      params: defaultParams,
      currentProjectId: null,
      lines: [{ ...DEFAULT_LINE }],
      activeLineId: DEFAULT_LINE.id,
      catalog: [],
      recommendedPalletizers: [],
      isReadOnly: false,
      shareToken: null,
      projectVersions: [],
      _historyPast: [],
      _historyFuture: [],
      _lastHistoryKey: null,
      canUndo: false,
      canRedo: false,
    });
  },
});
