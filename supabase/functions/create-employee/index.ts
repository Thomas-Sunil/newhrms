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

    const { 
      firstName, 
      lastName, 
      email, 
      username, 
      password, 
      departmentId, 
      designationId, 
      roleId, 
      employeeType,
      phone,
      address,
      salary,
      gender,
      dob
    } = await req.json();

    // Check if user already exists by email
    const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers();
    if (listError) throw listError;
    
    const emailExists = existingUsers.users.some(user => user.email === email);
    if (emailExists) {
      throw new Error(`A user with email ${email} already exists`);
    }

    // Check if username already exists
    const { data: existingEmployee, error: empCheckError } = await admin
      .from('employees')
      .select('username')
      .eq('username', username)
      .maybeSingle();
      
    if (empCheckError) throw empCheckError;
    if (existingEmployee) {
      throw new Error(`Username ${username} already exists`);
    }

    // Create auth user with email confirmed
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Failed to create user");

    // Create employee record
    const { error: employeeError } = await admin
      .from('employees')
      .insert({
        user_id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        email,
        username,
        role_id: roleId,
        designation_id: designationId || null,
        department_id: departmentId || null,
        phone: phone || null,
        address: address || null,
        salary: salary ? parseFloat(salary) : null,
        gender: gender || null,
        dob: dob || null,
        doj: new Date().toISOString().split('T')[0],
        status: 'active'
      });

    if (employeeError) throw employeeError;

    return new Response(JSON.stringify({ success: true, userId: authData.user.id }), {
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