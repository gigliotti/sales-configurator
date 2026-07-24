import type { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabaseClient';
import { dictionaries, interpolate } from '../../i18n';
import type { Language } from '../types';
import type { ConfiguratorState } from '../useConfiguratorStore';

export interface I18nSlice {
  language: Language;
  /** Overrides cargados desde la tabla `translations` de Supabase (opcional). */
  translations: Record<string, string>;
  /** Cache por idioma para no re-consultar la BD en cada cambio. */
  _translationsCache: Partial<Record<Language, Record<string, string>>>;

  loadTranslations: () => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => string;
}

export const createI18nSlice: StateCreator<ConfiguratorState, [], [], I18nSlice> = (set, get) => ({
  language: 'es',
  translations: {},
  _translationsCache: {},

  loadTranslations: async () => {
    const { language, _translationsCache } = get();
    const cached = _translationsCache[language];
    if (cached) {
      set({ translations: cached });
      return;
    }
    try {
      const { data, error } = await supabase
        .from('translations')
        .select('key, value')
        .eq('language', language);

      if (error) throw error;

      const newTranslations: Record<string, string> = {};
      if (data) {
        (data as { key: string; value: string }[]).forEach((row) => {
          newTranslations[row.key] = row.value;
        });
      }
      set({
        translations: newTranslations,
        _translationsCache: { ...get()._translationsCache, [language]: newTranslations },
      });
    } catch (err) {
      console.error('Error loading translations:', err);
    }
  },

  setLanguage: async (lang) => {
    set({ language: lang });
    const { activeProfile } = get();
    if (activeProfile) {
      try {
        const { error } = await supabase
          .from('user_profiles')
          .update({ preferred_language: lang })
          .eq('id', activeProfile.id);
        if (error) throw error;
      } catch (err) {
        console.error('Error updating profile language:', err);
      }
    }
    await get().loadTranslations();
  },

  // Prioridad: overrides de BD > diccionario local > fallback del llamador > clave.
  t: (key, fallback, params) => {
    const { translations, language } = get();
    const localDict = dictionaries[language] as Record<string, string> | undefined;
    const raw = translations[key] ?? localDict?.[key] ?? fallback ?? key;
    return interpolate(raw, params);
  },
});
