import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

interface LeaveRequest {
  leave_id: string;
  emp_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  employees?: {
    first_name: string;
    last_name: string;
    username: string;
  };
}

interface LeaveReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaveRequest: LeaveRequest | null;
  onSuccess: () => void;
  reviewType: 'dept_head' | 'hr';
}

const LeaveReviewDialog = ({ open, onOpenChange, leaveRequest, onSuccess, reviewType }: LeaveReviewDialogProps) => {
  const [comments, setComments] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { employee } = useAuth();

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!leaveRequest) return;
    
    setIsLoading(true);
    
    try {
      let updateData: any = {};
      
      if (reviewType === 'dept_head') {
        updateData = {
          status: action === 'approve' ? 'dept_approved' : 'rejected',
          dept_head_comments: comments,
          reviewed_by_dept_head: employee?.emp_id,
          dept_review_date: new Date().toISOString()
        };
      } else {
        updateData = {
          status: action === 'approve' ? 'approved' : 'rejected',
          hr_comments: comments,
          reviewed_by_hr: employee?.emp_id,
          hr_review_date: new Date().toISOString()
        };
      }

      const { error } = await supabase
        .from('leave_requests')
        .update(updateData)
        .eq('leave_id', leaveRequest.leave_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Leave request ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      });
      
      setComments("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to ${action} leave request`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!leaveRequest) return null;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pending", variant: "secondary" as const },
      dept_approved: { label: "Dept Approved", variant: "default" as const },
      approved: { label: "Approved", variant: "default" as const },
      rejected: { label: "Rejected", variant: "destructive" as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {reviewType === 'dept_head' ? 'Department Head Review' : 'HR Review'} - Leave Request
          </DialogTitle>
          <DialogDescription>
            Review and approve/reject the leave request
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Employee</Label>
              <p className="text-sm font-medium">
                {leaveRequest.employees?.first_name} {leaveRequest.employees?.last_name}
              </p>
              <p className="text-xs text-muted-foreground">
                ({leaveRequest.employees?.username})
              </p>
            </div>
            <div>
              <Label>Status</Label>
              <div className="mt-1">
                {getStatusBadge(leaveRequest.status)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Leave Type</Label>
              <p className="text-sm capitalize">{leaveRequest.leave_type}</p>
            </div>
            <div>
              <Label>Total Days</Label>
              <p className="text-sm">{leaveRequest.total_days}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <p className="text-sm">{new Date(leaveRequest.start_date).toLocaleDateString()}</p>
            </div>
            <div>
              <Label>End Date</Label>
              <p className="text-sm">{new Date(leaveRequest.end_date).toLocaleDateString()}</p>
            </div>
          </div>

          <div>
            <Label>Reason</Label>
            <p className="text-sm bg-muted p-3 rounded-lg">{leaveRequest.reason}</p>
          </div>

          <div>
            <Label htmlFor="comments">
              {reviewType === 'dept_head' ? 'Department Head Comments' : 'HR Comments'} (Optional)
            </Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={isLoading}
              placeholder="Add your comments here..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={() => handleAction('reject')} 
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Reject"}
          </Button>
          <Button 
            type="button" 
            onClick={() => handleAction('approve')} 
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveReviewDialog;