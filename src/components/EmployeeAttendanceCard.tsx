import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AttendanceCalendar, { AttendanceRecord as CalendarAttendanceRecord } from "@/components/AttendanceCalendar";

const EmployeeAttendanceCard = () => {
  const [clockedIn, setClockedIn] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [monthlyAttendanceRecords, setMonthlyAttendanceRecords] = useState<CalendarAttendanceRecord[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState<any[]>([]); // Add holidays state
  const { employee: currentUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (currentUser) {
      fetchAttendanceData(currentMonth);
    }
  }, [currentUser, currentMonth]);

  // Fetch holidays
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const { data, error } = await supabase
          .from('holidays')
          .select('*')
          .order('date', { ascending: true });

        if (error) throw error;
        setHolidays(data || []);
      } catch (error) {
        console.error("Error fetching holidays:", error);
      }
    };
    fetchHolidays();
  }, []);

  const fetchAttendanceData = async (month: Date) => {
    if (!currentUser?.emp_id) return;

    setLoading(true);
    try {
      const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1).toISOString();
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).toISOString();

      const { data: attendanceRecords, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .eq('emp_id', currentUser.emp_id)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .order('date', { ascending: true });

      if (attError) throw attError;

      // Try to fetch approved leave requests using leave_applications table
      let leaveRequests = null;
      try {
        const { data: leaveData, error: leaveError } = await supabase
          .from('leave_applications')
          .select('start_date, end_date, status')
          .eq('employee_id', currentUser.emp_id) // Changed from emp_id to employee_id
          .in('status', ['approved', 'dept_approved', 'tl_approved'])
          .gte('start_date', startOfMonth.split('T')[0]) // Use date format for date columns
          .lte('end_date', endOfMonth.split('T')[0]);

        if (!leaveError && leaveData) {
          leaveRequests = leaveData;
        }
      } catch (leaveError) {
        console.warn("Could not fetch leave data, proceeding without:", leaveError);
        leaveRequests = null;
      }

      // Create set of leave dates
      const leaveDates = new Set<string>();
      if (leaveRequests) {
        leaveRequests.forEach(req => {
          let currentDate = new Date(req.start_date);
          const endDate = new Date(req.end_date);
          while (currentDate <= endDate) {
            leaveDates.add(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
          }
        });
      }

      // Generate monthly attendance records
      const formattedRecords: CalendarAttendanceRecord[] = [];
      const allDaysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

      for (let i = 1; i <= allDaysInMonth; i++) {
        const day = new Date(month.getFullYear(), month.getMonth(), i);
        const dayString = day.toISOString().split('T')[0];
        const attendanceRecord = (attendanceRecords || []).find(rec => rec.date === dayString);

        let status: 'Present' | 'Absent' | 'On Leave' | 'Holiday' | 'No Record' = 'No Record';

        // Check if day is a holiday (highest priority)
        const isHoliday = holidays.some(h => h.date === dayString);
        if (isHoliday) {
          status = 'Holiday';
        } else if (leaveDates.has(dayString)) {
          status = 'On Leave';
        } else if (attendanceRecord) {
          // Focus on clock_in for Present status (as requested)
          if (attendanceRecord.clock_in) {
            status = 'Present';
          } else if (attendanceRecord.status === 'absent') {
            status = 'Absent';
          }
        }

        formattedRecords.push({
          date: day,
          status: status,
        });
      }

      setMonthlyAttendanceRecords(formattedRecords);

      // Update today's attendance
      const today = new Date().toISOString().split('T')[0];
      const todayRecord = attendanceRecords?.find(record => record.date === today);
      setTodayAttendance(todayRecord);
      setClockedIn(todayRecord?.clock_in && !todayRecord?.clock_out);

    } catch (error: any) {
      console.error('Error fetching monthly attendance:', error);
      toast({
        title: "Error",
        description: "Failed to fetch monthly attendance data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (newMonth: Date) => {
    setCurrentMonth(newMonth);
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
      fetchAttendanceData(currentMonth);
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
      fetchAttendanceData(currentMonth);
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
          My Attendance
        </CardTitle>
        <CardDescription>
          Overview of your attendance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today's Attendance Summary */}
        <div className="border-b pb-4">
          <h3 className="text-lg font-semibold mb-2">Today's Status</h3>
          {/* Status Badge */}
          <div className="flex items-center justify-between mb-2">
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
          <div className="flex space-x-2 mt-4">
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
        </div>

        {/* Monthly Attendance Calendar */}
        <div className="pt-4">
          <h3 className="text-lg font-semibold mb-2">Monthly View</h3>
          <AttendanceCalendar
            attendanceRecords={monthlyAttendanceRecords}
            month={currentMonth}
            onMonthChange={handleMonthChange}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeAttendanceCard;