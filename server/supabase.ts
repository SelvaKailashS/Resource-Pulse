import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || "https://vfvwviprodmoqqsxzfva.supabase.co";
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmdnd2aXByb2Rtb3Fxc3h6ZnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MDkwMzUsImV4cCI6MjEwNTk4NTAzNX0.Zgv35KvSpxpmdcmqMrpIZCVru-XFwR-626297r9vzeQ";

export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
