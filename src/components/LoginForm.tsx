import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, User, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const LoginForm = () => {
  const [credentials, setCredentials] = useState({
    username: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.username || !credentials.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    const { error } = await signIn(credentials.username, credentials.password);
    
    if (error) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid username or password",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Welcome!",
        description: "Successfully logged in to HRMS Pro",
      });
    }
    
    setIsLoading(false);
  };

  const handleResetCEO = async () => {
    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('bootstrap-ceo', {
        body: { email: 'thomassunilpzr@gmail.com' },
      });
      if (error) throw error;
      toast({
        title: 'CEO Reset',
        description: "CEO account recreated and email auto-confirmed. Use 'ceo' / 'Password123' to sign in.",
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to reset CEO account',
        variant: 'destructive',
      });
    }
    setIsResetting(false);
  };

  const handleResetHR = async () => {
    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-hr', {
        body: { email: 'hr@company.com', password: 'Pasword123' },
      });
      if (error) throw error;
      toast({
        title: 'HR Reset',
        description: "HR account recreated. Use 'hr' / 'Pasword123' to sign in.",
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to reset HR account',
        variant: 'destructive',
      });
    }
    setIsResetting(false);
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
          <p className="text-white/80">Human Resource Management System</p>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm shadow-elegant border-0">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={credentials.username}
                    onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            {/* Demo credentials hint */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-4">
              <div className="text-sm text-muted-foreground text-center space-y-2">
                <p><strong>Available Demo Accounts:</strong></p>
                
                <div className="bg-white/80 p-2 rounded border">
                  <strong>CEO Account:</strong><br />
                  Username: <code className="bg-muted px-1 rounded">ceo</code><br />
                  Password: <code className="bg-muted px-1 rounded">Password123</code>
                </div>
                
                <div className="bg-white/80 p-2 rounded border">
                  <strong>HR Manager Account:</strong><br />
                  Username: <code className="bg-muted px-1 rounded">hr</code><br />
                  Password: <code className="bg-muted px-1 rounded">Pasword123</code>
                </div>
              </div>
              
              <div className="flex gap-2 justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleResetCEO}
                  disabled={isResetting}
                >
                  {isResetting ? 'Resetting...' : 'Reset CEO'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleResetHR}
                  disabled={isResetting}
                >
                  {isResetting ? 'Resetting...' : 'Reset HR'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginForm;