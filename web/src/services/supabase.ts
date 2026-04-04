import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Professional Logic: Secure Browser Registry Client
// Uses Cookies via @supabase/ssr to sync with Middleware
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
