import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables are missing! Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

/**
 * Cabeceras dinámicas que se inyectan en cada request REST (p. ej. x-share-token
 * para las vistas compartidas de solo lectura). Se implementa con un fetch
 * personalizado en lugar de tocar la API interna del cliente de supabase-js,
 * que no es estable entre versiones.
 */
const dynamicHeaders = new Map<string, string>();

export function setRequestHeader(key: string, value: string): void {
  dynamicHeaders.set(key.toLowerCase(), value);
}

export function deleteRequestHeader(key: string): void {
  dynamicHeaders.delete(key.toLowerCase());
}

export function getRequestHeader(key: string): string | undefined {
  return dynamicHeaders.get(key.toLowerCase());
}

const headerInjectingFetch: typeof fetch = (input, init) => {
  if (dynamicHeaders.size === 0) {
    return fetch(input, init);
  }
  const headers = new Headers(init?.headers);
  dynamicHeaders.forEach((value, key) => headers.set(key, value));
  return fetch(input, { ...init, headers });
};

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  global: { fetch: headerInjectingFetch },
});

export default supabase;
