import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase environment variables");
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Allow overriding email/password via request body
    let provided: any = {};
    try { provided = await req.json(); } catch { provided = {}; }
    const email: string = provided.email || "ceo@yourcompany.com";
    const password: string = provided.password || "Password123";

    // Remove any existing CEO account (clean start)
    const { data: existingEmp } = await admin
      .from('employees')
      .select('user_id')
      .eq('username', 'ceo')
      .maybeSingle();
    if (existingEmp?.user_id) {
      try { await admin.auth.admin.deleteUser(existingEmp.user_id); } catch (_) { /* ignore */ }
    }

    // Also remove any existing CEO employee row to avoid duplicates
    try { await admin.from('employees').delete().eq('username', 'ceo'); } catch (_) { /* ignore */ }

    // 1) Create or get the CEO auth user, with email confirmed
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: "Chief", last_name: "Executive" },
    });

    let userId = created?.user?.id || null;

    if (createErr || !userId) {
      // Try to find existing user by listing users and matching email
      const { data: list, error: listErr } = await admin.auth.admin.listUsers();
      if (listErr) throw listErr;
      const existing = list.users.find((u: any) => u.email === email);
      if (!existing && createErr) throw createErr;
      userId = existing?.id ?? userId;
    }

    if (!userId) throw new Error("Failed to determine user id for CEO");

    // Ensure email is confirmed for the user (handles existing users)
    await admin.auth.admin.updateUserById(userId, { email_confirm: true });

    // 2) Ensure required foreign keys exist (create if missing)
    const getOrCreateRole = async () => {
      const { data, error } = await admin.from('roles').select('role_id').eq('role_name', 'CXO').maybeSingle();
      if (error) throw error;
      if (data) return data;
      const { data: inserted, error: insErr } = await admin.from('roles').insert({ role_name: 'CXO' }).select('role_id').single();
      if (insErr) throw insErr;
      return inserted;
    };

    const getOrCreateDesignation = async () => {
      const { data, error } = await admin.from('designations').select('designation_id').eq('designation_name', 'Chief Executive Officer').maybeSingle();
      if (error) throw error;
      if (data) return data;
      const { data: inserted, error: insErr } = await admin.from('designations').insert({ designation_name: 'Chief Executive Officer' }).select('designation_id').single();
      if (insErr) throw insErr;
      return inserted;
    };

    const getOrCreateDepartment = async () => {
      const { data, error } = await admin.from('departments').select('dept_id').eq('dept_name', 'Board of Directors').maybeSingle();
      if (error) throw error;
      if (data) return data;
      const { data: inserted, error: insErr } = await admin.from('departments').insert({ dept_name: 'Board of Directors' }).select('dept_id').single();
      if (insErr) throw insErr;
      return inserted;
    };

    const [role, desig, dept] = await Promise.all([
      getOrCreateRole(),
      getOrCreateDesignation(),
      getOrCreateDepartment(),
    ]);

    // 3) Upsert employee record (idempotent)
    const { error: upsertErr } = await admin
      .from('employees')
      .upsert({
        user_id: userId,
        first_name: 'Chief',
        last_name: 'Executive',
        email,
        username: 'ceo',
        role_id: role.role_id,
        designation_id: desig.designation_id,
        department_id: dept.dept_id,
        doj: new Date().toISOString().split('T')[0],
        status: 'active',
      }, { onConflict: 'username' });

    if (upsertErr) throw upsertErr;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message || 'Unknown error' }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});