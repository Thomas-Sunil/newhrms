import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Employee {
  emp_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  dob?: string;
  doj: string;
  gender?: string;
  salary?: number;
  username: string;
  role_id: string;
  designation_id?: string;
  department_id?: string;
  status: string;
  roles?: { role_name: string };
  designations?: { designation_name: string };
  departments?: { dept_name: string };
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  employee: Employee | null;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
  getRoleDashboard: (role?: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const getRoleDashboard = (role?: string) => {
    // Everyone uses the main dashboard now - no role-based redirects
    return '/';
  };

  const fetchEmployee = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          roles:role_id(role_name),
          designations:designation_id(designation_name),
          departments:department_id(dept_name)
        `)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching employee:', error);
        return;
      }

      if (data) {
        setEmployee(data);
      }
    } catch (error) {
      console.error('Error fetching employee:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch employee data when user logs in
          setTimeout(() => {
            fetchEmployee(session.user.id);
          }, 0);
        } else {
          setEmployee(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchEmployee(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      console.log('Attempting to sign in with username:', username);
      
      // Resolve username to email via public Edge Function (bypasses RLS)
      const { data: lookupData, error: lookupError } = await supabase.functions.invoke('lookup-username', {
        body: { username: username.trim() }
      });

      console.log('Username lookup result:', { lookupData, lookupError });

      if (lookupError || !lookupData?.email) {
        return { error: { message: 'Invalid username or password' } };
      }

      // Use the email to sign in
      console.log('Attempting auth sign in with email:', lookupData.email);
      const { error } = await supabase.auth.signInWithPassword({
        email: lookupData.email,
        password: password,
      });

      console.log('Auth sign in result:', { error });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: userData
        }
      });

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Attempt global sign-out first (server + local)
      const { error } = await supabase.auth.signOut({ scope: 'global' });

      if (error) {
        // Fall back to local sign-out if the server doesn't recognize the user/session
        await supabase.auth.signOut({ scope: 'local' });
      }
    } catch {
      // Ensure local clear even if above throws
      try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
    } finally {
      // Clear app state regardless
      setSession(null);
      setUser(null);
      setEmployee(null);
      try { localStorage.removeItem('sb-sngjqizvseyvuaxfvvjr-auth-token'); } catch {}

      toast({
        title: "Signed out",
        description: "You have been signed out."
      });
    }
  };

  const value = {
    user,
    session,
    employee,
    signIn,
    signUp,
    signOut,
    loading,
    getRoleDashboard,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};