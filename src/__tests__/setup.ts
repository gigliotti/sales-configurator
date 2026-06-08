/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest';
import crypto from 'crypto';
import * as mockSupabase from '../lib/__mocks__/supabaseClient';

// Ensure crypto and randomUUID are globally available in Node testing environment
if (!globalThis.crypto) {
  globalThis.crypto = crypto as any;
}
if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = () => {
    return crypto.randomUUID();
  };
}

// Globally mock the Supabase client to point to our stateful mock database
vi.mock('../lib/supabaseClient', () => mockSupabase);
