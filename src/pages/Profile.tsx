import { useState } from "react";
import { User, Edit, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import HRMSLayout from "@/components/HRMSLayout";
import { useAuth } from "@/contexts/AuthContext";

const Profile = () => {
  const { employee, user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: employee?.first_name || "",
    lastName: employee?.last_name || "",
    email: employee?.email || "",
    phone: employee?.phone || "",
    address: employee?.address || "",
    salary: employee?.salary?.toString() || ""
  });
  const { toast } = useToast();

  const canManageSalary = employee?.roles?.role_name === 'HR Manager' || employee?.roles?.role_name === 'CXO';

  const handleEdit = () => {
    setFormData({
      firstName: employee?.first_name || "",
      lastName: employee?.last_name || "",
      email: employee?.email || "",
      phone: employee?.phone || "",
      address: employee?.address || "",
      salary: employee?.salary?.toString() || ""
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      firstName: employee?.first_name || "",
      lastName: employee?.last_name || "",
      email: employee?.email || "",
      phone: employee?.phone || "",
      address: employee?.address || "",
      salary: employee?.salary?.toString() || ""
    });
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('employees')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          salary: formData.salary ? parseFloat(formData.salary) : null
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      // Also update auth user email if changed
      if (formData.email !== employee?.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: formData.email
        });
        if (authError) throw authError;
      }

      toast({
        title: "Success",
        description: "Profile updated successfully"
      });

      setIsEditing(false);
      // Refresh the page to get updated data
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <HRMSLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Profile</h1>
            <p className="text-muted-foreground">Manage your profile information</p>
          </div>
          {!isEditing ? (
            <Button onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button onClick={handleSave} disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle>{employee?.first_name} {employee?.last_name}</CardTitle>
                <CardDescription>@{employee?.username}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                {isEditing ? (
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    disabled={isLoading}
                  />
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{employee?.first_name || "Not set"}</p>
                )}
              </div>

              <div>
                <Label htmlFor="lastName">Last Name</Label>
                {isEditing ? (
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    disabled={isLoading}
                  />
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{employee?.last_name || "Not set"}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    disabled={isLoading}
                  />
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{employee?.email || "Not set"}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={isLoading}
                  />
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{employee?.phone || "Not set"}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">Address</Label>
                {isEditing ? (
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    disabled={isLoading}
                  />
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{employee?.address || "Not set"}</p>
                )}
              </div>

              {canManageSalary && (
                <div>
                  <Label htmlFor="salary">Salary</Label>
                  {isEditing ? (
                    <Input
                      id="salary"
                      type="number"
                      value={formData.salary}
                      onChange={(e) => setFormData(prev => ({ ...prev, salary: e.target.value }))}
                      disabled={isLoading}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {employee?.salary ? `${employee.salary.toLocaleString()}` : "Not set"}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Organization Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Role</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{employee?.roles?.role_name || "Not assigned"}</p>
                </div>
                <div>
                  <Label>Designation</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{employee?.designations?.designation_name || "Not assigned"}</p>
                </div>
                <div>
                  <Label>Department</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{employee?.departments?.dept_name || "Not assigned"}</p>
                </div>
                <div>
                  <Label>Date of Joining</Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {employee?.doj ? new Date(employee.doj).toLocaleDateString() : "Not set"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </HRMSLayout>
  );
};

export default Profile;