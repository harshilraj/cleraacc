import { createClient } from '@supabase/supabase-js';

let clientInstance: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (clientInstance) return clientInstance;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables. Please configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  clientInstance = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  return clientInstance;
}

// Proxy wrapper to allow lazy initialization at runtime
export const supabase = new Proxy({} as any, {
  get(target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
  set(target, prop, value, receiver) {
    const client = getClient();
    return Reflect.set(client, prop, value, receiver);
  },
});
