import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // use service key on server

export const supabaseServer = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
);
