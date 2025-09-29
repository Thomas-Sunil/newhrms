import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ApplyLeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface LeaveCategory {
  id: string;
  name: string;
}

const ApplyLeaveDialog = ({ open, onOpenChange, onSuccess }: ApplyLeaveDialogProps) => {
  const [formData, setFormData] = useState({
    leave_category_id: "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [leaveCategories, setLeaveCategories] = useState<LeaveCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { employee } = useAuth();

  // Fetch leave categories when dialog opens
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from("leave_categories").select("*");
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setLeaveCategories(data || []);
      }
    };
    if (open) fetchCategories();
  }, [open, toast]);

  // Calculate total leave days
  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    return diff >= 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) + 1 : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.leave_category_id || !formData.startDate || !formData.endDate || !formData.reason) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast({ title: "Error", description: "End date must be after start date", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const totalDays = calculateDays(formData.startDate, formData.endDate);

      const { error } = await supabase.from("leave_applications").insert({
        employee_id: employee?.emp_id,
        leave_category_id: formData.leave_category_id,
        start_date: formData.startDate,
        end_date: formData.endDate,
        total_days: totalDays,
        reason: formData.reason,
        status: "pending",
      });

      if (error) throw error;

      toast({ title: "Success", description: "Leave application submitted successfully" });

      setFormData({ leave_category_id: "", startDate: "", endDate: "", reason: "" });
      onOpenChange(false);
      onSuccess(); // 🔥 refreshes leave list
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const totalDays = calculateDays(formData.startDate, formData.endDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Apply for Leave</DialogTitle>
          <DialogDescription>Fill in the form to request leave</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Leave Type */}
          <div>
            <Label htmlFor="leave_category_id">Leave Type *</Label>
            <Select
              value={formData.leave_category_id}
              onValueChange={(val) => setFormData((prev) => ({ ...prev, leave_category_id: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {leaveCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((p) => ({ ...p, startDate: e.target.value }))}
                disabled={isLoading}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))}
                disabled={isLoading}
                min={formData.startDate || new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          {/* Total days */}
          {totalDays > 0 && (
            <div className="text-sm text-muted-foreground">Total days: {totalDays}</div>
          )}

          {/* Reason */}
          <div>
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData((p) => ({ ...p, reason: e.target.value }))}
              disabled={isLoading}
              placeholder="State your reason"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ApplyLeaveDialog;