import { createClient } from '@supabase/supabase-js';

// Retrieve Supabase environment variables configured in Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check for missing credentials and warn the developer
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Error: Supabase environment variables are missing!\n' +
    'Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

// Create and export the single instance of the Supabase client
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url-replace-me.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
