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

    // Allow overriding via request body
    let body: any = {};
    try { body = await req.json(); } catch {}
    const email: string = body.email || "hr@company.com";
    const password: string = body.password || "Pasword123";

    // Find or create the HR auth user (email confirmed)
    let userId: string | null = null;

    const { data: list, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) throw listErr;
    const existingUser = list.users.find((u: any) => u.email === email);

    if (existingUser) {
      userId = existingUser.id;
      await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name: "HR", last_name: "Manager" },
      });
      if (createErr) throw createErr;
      userId = created.user?.id ?? null;
      if (!userId) throw new Error("Failed to create HR user");
    }

    // Ensure role_id for 'HR Manager'
    let { data: role, error: roleErr } = await admin
      .from('roles')
      .select('role_id')
      .eq('role_name', 'HR Manager')
      .maybeSingle();

    if (roleErr) throw roleErr;

    if (!role) {
      // Create the role if missing (service role bypasses RLS)
      const { data: newRole, error: insertRoleErr } = await admin
        .from('roles')
        .insert({ role_name: 'HR Manager', description: 'Human Resources Manager' })
        .select('role_id')
        .single();
      if (insertRoleErr) throw insertRoleErr;
      role = newRole;
    }

    // Upsert employee record for username 'hr'
    const { error: upsertErr } = await admin
      .from('employees')
      .upsert({
        user_id: userId,
        first_name: 'HR',
        last_name: 'Manager',
        email,
        username: 'hr',
        role_id: role.role_id,
        designation_id: null,
        department_id: null,
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