import { createClient } from '@supabase/supabase-js';
import { localDb, isLocalMode } from './localDb';

// Check if we have valid Supabase credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Helper to check if Supabase is properly configured
const hasValidSupabaseConfig = () => {
  return supabaseUrl && 
         supabaseAnonKey && 
         supabaseUrl !== 'your_supabase_url_here' &&
         supabaseAnonKey !== 'your_supabase_anon_key_here' &&
         (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'));
};

// Mock Supabase client for local development
const createMockSupabaseClient = () => {
  return {
    from: (table: string) => {
      if (table === 'audit_log') {
        return {
          select: () => ({
            order: () => ({
              limit: (limit: number) => Promise.resolve({ 
                data: localDb.getAuditLogs(limit), 
                error: null 
              })
            })
          }),
          insert: (data: any) => Promise.resolve({ 
            data: localDb.createAuditLog(data), 
            error: null 
          })
        };
      }
      if (table === 'orders') {
        return {
          insert: (data: any) => ({
            select: () => ({
              single: () => Promise.resolve({ 
                data: localDb.createOrder(data), 
                error: null 
              })
            })
          }),
          update: (updates: any) => ({
            eq: (field: string, value: any) => ({
              select: () => ({
                single: () => {
                  const updated = localDb.updateOrder(value, updates);
                  return Promise.resolve({ data: updated, error: null });
                }
              })
            })
          })
        };
      }
      // Default fallback for other tables
      return {
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null })
      };
    }
  };
};

// Create Supabase client based on mode and configuration
let supabase: any;

if (isLocalMode() || !hasValidSupabaseConfig()) {
  console.log('🔧 Running in local mode - using mock database');
  supabase = createMockSupabaseClient();
} else {
  console.log('🌐 Using Supabase backend');
  supabase = createClient(supabaseUrl!, supabaseAnonKey!);
}

export { supabase, localDb, isLocalMode };
