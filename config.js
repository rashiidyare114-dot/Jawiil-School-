// JAWIIL Primary and Secondary School
// Supabase connection
// This is the publishable/public key. Never put a secret/service_role key here.

const SUPABASE_URL = "https://whnlypnynmjkursjdanb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ekGNO-r_SBbL5tn0v5cw9g_qqsD2Cka";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
