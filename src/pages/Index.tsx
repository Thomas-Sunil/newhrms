import { useEffect, useState } from "react";
import { Building2, Users, UserCheck, Crown, TrendingUp, Calendar, Clock, FileText, UserPlus, Shield, User, Briefcase, History } from "lucide-react";
import DashboardCard from "@/components/DashboardCard";
import LoginForm from "@/components/LoginForm";
import SetupCEO from "@/pages/SetupCEO";
import HRMSLayout from "@/components/HRMSLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import CreateEmployeeDialog from "@/components/CreateEmployeeDialog";
import AssignDepartmentHeadDialog from "@/components/AssignDepartmentHeadDialog";
import ApplyLeaveDialog from "@/components/ApplyLeaveDialog";
import LeaveReviewDialog from "@/components/LeaveReviewDialog";
import HRAttendanceTable from "@/components/HRAttendanceTable";
import AttendanceTable from "@/components/AttendanceTable";
import EmployeeAttendanceCard from "@/components/EmployeeAttendanceCard";
import { Badge } from "@/components/ui/badge";
import EmployeeHistory from "@/components/EmployeeHistory";
import { CreateDesignationDialog } from "@/components/CreateDesignationDialog";

interface DashboardData {
  totalDepartments: number;
  totalEmployees: number;
  totalHRManagers: number;  
  totalCXOs: number;
  departmentData: Array<{dept_name: string, employee_count: number}>;
  teamMembers?: number;
  pendingLeaveRequests?: number;
  presentToday?: number;
}

interface Employee {
  emp_id: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  status: string;
  roles?: { role_name: string };
  designations?: { designation_name: string };
  departments?: { dept_name: string };
  created_at: string;
}

interface Department {
  dept_id: string;
  dept_name: string;
  dept_head_id: string | null;
  dept_head?: {
    first_name: string;
    last_name: string;
  };
}

interface LeaveRequest {
  leave_id: string;
  emp_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  created_at: string;
  employees?: {
    first_name: string;
    last_name: string;
    username: string;
  };
}

const Index = () => {
  const { user, employee, loading, getRoleDashboard } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalDepartments: 0,
    totalEmployees: 0,
    totalHRManagers: 0,
    totalCXOs: 0,
    departmentData: []
  });
  const [ceoExists, setCeoExists] = useState<boolean | null>(null);
  const [clockedIn, setClockedIn] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [createDesignationDialogOpen, setCreateDesignationDialogOpen] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [employeeType, setEmployeeType] = useState<'HR' | 'CXO' | 'Employee' | 'Department Head'>('Employee');
  const navigate = useNavigate();
  const { toast } = useToast();

  const userRole = employee?.roles?.role_name;
  const isHROrCXO = userRole === 'HR Manager' || userRole === 'CXO';
  const isDeptHead = userRole === 'Department Head';
  const isTeamLead = false; // Team Lead role removed from leave workflow
  const isEmployee = userRole === 'Employee';

  // Check if CEO exists in database
  const checkCEOExists = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('emp_id')
        .eq('username', 'ceo')
        .maybeSingle();

      setCeoExists(!!data && !error);
    } catch (error) {
      console.error('CEO check failed:', error);
      setCeoExists(false);
    }
  };

  // Check clock status
  const checkClockStatus = async () => {
    if (!employee?.emp_id) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .select('clock_in, clock_out')
        .eq('emp_id', employee.emp_id)
        .eq('date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Clock status check error:', error);
        return;
      }

      setClockedIn(data?.clock_in && !data?.clock_out);
    } catch (error) {
      console.error('Clock status error:', error);
    }
  };

  // Handle clock in
  const handleClockIn = async () => {
    if (!employee?.emp_id) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      
      const { data: existing, error: fetchErr } = await supabase
        .from('attendance')
        .select('id, clock_in')
        .eq('emp_id', employee.emp_id)
        .eq('date', today)
        .maybeSingle();

      if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr;

      let dbError = null as any;
      if (existing) {
        const { error: updErr } = await supabase
          .from('attendance')
          .update({ clock_in: existing.clock_in || now, status: 'present' })
          .eq('id', existing.id);
        dbError = updErr;
      } else {
        const { error: insErr } = await supabase
          .from('attendance')
          .insert({ emp_id: employee.emp_id, date: today, clock_in: now, status: 'present' });
        dbError = insErr;
      }

      if (dbError) throw dbError;

      setClockedIn(true);
      toast({
        title: "Clocked In",
        description: "You have successfully clocked in for today"
      });
      
      // Refresh data
      fetchData();
    } catch (error: any) {
      console.error('Clock in error:', error);
      toast({
        title: "Error",
        description: "Failed to clock in",
        variant: "destructive"
      });
    }
  };

  // Handle clock out
  const handleClockOut = async () => {
    if (!employee?.emp_id) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('attendance')
        .update({
          clock_out: now,
          status: 'clocked_out'
        })
        .eq('emp_id', employee.emp_id)
        .eq('date', today);

      if (error) throw error;

      setClockedIn(false);
      toast({
        title: "Clocked Out", 
        description: "You have successfully clocked out"
      });
      
      // Refresh data
      fetchData();
    } catch (error: any) {
      console.error('Clock out error:', error);
      toast({
        title: "Error",
        description: "Failed to clock out",
        variant: "destructive"
      });
    }
  };

  // Fetch comprehensive dashboard data based on role
  const fetchData = async () => {
    try {
      // Base data for all roles
      const [deptResult, empResult, rolesResult] = await Promise.all([
        supabase.from('departments').select('dept_id', { count: 'exact', head: true }),
        supabase.from('employees').select('emp_id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('roles').select('role_id, role_name').in('role_name', ['HR Manager', 'CXO'])
      ]);

      const hrRoleId = rolesResult.data?.find(r => r.role_name === 'HR Manager')?.role_id;
      const cxoRoleId = rolesResult.data?.find(r => r.role_name === 'CXO')?.role_id;

      let hrCount = 0;
      let cxoCount = 0;

      if (hrRoleId || cxoRoleId) {
        const [hrRes, cxoRes] = await Promise.all([
          hrRoleId
            ? supabase.from('employees').select('emp_id', { count: 'exact', head: true }).eq('role_id', hrRoleId)
            : Promise.resolve({ count: 0 } as any),
          cxoRoleId
            ? supabase.from('employees').select('emp_id', { count: 'exact', head: true }).eq('role_id', cxoRoleId)
            : Promise.resolve({ count: 0 } as any)
        ]);
        hrCount = (hrRes as any).count || 0;
        cxoCount = (cxoRes as any).count || 0;
      }

      // Department data
      const { data: departmentsData } = await supabase
        .from('departments')
        .select(`
          dept_name,
          employees!employees_department_id_fkey(emp_id)
        `);

      const departmentData = departmentsData?.map(dept => ({
        dept_name: dept.dept_name,
        employee_count: dept.employees?.length || 0
      })) || [];

      let additionalData = {};

      // Role-specific data
      if (isHROrCXO) {
        // HR/CXO: Get all employees and departments
        const [empRes, deptRes] = await Promise.all([
          supabase
            .from('employees')
            .select(`
              *,
              roles!role_id(role_name),
              designations!designation_id(designation_name),
              departments!department_id(dept_name)
            `)
            .eq('status', 'active')
            .order('first_name'),
          
          supabase
            .from('departments')
            .select(`
              *,
              dept_head:employees!dept_head_id(first_name, last_name)
            `)
            .order('dept_name')
        ]);

        if (!empRes.error) setEmployees(empRes.data || []);
        if (!deptRes.error) setDepartments((deptRes.data as any) || []);

        const unassignedDepts = (deptRes.data || []).filter(dept => !dept.dept_head_id).length;
        additionalData = { unassignedDepts };
      }

      if (isDeptHead && employee?.department_id) {
        console.log('Index Page: Dept Head - Current User Department ID:', employee.department_id);
        // Department Head: Get team data and leaves
        const [teamRes, leavesRes] = await Promise.all([
          supabase
            .from('employees')
            .select('*')
            .eq('department_id', employee.department_id)
            .eq('status', 'active')
            .order('first_name'),
          
          supabase
            .from('leave_requests')
            .select(`*, employees!leave_requests_emp_id_fkey(first_name, last_name, username)`)
            .eq('status', 'pending_dept_review') // Department Heads now review pending_dept_review
            .order('created_at', { ascending: false })
        ]);

        if (!teamRes.error) {
          console.log('Index Page: Dept Head - Team Employees Data:', teamRes.data);
          const teamLeaves = (leavesRes.data || []).filter((leave: any) =>
            (teamRes.data || []).some((emp: any) => emp.emp_id === leave.emp_id)
          );
          setPendingLeaves(teamLeaves);
          
          additionalData = {
            teamMembers: (teamRes.data || []).length,
            presentToday: Math.floor((teamRes.data || []).length * 0.8),
            pendingLeaveRequests: teamLeaves.filter((leave: any) => leave.status === 'pending').length
          };
        }
      }

      
      if (isEmployee) {
        // Employee: Get own leave data
        const { data: leaveData } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('emp_id', employee?.emp_id)
          .order('created_at', { ascending: false });

        if (leaveData) {
          const pendingCount = leaveData.filter(leave => leave.status === 'pending').length;
          additionalData = { pendingLeaveRequests: pendingCount };
        }
      }

      setDashboardData({
        totalDepartments: deptResult.count || 0,
        totalEmployees: empResult.count || 0,
        totalHRManagers: hrCount,
        totalCXOs: cxoCount,
        departmentData,
        ...additionalData
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  // Effects
  useEffect(() => {
    if (!user) {
      checkCEOExists();
    } else if (employee) {
      fetchData();
      checkClockStatus();
    }
  }, [user, employee]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated user flow
  if (!user) {
    if (ceoExists === null) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Checking system setup...</p>
          </div>
        </div>
      );
    }

    if (!ceoExists) {
      return <SetupCEO />;
    }

    return <LoginForm />;
  }

  // Helper functions
  const handleCreateEmployee = (type: 'HR' | 'CXO' | 'Employee' | 'Department Head') => {
    setEmployeeType(type);
    setCreateDialogOpen(true);
  };

  const handleOpenAssignDialog = (department: Department) => {
    setSelectedDepartment(department);
    setAssignDialogOpen(true);
  };

  const handleOpenReviewDialog = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setReviewDialogOpen(true);
  };

  // Dashboard stats based on role
  const getDashboardStats = () => {
    const baseStats = [
      {
        title: "Total Departments",
        value: dashboardData.totalDepartments.toString(),
        change: { value: "", trend: "up" as const },
        icon: Building2,
        variant: "primary" as const
      },
      {
        title: "Total Employees", 
        value: dashboardData.totalEmployees.toString(),
        change: { value: " ", trend: "up" as const },
        icon: Users,
        variant: "secondary" as const
      }
    ];

    if (isHROrCXO) {
      return [
        ...baseStats,
        {
          title: "HR Managers",
          value: dashboardData.totalHRManagers.toString(),
          change: { value: " ", trend: "neutral" as const },
          icon: UserCheck,
          variant: "default" as const
        },
        {
          title: "CXOs",
          value: dashboardData.totalCXOs.toString(),
          change: { value: " ", trend: "up" as const },
          icon: Crown,
          variant: "warning" as const
        }
      ];
    }

    if (isDeptHead) {
      return [
        {
          title: "Team Members",
          value: (dashboardData.teamMembers || 0).toString(),
          change: { value: "Your team", trend: "neutral" as const },
          icon: Users,
          variant: "primary" as const
        },
        {
          title: "Present Today",
          value: (dashboardData.presentToday || 0).toString(),
          change: { value: "Active now", trend: "up" as const },
          icon: UserCheck,
          variant: "secondary" as const
        },
        {
          title: "Pending Requests",
          value: (dashboardData.pendingLeaveRequests || 0).toString(),
          change: { value: "Need review", trend: "neutral" as const },
          icon: FileText,
          variant: "warning" as const
        }
      ];
    }



    return baseStats;
  };

  const dashboardStats = getDashboardStats();

  // Main dashboard for authenticated users
  return (
    <HRMSLayout>
      <div className="space-y-6">
  {/* Header with Clock In/Out */}
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    
    {/* Left: Title */}
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold">
        {isHROrCXO
          ? 'Executive Dashboard'
          : isDeptHead
          ? 'Department Head Dashboard'
          : 'Employee Dashboard'}
      </h1>
      <p className="text-sm sm:text-base text-muted-foreground">
        Welcome back, {employee?.first_name}! Here's your overview for today.
      </p>
    </div>

    {/* Right: Clock + Actions */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-3 w-full sm:w-auto">
      
      {/* Clock Status */}
      <div className="flex items-center space-x-2">
        <div
          className={`w-3 h-3 rounded-full ${
            clockedIn ? 'bg-green-500' : 'bg-red-500'
          }`}
        ></div>
        <span className="text-sm font-medium">
          {clockedIn ? 'Clocked In' : 'Clocked Out'}
        </span>
      </div>

      {/* Clock Button */}
      {clockedIn ? (
        <Button onClick={handleClockOut} variant="outline" className="w-full sm:w-auto">
          <Clock className="mr-2 h-4 w-4" />
          Clock Out
        </Button>
      ) : (
        <Button onClick={handleClockIn} className="w-full sm:w-auto">
          <Clock className="mr-2 h-4 w-4" />
          Clock In
        </Button>
      )}

      {/* Role-specific actions */}
      {isHROrCXO && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 w-full">
          <Button
            onClick={() => handleCreateEmployee('Employee')}
            variant="outline"
            className="w-full"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
          <Button
            onClick={() => handleCreateEmployee('CXO')}
            className="w-full"
          >
            <Crown className="mr-2 h-4 w-4" />
            Add Executive
          </Button>
          <Button
            onClick={() => setCreateDesignationDialogOpen(true)}
            variant="outline"
            className="w-full"
          >
            <Briefcase className="mr-2 h-4 w-4" />
            Add Designation
          </Button>
          <Button
            onClick={() => setShowHistoryDialog(true)}
            variant="outline"
            className="w-full"
          >
            <History className="mr-2 h-4 w-4" />
            Employee History
          </Button>
        </div>
      )}


            {isEmployee && (
              <Button onClick={() => setLeaveDialogOpen(true)}>
                <FileText className="mr-2 h-4 w-4" />
                Apply for Leave
              </Button>
            )}
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardStats.map((stat, index) => (
            <DashboardCard key={index} {...stat} />
          ))}
        </div>

        {/* Role-specific content */}
        {isHROrCXO && (
          <>
            {/* HR Management Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building2 className="mr-2 h-5 w-5" />
                    Department Management
                  </CardTitle>
                  <CardDescription>
                    Assign department heads and manage departments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {departments.slice(0, 5).map((dept) => (
                    <div key={dept.dept_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{dept.dept_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Head: {dept.dept_head 
                            ? `${dept.dept_head.first_name} ${dept.dept_head.last_name}`
                            : "Not assigned"
                          }
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOpenAssignDialog(dept)}
                      >
                        {dept.dept_head ? "Change" : "Assign"} Head
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Recent Employees
                  </CardTitle>
                  <CardDescription>
                    Recently added employees
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {employees.slice(0, 5).map((emp) => (
                    <div key={emp.emp_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{emp.first_name} {emp.last_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {emp.roles?.role_name} • {emp.departments?.dept_name || 'No department'}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(emp.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* HR Attendance Overview */}
            <HRAttendanceTable />
          </>
        )}

        {isDeptHead && (
          <>
            {/* Department Head Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    Pending Leave Requests
                  </CardTitle>
                  <CardDescription>
                    Leave requests requiring your review
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pendingLeaves.filter(leave => leave.status === 'pending').length > 0 ? (
                    pendingLeaves
                      .filter(leave => leave.status === 'pending')
                      .slice(0, 5)
                      .map((leave) => (
                        <div key={leave.leave_id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">
                              {leave.employees?.first_name} {leave.employees?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {leave.leave_type} - {leave.total_days} days
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleOpenReviewDialog(leave)}
                          >
                            Review
                          </Button>
                        </div>
                      ))
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No pending leave requests
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Your Team
                  </CardTitle>
                  <CardDescription>
                    Department team overview
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-semibold">Team Overview</h3>
                    <p className="text-sm text-muted-foreground">
                      {dashboardData.teamMembers || 0} team members • {dashboardData.presentToday || 0} present today
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Team Attendance */}
            <AttendanceTable teamEmployees={employees} />
          </>
        )}

        
        {isEmployee && (
          <>
            {/* Employee Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EmployeeAttendanceCard />

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="mr-2 h-5 w-5" />
                    Your Information
                  </CardTitle>
                  <CardDescription>
                    Your current role and department details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Role:</span>
                      <span className="text-sm font-medium">{employee?.roles?.role_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Department:</span>
                      <span className="text-sm font-medium">{employee?.departments?.dept_name || 'Not assigned'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Designation:</span>
                      <span className="text-sm font-medium">{employee?.designations?.designation_name || 'Not assigned'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Join Date:</span>
                      <span className="text-sm font-medium">
                        {employee?.doj ? new Date(employee.doj).toLocaleDateString() : 'Not available'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Employee History Section */}
            <EmployeeHistory 
              selectedEmployeeId={employee?.emp_id} 
              showAllEmployees={false}
            />
          </>
        )}

        {/* Common sections for all authenticated users */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5 text-secondary" />
                  Department Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData.departmentData.length > 0 ? (
                  dashboardData.departmentData.map((dept, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{dept.dept_name}</span>
                      <span className="text-sm font-medium">{dept.employee_count} employees</span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No department data available</div>
                )}
              </CardContent>
            </Card>
          </div>

        {/* Dialogs */}
        {isHROrCXO && (
          <>
            <CreateEmployeeDialog
              open={createDialogOpen}
              onOpenChange={setCreateDialogOpen}
              employeeType={employeeType}
              onSuccess={fetchData}
            />

            <AssignDepartmentHeadDialog
              open={assignDialogOpen}
              onOpenChange={setAssignDialogOpen}
              department={selectedDepartment}
              onSuccess={fetchData}
            />

            <CreateDesignationDialog
              open={createDesignationDialogOpen}
              onOpenChange={setCreateDesignationDialogOpen}
              onSuccess={fetchData}
            />
          </>
        )}

        {/* Employee History Dialog for HR/CXO */}
        {isHROrCXO && (
          <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
            <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>All Employees History</DialogTitle>
              </DialogHeader>
              <EmployeeHistory showAllEmployees={true} />
            </DialogContent>
          </Dialog>
        )}

        {isDeptHead && (
          <LeaveReviewDialog
            open={reviewDialogOpen}
            onOpenChange={setReviewDialogOpen}
            leaveRequest={selectedLeave}
            onSuccess={fetchData}
            reviewType="dept_head"
          />
        )}



        {isEmployee && (
          <ApplyLeaveDialog
            open={leaveDialogOpen}
            onOpenChange={setLeaveDialogOpen}
            onSuccess={fetchData}
          />
        )}
      </div>
    </HRMSLayout>
  );
};

export default Index;