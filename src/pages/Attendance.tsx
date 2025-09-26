import { useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, format, eachDayOfInterval } from 'date-fns';
import HRMSLayout from "@/components/HRMSLayout";
import AttendanceCalendar, { AttendanceRecord } from '@/components/AttendanceCalendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

interface Employee {
  emp_id: string;
  first_name: string;
  last_name: string;
  department_id?: string;
  reporting_manager_id?: string;
}

const Attendance = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const { employee: currentUser } = useAuth();

  const userRole = currentUser?.roles?.role_name;
  const isHROrCXO = userRole === 'HR Manager' || userRole === 'CXO';
  const isDeptHead = userRole === 'Department Head';
  const isTeamLead = userRole === 'Team Lead';
  const isRegularEmployee = userRole === 'Employee';

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
        // Department Head sees employees in their department
        query = query.eq('department_id', currentUser.department_id);
      } else if (isTeamLead && currentUser.emp_id) {
        // Team Lead sees employees reporting to them
        query = query.eq('reporting_manager_id', currentUser.emp_id);
      } else if (isRegularEmployee && currentUser.emp_id) {
        // Regular employee sees only themselves
        query = query.eq('emp_id', currentUser.emp_id);
      } else {
        // Fallback for unhandled roles or missing data
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
        // 1. Fetch attendance records - Primary focus
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

        // 2. Try to fetch leave data from leave_requests table (using employee_id)
        let leaveData = null;
        try {
          const { data: leaveResult, error: leaveError } = await supabase
            .from('leave_requests')
            .select('start_date, end_date, status')
            .eq('employee_id', selectedEmployeeId) // Fixed: using employee_id instead of emp_id
            .in('status', ['approved', 'dept_approved', 'tl_approved']);

          if (!leaveError && leaveResult) {
            // Filter for dates within the current month
            leaveData = leaveResult.filter(leave => {
              const leaveStart = new Date(leave.start_date);
              const leaveEnd = new Date(leave.end_date);
              return leaveStart <= endDate && leaveEnd >= startDate;
            });
          }
        } catch (leaveError) {
          console.warn("Could not fetch from leave_requests table:", leaveError);
          
          // Try alternative tables: emp_leave_requests or leave_applications
          try {
            const { data: altLeaveResult, error: altLeaveError } = await supabase
              .from('emp_leave_requests')
              .select('start_date, end_date, status')
              .eq('emp_id', selectedEmployeeId)
              .in('status', ['approved', 'dept_approved', 'tl_approved']);

            if (!altLeaveError && altLeaveResult) {
              leaveData = altLeaveResult.filter(leave => {
                const leaveStart = new Date(leave.start_date);
                const leaveEnd = new Date(leave.end_date);
                return leaveStart <= endDate && leaveEnd >= startDate;
              });
            }
          } catch (altError) {
            // Try leave_applications table
            try {
              const { data: appLeaveResult, error: appLeaveError } = await supabase
                .from('leave_applications')
                .select('start_date, end_date, status')
                .eq('employee_id', selectedEmployeeId)
                .in('status', ['approved', 'dept_approved', 'tl_approved']);

              if (!appLeaveError && appLeaveResult) {
                leaveData = appLeaveResult.filter(leave => {
                  const leaveStart = new Date(leave.start_date);
                  const leaveEnd = new Date(leave.end_date);
                  return leaveStart <= endDate && leaveEnd >= startDate;
                });
              }
            } catch (finalError) {
              console.warn("No leave tables accessible, proceeding without leave data");
              leaveData = null;
            }
          }
        }

        // 3. Process the data
        const recordsMap = new Map<string, AttendanceRecord>();

        // Add leave days first (if available)
        if (leaveData && leaveData.length > 0) {
          leaveData.forEach(leave => {
            try {
              const interval = eachDayOfInterval({
                start: new Date(leave.start_date),
                end: new Date(leave.end_date)
              });
              interval.forEach(day => {
                if (day >= startDate && day <= endDate) {
                  recordsMap.set(format(day, 'yyyy-MM-dd'), { 
                    date: day, 
                    status: 'On Leave' 
                  });
                }
              });
            } catch (dateError) {
              console.warn("Error processing leave dates:", dateError);
            }
          });
        }

        // Add attendance records - Focus on clock_in for Present status
        if (attendanceData) {
          attendanceData.forEach(att => {
            if (!recordsMap.has(att.date)) {
              let finalStatus: 'Present' | 'Absent' | 'On Leave' | 'No Record' = 'No Record';
              
              // Primary rule: If clocked in, mark as Present (regardless of clock out)
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
  }, [selectedEmployeeId, currentMonth]);

  const selectedEmployee = employees.find(e => e.emp_id === selectedEmployeeId);

  return (
    <HRMSLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Employee Attendance</h1>
          <p className="text-muted-foreground">Select an employee to view their monthly attendance.</p>
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
      </div>
    </HRMSLayout>
  );
};

export default Attendance;