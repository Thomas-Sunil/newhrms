import { useEffect, useState } from "react";
import HRMSLayout from "@/components/HRMSLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";
import { CreatePolicyDialog } from "@/components/CreatePolicyDialog";

// Define the type for a policy based on your schema
type Policy = {
  policy_id: string;
  policy_name: string;
  description: string;
  effective_date: string;
};

const Policies = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { employee } = useAuth();

  const fetchPolicies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('policies')
      .select('*')
      .order('effective_date', { ascending: false });

    if (error) {
      console.error("Error fetching policies:", error);
    } else {
      setPolicies(data as Policy[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const canManagePolicies = employee?.roles?.role_name === 'HR Manager' || employee?.roles?.role_name === 'CXO';

  return (
    <HRMSLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Company Policies</h1>
          {canManagePolicies && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Policy
            </Button>
          )}
        </div>

        {loading ? (
          <p>Loading policies...</p>
        ) : policies.length === 0 ? (
          <p>No policies found.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {policies.map((policy) => (
              <Card key={policy.policy_id}>
                <CardHeader>
                  <CardTitle>{policy.policy_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{policy.description}</p>
                  <p className="text-xs text-muted-foreground mt-4">
                    Effective from: {new Date(policy.effective_date).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {canManagePolicies && (
        <CreatePolicyDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onPolicyCreated={fetchPolicies} // Refetch policies after one is created
        />
      )}
    </HRMSLayout>
  );
};

export default Policies;
