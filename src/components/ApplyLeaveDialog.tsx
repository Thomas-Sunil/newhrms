import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ApplyLeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface LeaveType {
  leave_type_id: string;
  leave_name: string;
}

const ApplyLeaveDialog = ({ open, onOpenChange, onSuccess }: ApplyLeaveDialogProps) => {
  const [formData, setFormData] = useState({
    leave_type_id: "",
    startDate: "",
    endDate: "",
    reason: ""
  });
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { employee } = useAuth();

  useEffect(() => {
    const fetchLeaveTypes = async () => {
      const { data, error } = await supabase.from('leave_types').select('*');
      if (data) setLeaveTypes(data);
    };
    if (open) {
      fetchLeaveTypes();
    }
  }, [open]);

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.leave_type_id || !formData.startDate || !formData.endDate || !formData.reason) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast({ title: "Error", description: "End date must be after start date", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    
    try {
      const totalDays = calculateDays(formData.startDate, formData.endDate);
      
      let initialStatus = 'pending';
      const applicantRole = employee?.roles?.role_name;

      if (applicantRole === 'Department Head' || applicantRole === 'HR Manager' || applicantRole === 'CXO') {
        initialStatus = 'dept_approved'; // Bypasses dept head approval, goes straight to HR
      }

      const { error } = await supabase
        .from('leave_requests')
        .insert({
          emp_id: employee?.emp_id,
          leave_type_id: formData.leave_type_id,
          start_date: formData.startDate,
          end_date: formData.endDate,
          total_days: totalDays,
          reason: formData.reason,
          status: initialStatus
        });

      if (error) throw error;

      toast({ title: "Success", description: "Leave request submitted successfully" });
      
      setFormData({ leave_type_id: "", startDate: "", endDate: "", reason: "" });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit leave request", variant: "destructive" });
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
          <DialogDescription>Submit a new leave request for approval</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="leave_type_id">Leave Type *</Label>
            <Select value={formData.leave_type_id} onValueChange={(value) => setFormData(prev => ({ ...prev, leave_type_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map(lt => (
                  <SelectItem key={lt.leave_type_id} value={lt.leave_type_id}>{lt.leave_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                disabled={isLoading}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                disabled={isLoading}
                min={formData.startDate || new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {totalDays > 0 && (
            <div className="text-sm text-muted-foreground">Total days: {totalDays}</div>
          )}

          <div>
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              disabled={isLoading}
              placeholder="Please provide reason for leave"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Submitting..." : "Submit Leave Request"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ApplyLeaveDialog;