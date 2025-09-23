import { useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, format, eachDayOfInterval } from 'date-fns';
import HRMSLayout from "@/components/HRMSLayout";
import AttendanceCalendar, { AttendanceRecord } from '@/components/AttendanceCalendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface Employee {
  emp_id: string;
  first_name: string;
  last_name: string;
}

const Attendance = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      const { data } = await supabase
        .from('employees')
        .select('emp_id, first_name, last_name')
        .order('first_name');
      
      if (data) {
        setEmployees(data);
        if (data.length > 0 && !selectedEmployeeId) {
          setSelectedEmployeeId(data[0].emp_id);
        }
      }
    };
    fetchEmployees();
  }, [selectedEmployeeId]);

  useEffect(() => {
    if (!selectedEmployeeId) return;

    const fetchFullAttendance = async () => {
      setLoading(true);
      const startDate = startOfMonth(currentMonth);
      const endDate = endOfMonth(currentMonth);

      // 1. Fetch regular attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('date, status, clock_out') // Fetch clock_out
        .eq('emp_id', selectedEmployeeId)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));

      // 2. Fetch approved leave requests
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_requests')
        .select('start_date, end_date')
        .eq('emp_id', selectedEmployeeId)
        .eq('status', 'approved')
        .lte('start_date', format(endDate, 'yyyy-MM-dd'))
        .gte('end_date', format(startDate, 'yyyy-MM-dd'));

      if (attendanceError || leaveError) {
        console.error("Error fetching attendance data", attendanceError, leaveError);
        setLoading(false);
        return;
      }

      // 3. Merge the data
      const recordsMap = new Map<string, AttendanceRecord>();

      // Add leave days first, as they have priority
      if (leaveData) {
        leaveData.forEach(leave => {
          const interval = eachDayOfInterval({
            start: new Date(leave.start_date),
            end: new Date(leave.end_date)
          });
          interval.forEach(day => {
            recordsMap.set(format(day, 'yyyy-MM-dd'), { date: day, status: 'On Leave' });
          });
        });
      }

      // Add attendance records, avoiding overwriting leave days
      if (attendanceData) {
        attendanceData.forEach(att => {
          if (!recordsMap.has(att.date)) {
            // If clock_out exists, they were present. Otherwise, use the recorded status.
            const finalStatus = att.clock_out ? 'Present' : att.status;
            recordsMap.set(att.date, { date: new Date(att.date), status: finalStatus as any });
          }
        });
      }

      setAttendanceRecords(Array.from(recordsMap.values()));
      setLoading(false);
    };

    fetchFullAttendance();
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
