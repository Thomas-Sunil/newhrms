import { useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, format, eachDayOfInterval } from 'date-fns';
import HRMSLayout from "@/components/HRMSLayout";
import AttendanceCalendar, { AttendanceRecord } from '@/components/AttendanceCalendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/hooks/use-toast";
import { Plus, CalendarDays } from "lucide-react";

interface Employee {
  emp_id: string;
  first_name: string;
  last_name: string;
  department_id?: string;
  reporting_manager_id?: string;
}

interface Holiday {
  id: string;
  date: string;
  reason: string;
  created_by: string;
  created_at: string;
}

const Attendance = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [holidayReason, setHolidayReason] = useState("");
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const { employee: currentUser } = useAuth();
  const { toast } = useToast();

  const userRole = currentUser?.roles?.role_name;
  const isHROrCXO = userRole === 'HR Manager' || userRole === 'CXO';
  const isDeptHead = userRole === 'Department Head';
  const isTeamLead = userRole === 'Team Lead';
  const isRegularEmployee = userRole === 'Employee';

  // Fetch holidays
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

  useEffect(() => {
    fetchHolidays();
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      if (!currentUser) return;

      let query = supabase
        .from('employees')
        .select('emp_id, first_name, last_name, department_id, reporting_manager_id')
        .order('first_name');

      if (isHROrCXO) {
        // HR/CXO sees all employees
      } else if (isDeptHead && currentUser.department_id) {
        query = query.eq('department_id', currentUser.department_id);
      } else if (isTeamLead && currentUser.emp_id) {
        query = query.eq('reporting_manager_id', currentUser.emp_id);
      } else if (isRegularEmployee && currentUser.emp_id) {
        query = query.eq('emp_id', currentUser.emp_id);
      } else {
        setEmployees([]);
        setSelectedEmployeeId(null);
        return;
      }

      const { data, error } = await query;
      
      if (data) {
        setEmployees(data);
        if (data.length > 0 && !selectedEmployeeId) {
          setSelectedEmployeeId(data[0].emp_id);
        } else if (data.length === 0) {
          setSelectedEmployeeId(null);
        }
      }
    };
    fetchEmployees();
  }, [currentUser, isHROrCXO, isDeptHead, isTeamLead, isRegularEmployee, selectedEmployeeId]);

  useEffect(() => {
    if (!selectedEmployeeId) return;

    const fetchAttendanceData = async () => {
      setLoading(true);
      const startDate = startOfMonth(currentMonth);
      const endDate = endOfMonth(currentMonth);

      try {
        // Security check: Verify the selected employee is accessible to current user
        if (isDeptHead && currentUser?.department_id) {
          const { data: empCheck } = await supabase
            .from('employees')
            .select('department_id')
            .eq('emp_id', selectedEmployeeId)
            .single();
          
          if (empCheck?.department_id !== currentUser.department_id) {
            toast({
              title: "Access Denied",
              description: "You can only view attendance of employees in your department",
              variant: "destructive"
            });
            setLoading(false);
            return;
          }
        } else if (isTeamLead && currentUser?.emp_id) {
          const { data: empCheck } = await supabase
            .from('employees')
            .select('reporting_manager_id')
            .eq('emp_id', selectedEmployeeId)
            .single();
          
          if (empCheck?.reporting_manager_id !== currentUser.emp_id) {
            toast({
              title: "Access Denied",
              description: "You can only view attendance of your team members",
              variant: "destructive"
            });
            setLoading(false);
            return;
          }
        } else if (isRegularEmployee && currentUser?.emp_id && selectedEmployeeId !== currentUser.emp_id) {
          toast({
            title: "Access Denied",
            description: "You can only view your own attendance",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        // 1. Fetch attendance records
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('date, status, clock_in, clock_out') 
          .eq('emp_id', selectedEmployeeId)
          .gte('date', format(startDate, 'yyyy-MM-dd'))
          .lte('date', format(endDate, 'yyyy-MM-dd'));

        if (attendanceError) {
          console.error("Error fetching attendance data:", attendanceError);
          setLoading(false);
          return;
        }

        // 2. Fetch leave data
        let leaveData = null;
        try {
          const { data: leaveResult, error: leaveError } = await supabase
            .from('leave_applications')
            .select('start_date, end_date, status')
            .eq('employee_id', selectedEmployeeId)
            .in('status', ['approved', 'dept_approved', 'tl_approved']);

          if (!leaveError && leaveResult) {
            leaveData = leaveResult.filter(leave => {
              const leaveStart = new Date(leave.start_date);
              const leaveEnd = new Date(leave.end_date);
              return leaveStart <= endDate && leaveEnd >= startDate;
            });
          }
        } catch (leaveError) {
          console.warn("Could not fetch leave data:", leaveError);
          leaveData = null;
        }

        // 3. Process the data
        const recordsMap = new Map<string, AttendanceRecord>();

        // Add holidays first (highest priority)
        holidays.forEach(holiday => {
          const holidayDate = new Date(holiday.date);
          if (holidayDate >= startDate && holidayDate <= endDate) {
            recordsMap.set(format(holidayDate, 'yyyy-MM-dd'), {
              date: holidayDate,
              status: 'Holiday'
            });
          }
        });

        // Add leave days
        if (leaveData && leaveData.length > 0) {
          leaveData.forEach(leave => {
            try {
              const interval = eachDayOfInterval({
                start: new Date(leave.start_date),
                end: new Date(leave.end_date)
              });
              interval.forEach(day => {
                if (day >= startDate && day <= endDate) {
                  if (!recordsMap.has(format(day, 'yyyy-MM-dd'))) {
                    recordsMap.set(format(day, 'yyyy-MM-dd'), { 
                      date: day, 
                      status: 'On Leave' 
                    });
                  }
                }
              });
            } catch (dateError) {
              console.warn("Error processing leave dates:", dateError);
            }
          });
        }

        // Add attendance records
        if (attendanceData) {
          attendanceData.forEach(att => {
            if (!recordsMap.has(att.date)) {
              let finalStatus: 'Present' | 'Absent' | 'On Leave' | 'Holiday' | 'No Record' = 'No Record';
              
              if (att.clock_in) {
                finalStatus = 'Present';
              } else if (att.status === 'absent') {
                finalStatus = 'Absent';
              }
              
              recordsMap.set(att.date, { 
                date: new Date(att.date), 
                status: finalStatus 
              });
            }
          });
        }

        setAttendanceRecords(Array.from(recordsMap.values()));
      } catch (error) {
        console.error("Error fetching attendance data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [selectedEmployeeId, currentMonth, holidays]);

  const handleAddHoliday = async () => {
    if (!selectedDate || !holidayReason.trim()) {
      toast({
        title: "Error",
        description: "Please select a date and provide a reason",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('holidays')
        .insert({
          date: format(selectedDate, 'yyyy-MM-dd'),
          reason: holidayReason,
          created_by: currentUser?.emp_id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Holiday added successfully"
      });

      setHolidayReason("");
      setSelectedDate(new Date());
      setHolidayDialogOpen(false);
      fetchHolidays();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to add holiday: " + error.message,
        variant: "destructive"
      });
    }
  };

  const selectedEmployee = employees.find(e => e.emp_id === selectedEmployeeId);

  return (
    <HRMSLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Employee Attendance</h1>
            <p className="text-muted-foreground">Select an employee to view their monthly attendance.</p>
          </div>
          {isHROrCXO && (
            <Button onClick={() => setHolidayDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Holiday
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Attendance Viewer</CardTitle>
            <div className="grid md:grid-cols-2 gap-4 items-center">
              <CardDescription>
                {selectedEmployee ? `Showing records for ${selectedEmployee.first_name} ${selectedEmployee.last_name}` : "Select an employee"}
              </CardDescription>
              <div className="w-full md:w-64 md:justify-self-end">
                <Select onValueChange={setSelectedEmployeeId} value={selectedEmployeeId || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Employee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.emp_id} value={emp.emp_id}>
                        {emp.first_name} {emp.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <AttendanceCalendar 
                attendanceRecords={attendanceRecords}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
              />
            )}
          </div>
        </Card>

        {/* Holiday List */}
        {isHROrCXO && holidays.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarDays className="mr-2 h-5 w-5" />
                Upcoming Holidays
              </CardTitle>
            </CardHeader>
            <div className="p-4">
              <div className="space-y-2">
                {holidays
                  .filter(h => new Date(h.date) >= new Date())
                  .slice(0, 5)
                  .map(holiday => (
                    <div key={holiday.id} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <p className="font-medium">{holiday.reason}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(holiday.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </Card>
        )}

        {/* Add Holiday Dialog */}
        <Dialog open={holidayDialogOpen} onOpenChange={setHolidayDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Holiday</DialogTitle>
              <DialogDescription>
                Select a date and provide a reason for the holiday
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Select Date</Label>
                <div className="flex justify-center mt-2">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={holidayReason}
                  onChange={(e) => setHolidayReason(e.target.value)}
                  placeholder="e.g., Independence Day, Company Anniversary..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setHolidayDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddHoliday}>
                Add Holiday
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </HRMSLayout>
  );
};

export default Attendance;
