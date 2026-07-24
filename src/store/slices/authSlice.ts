import type { StateCreator } from 'zustand';
import { supabase, deleteRequestHeader } from '../../lib/supabaseClient';
import type { Language, UserProfile } from '../types';
import type { ConfiguratorState } from '../useConfiguratorStore';

export interface ActiveProfile {
  id: string;
  name: string;
  role: string;
  email: string;
}

export interface AuthSlice {
  activeProfile: ActiveProfile | null;
  profiles: UserProfile[];

  loadProfiles: () => Promise<void>;
  /**
   * Selecciona el perfil activo de la UI. NOTA de seguridad: esto ya NO envía
   * ninguna cabecera de suplantación al backend — la identidad real la impone
   * RLS a partir de auth.uid(). Solo afecta a filtros de vista del cliente.
   */
  setActiveProfile: (profileId: string | null) => Promise<void>;
  initAuthListener: () => () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

function normalizeLanguage(value: unknown): Language {
  return value === 'en' || value === 'es' ? value : 'es';
}

export const createAuthSlice: StateCreator<ConfiguratorState, [], [], AuthSlice> = (set, get) => ({
  activeProfile: null,
  profiles: [],

  loadProfiles: async () => {
    try {
      const { data } = await supabase.from('user_profiles').select('*');
      if (data) {
        set({ profiles: data });
      }
    } catch (err) {
      console.error('Error loading profiles:', err);
    }
  },

  setActiveProfile: async (profileId) => {
    if (!profileId) {
      set({ activeProfile: null, favoriteProjectIds: [] });
      await get().loadProjectsList();
      return;
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (profileError) throw profileError;
      if (!profile) return;

      set({
        activeProfile: {
          id: profile.id,
          name: profile.name,
          role: profile.role,
          email: (profile as { email?: string }).email || '',
        },
        language: normalizeLanguage(profile.preferred_language),
      });

      await get().loadTranslations();
      await get().loadProjectsList();
    } catch (err) {
      console.error('Error setting active profile:', err);
      set({ activeProfile: null, favoriteProjectIds: [] });
      await get().loadProjectsList();
    }
  },

  initAuthListener: () => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Limpiar el estado de vista compartida SOLO en transiciones reales de sesión.
      // Eventos como INITIAL_SESSION o TOKEN_REFRESHED no deben borrar la cabecera
      // x-share-token, de la que depende la vista /share/:token para pasar RLS.
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        deleteRequestHeader('x-share-token');
        set({ isReadOnly: false, shareToken: null });
      }
      if (session?.user) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError) throw profileError;

          if (profile) {
            set({
              activeProfile: {
                id: profile.id,
                name: profile.name,
                role: profile.role,
                email: session.user.email || '',
              },
              language: normalizeLanguage(profile.preferred_language),
            });
          }
        } catch (err) {
          console.error('Error in auth listener profile fetch:', err);
          set({
            activeProfile: {
              id: session.user.id,
              name: session.user.user_metadata?.name || 'User',
              role: 'client',
              email: session.user.email || '',
            },
          });
        }
        await get().loadTranslations();
        await get().loadProjectsList();
      } else {
        set({
          activeProfile: null,
          favoriteProjectIds: [],
          projectsList: [],
        });
        await get().loadProjectsList();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  },

  login: async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      const errMsg = err instanceof Error ? err.message : 'Error de inicio de sesión';
      return { success: false, error: errMsg };
    }
  },

  logout: async () => {
    try {
      deleteRequestHeader('x-share-token');
      set({ isReadOnly: false, shareToken: null });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.error('Logout error:', err);
    }
  },
});
