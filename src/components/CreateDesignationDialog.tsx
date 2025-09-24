import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CreateDesignationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateDesignationDialog = ({ open, onOpenChange, onSuccess }: CreateDesignationDialogProps) => {
  const [designationName, setDesignationName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!designationName.trim()) {
      toast({
        title: "Error",
        description: "Designation name cannot be empty.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      // Check if designation already exists
      const { data: existingDesignation, error: checkError } = await supabase
        .from("designations")
        .select("designation_id")
        .ilike("designation_name", designationName.trim())
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingDesignation) {
        toast({
          title: "Error",
          description: "A designation with this name already exists.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Insert new designation
      const { error } = await supabase
        .from("designations")
        .insert({ 
          designation_name: designationName.trim()
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Designation created successfully.",
      });
      
      setDesignationName("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error creating designation:", error);
      
      // Handle specific RLS error
      if (error.message?.includes('row-level security') || error.message?.includes('policy')) {
        toast({
          title: "Permission Denied",
          description: "You don't have permission to create designations. Contact your system administrator.",
          variant: "destructive",
        });
      } else if (error.code === '23505') {
        // Handle unique constraint violation
        toast({
          title: "Error",
          description: "A designation with this name already exists.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create designation.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDesignationName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Designation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="designationName" className="text-right">
                Designation Name
              </Label>
              <Input
                id="designationName"
                value={designationName}
                onChange={(e) => setDesignationName(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Senior Software Engineer"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Designation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};