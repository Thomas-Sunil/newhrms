import { useEffect, useState } from "react";
import { Building2, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CreateDepartmentDialog from "@/components/CreateDepartmentDialog";
import EditDepartmentDialog from "@/components/EditDepartmentDialog";
import HRMSLayout from "@/components/HRMSLayout";

interface Department {
  dept_id: string;
  dept_name: string;
  dept_head_id: string | null;
  dept_head?: {
    first_name: string;
    last_name: string;
  };
  created_at: string;
}

const Departments = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      console.log('Fetching departments...');
      const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          dept_head:employees!dept_head_id(first_name, last_name)
        `)
        .order('dept_name');

      console.log('Department fetch result:', { data, error });
      if (error) throw error;
      setDepartments((data as any) || []);
    } catch (error: any) {
      console.error('Department fetch error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch departments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditDepartment = (department: Department) => {
    setSelectedDepartment(department);
    setEditDialogOpen(true);
  };

  const handleDeleteDepartment = async (deptId: string, deptName: string) => {
    if (!confirm(`Are you sure you want to delete ${deptName}?`)) return;

    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('dept_id', deptId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${deptName} deleted successfully`
      });
      
      fetchDepartments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete department",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <HRMSLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </HRMSLayout>
    );
  }

  return (
    <HRMSLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Departments</h1>
            <p className="text-muted-foreground">Manage company departments</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Department
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => (
            <Card key={dept.dept_id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Building2 className="h-8 w-8 text-primary" />
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEditDepartment(dept)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteDepartment(dept.dept_id, dept.dept_name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle>{dept.dept_name}</CardTitle>
                <CardDescription>
                  {dept.dept_head
                    ? `Head: ${dept.dept_head.first_name} ${dept.dept_head.last_name}`
                    : "No department head assigned"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Created: {new Date(dept.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <CreateDepartmentDialog 
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={fetchDepartments}
        />
        
        <EditDepartmentDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          department={selectedDepartment}
          onSuccess={fetchDepartments}
        />
      </div>
    </HRMSLayout>
  );
};

export default Departments;