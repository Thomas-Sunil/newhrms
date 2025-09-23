import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Employee {
  emp_id: string;
  first_name: string;
  last_name: string;
  username: string;
  roles?: { role_name: string };
  designations?: { designation_name: string };
}

interface AttendanceRecord {
  emp_id: string;
  employee_name: string;
  designation: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  status: 'present' | 'absent' | 'clocked_out';
  total_hours: string;
}

const AttendanceTable = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { employee: currentUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (currentUser) {
      fetchAttendanceData();
    }
  }, [currentUser]);

  const fetchAttendanceData = async () => {
    try {
      console.log('Fetching attendance data...');
      
      if (!currentUser?.department_id) {
        console.error('No department_id found for current user');
        return;
      }

      // Get all employees in the department (simplified query)
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('emp_id, first_name, last_name, username, role_id, designation_id')
        .eq('department_id', currentUser.department_id)
        .eq('status', 'active')
        .order('first_name');

      console.log('Employees fetch result:', { employees, empError });
      if (empError) throw empError;

      // Fetch role and designation data separately
      const roleIds = Array.from(new Set((employees || []).map(e => e.role_id).filter(Boolean)));
      const desigIds = Array.from(new Set((employees || []).map(e => e.designation_id).filter(Boolean)));

      const [rolesRes, desigsRes] = await Promise.all([
        roleIds.length 
          ? supabase.from('roles').select('role_id, role_name').in('role_id', roleIds)
          : Promise.resolve({ data: [], error: null }),
        desigIds.length
          ? supabase.from('designations').select('designation_id, designation_name').in('designation_id', desigIds)
          : Promise.resolve({ data: [], error: null })
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (desigsRes.error) throw desigsRes.error;

      const roleMap = new Map((rolesRes.data || []).map(r => [r.role_id, r.role_name]));
      const desigMap = new Map((desigsRes.data || []).map(d => [d.designation_id, d.designation_name]));

      // Get today's attendance records
      const today = new Date().toISOString().split('T')[0];
      const { data: attendanceData, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', today);

      console.log('Attendance fetch result:', { attendanceData, attError });
      if (attError) console.error('Attendance error:', attError); // Non-blocking

      const attendanceMap = new Map((attendanceData || []).map(a => [a.emp_id, a]));

      // Generate attendance records
      const attendanceRecords: AttendanceRecord[] = (employees || []).map(emp => {
        const attendance = attendanceMap.get(emp.emp_id);
        const designation = desigMap.get(emp.designation_id) || 'No designation';
        
        let status: 'present' | 'absent' | 'clocked_out' = 'absent';
        let clockInTime = null;
        let clockOutTime = null;
        let totalHours = '--';

        if (attendance) {
          status = attendance.status as any || 'present';
          if (attendance.clock_in) {
            clockInTime = new Date(attendance.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
          if (attendance.clock_out) {
            clockOutTime = new Date(attendance.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            status = 'clocked_out';
          }
          
          if (attendance.clock_in && attendance.clock_out) {
            const diffMs = new Date(attendance.clock_out).getTime() - new Date(attendance.clock_in).getTime();
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            totalHours = `${hours}h ${minutes}m`;
          } else if (attendance.clock_in) {
            totalHours = 'In Progress';
            status = 'present';
          }
        }

        return {
          emp_id: emp.emp_id,
          employee_name: `${emp.first_name} ${emp.last_name}`,
          designation,
          clock_in_time: clockInTime,
          clock_out_time: clockOutTime,
          status,
          total_hours: totalHours
        };
      });

      console.log('Final attendance records:', attendanceRecords);
      setAttendanceRecords(attendanceRecords);
    } catch (error: any) {
      console.error('Attendance fetch error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch attendance data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Present</Badge>;
      case 'clocked_out':
        return <Badge variant="secondary">Clocked Out</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
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
          Team Attendance - Today
        </CardTitle>
        <CardDescription>
          Real-time attendance tracking for your department ({new Date().toLocaleDateString()})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceRecords.length > 0 ? (
                attendanceRecords.map((record) => (
                  <TableRow key={record.emp_id}>
                    <TableCell className="font-medium">
                      {record.employee_name}
                    </TableCell>
                    <TableCell>{record.designation}</TableCell>
                    <TableCell>
                      {record.clock_in_time ? (
                        <div className="flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          {record.clock_in_time}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.clock_out_time ? (
                        <div className="flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          {record.clock_out_time}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell>{record.total_hours}</TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No attendance records found for today
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceTable;