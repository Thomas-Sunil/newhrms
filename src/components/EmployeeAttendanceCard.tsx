import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const EmployeeAttendanceCard = () => {
  const [clockedIn, setClockedIn] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { employee: currentUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (currentUser) {
      checkTodayAttendance();
    }
  }, [currentUser]);

  const checkTodayAttendance = async () => {
    if (!currentUser?.emp_id) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('emp_id', currentUser.emp_id)
        .eq('date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // Not found is ok
        console.error('Attendance check error:', error);
        return;
      }

      setTodayAttendance(data);
      setClockedIn(data?.clock_in && !data?.clock_out);
    } catch (error) {
      console.error('Attendance error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!currentUser?.emp_id) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('attendance')
        .upsert({
          emp_id: currentUser.emp_id,
          date: today,
          clock_in: now,
          status: 'present'
        }, { onConflict: 'emp_id,date' });

      if (error) throw error;

      setClockedIn(true);
      checkTodayAttendance(); // Refresh data
      toast({
        title: "Clocked In",
        description: "You have successfully clocked in for today"
      });
    } catch (error: any) {
      console.error('Clock in error:', error);
      toast({
        title: "Error",
        description: "Failed to clock in",
        variant: "destructive"
      });
    }
  };

  const handleClockOut = async () => {
    if (!currentUser?.emp_id) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('attendance')
        .update({
          clock_out: now,
          status: 'clocked_out'
        })
        .eq('emp_id', currentUser.emp_id)
        .eq('date', today);

      if (error) throw error;

      setClockedIn(false);
      checkTodayAttendance(); // Refresh data
      toast({
        title: "Clocked Out", 
        description: "You have successfully clocked out"
      });
    } catch (error: any) {
      console.error('Clock out error:', error);
      toast({
        title: "Error",
        description: "Failed to clock out",
        variant: "destructive"
      });
    }
  };

  const getWorkingHours = () => {
    if (!todayAttendance?.clock_in) return '--';
    
    const clockIn = new Date(todayAttendance.clock_in);
    const clockOut = todayAttendance.clock_out ? new Date(todayAttendance.clock_out) : new Date();
    
    const diffMs = clockOut.getTime() - clockIn.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="mr-2 h-5 w-5" />
          Today's Attendance
        </CardTitle>
        <CardDescription>
          Track your work hours for {new Date().toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          {clockedIn ? (
            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
              <Clock className="mr-1 h-3 w-3" />
              Clocked In
            </Badge>
          ) : todayAttendance?.clock_out ? (
            <Badge variant="secondary">
              <Clock className="mr-1 h-3 w-3" />
              Clocked Out
            </Badge>
          ) : (
            <Badge variant="destructive">
              Not Clocked In
            </Badge>
          )}
        </div>

        {/* Time Details */}
        {todayAttendance && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Clock In:</span>
              <span className="text-sm font-medium">
                {todayAttendance.clock_in 
                  ? new Date(todayAttendance.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '--'
                }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Clock Out:</span>
              <span className="text-sm font-medium">
                {todayAttendance.clock_out 
                  ? new Date(todayAttendance.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '--'
                }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Working Hours:</span>
              <span className="text-sm font-medium">{getWorkingHours()}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {clockedIn ? (
            <Button onClick={handleClockOut} variant="outline" className="flex-1">
              <Clock className="mr-2 h-4 w-4" />
              Clock Out
            </Button>
          ) : (
            <Button onClick={handleClockIn} className="flex-1">
              <Clock className="mr-2 h-4 w-4" />
              Clock In
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeAttendanceCard;