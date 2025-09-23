import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SetupCEO = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [ceoExists, setCeoExists] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkCEOExists();
  }, []);

  const checkCEOExists = async () => {
    try {
      console.log('Checking if CEO exists...');
      const { data, error } = await supabase
        .from('employees')
        .select('emp_id')
        .eq('username', 'ceo')
        .maybeSingle();

      console.log('CEO check result:', { data, error });
      
      if (error) {
        console.error('Error checking CEO:', error);
        setCeoExists(false);
        return;
      }

      const exists = !!data;
      console.log('CEO exists:', exists);
      setCeoExists(exists);
    } catch (error) {
      console.error('CEO check failed:', error);
      setCeoExists(false);
    }
  };

  const createCEOAccount = async () => {
    setIsCreating(true);

    try {
      console.log('Creating CEO account...');
      const { data, error } = await supabase.functions.invoke('bootstrap-ceo', {
        body: { email: 'thomassunilpzr@gmail.com' },
      });

      console.log('CEO creation result:', { data, error });

      if (error) {
        console.error('CEO creation error:', error);
        throw error;
      }

      toast({
        title: "Success!",
        description: "CEO account created successfully. Use 'ceo' / 'Password123' to sign in.",
      });

      setCeoExists(true);
      
      // Refresh page to show login form
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error('CEO creation failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create CEO account",
        variant: "destructive"
      });
    }

    setIsCreating(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-md">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">HRMS Pro</h1>
          <p className="text-white/80">System Setup</p>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm shadow-elegant border-0">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">
              {ceoExists ? 'CEO Account Ready' : 'Create CEO Account'}
            </CardTitle>
            <CardDescription>
              {ceoExists 
                ? 'The default CEO account is already set up and ready to use.'
                : 'Set up the default CEO account to get started with your HRMS system.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ceoExists ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    <strong>CEO account is ready!</strong><br />
                    You can log in with:<br />
                    Username: <code className="bg-green-100 px-1 rounded">ceo</code><br />
                    Password: <code className="bg-green-100 px-1 rounded">Password123</code>
                  </p>
                </div>
                <Button 
                  onClick={() => window.location.reload()}
                  className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                >
                  Go to Login
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    This will create a default CEO account with:<br />
                    • Username: <code className="bg-blue-100 px-1 rounded">ceo</code><br />
                    • Password: <code className="bg-blue-100 px-1 rounded">Password123</code><br />
                    • Email: <code className="bg-blue-100 px-1 rounded">thomassunilpzr@gmail.com</code><br />
                    • Role: CXO<br />
                    • Department: Board of Directors<br /><br />
                    <strong>Note:</strong> You can change the email to your real email address for testing.
                  </p>
                </div>
                
                <Button 
                  onClick={createCEOAccount}
                  disabled={isCreating}
                  className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                >
                  {isCreating ? "Creating Account..." : "Create CEO Account"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SetupCEO;