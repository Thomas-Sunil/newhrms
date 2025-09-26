import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Building2, 
  Users, 
  BarChart3, 
  User, 
  Menu,
  X,
  Clock,
  Settings,
  LogOut,
  Shield,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import ApplyLeaveDialog from "@/components/ApplyLeaveDialog";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Departments", href: "/departments", icon: Building2 },
  { name: "Employees", href: "/employees", icon: Users },
  { name: "Attendance", href: "/attendance", icon: Clock },
  { name: "Leave Management", href: "/leave-management", icon: Clock },
  
  { name: "Policies", href: "/policies", icon: Shield },
  { name: "Profile", href: "/profile", icon: User },
];

const HRMSLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [applyLeaveDialogOpen, setApplyLeaveDialogOpen] = useState(false);
  const { employee, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-primary/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 transform bg-gradient-primary text-primary-foreground transition-transform duration-300 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          {/* Logo/Header */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8" />
              <span className="text-xl font-bold">HRMS Pro</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-primary-foreground hover:bg-white/10"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User Info */}
          <div className="px-6 py-4 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {employee?.first_name} {employee?.last_name}
                </p>
                <p className="text-xs text-primary-foreground/70">
                  {employee?.roles?.role_name}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation
              .filter(item => {
                const userRole = employee?.roles?.role_name;
                
                // Show HR Dashboard only to HR Managers and CXO
                if (item.href === '/hr-dashboard') {
                  return userRole === 'HR Manager' || userRole === 'CXO';
                }
                
                // Show Departments and Employees only to HR Managers and CXO
                if (item.href === '/departments' || item.href === '/employees') {
                  return userRole === 'HR Manager' || userRole === 'CXO';
                }
                // Show Attendance and Leave Management to HR Managers, CXO, Department Heads, and Team Leads
                if (item.href === '/attendance' || item.href === '/leave-management') {
                  return userRole === 'HR Manager' || userRole === 'CXO' || userRole === 'Department Head' || userRole === 'Team Lead';
                }
                
                // Show Employment History only to HR Managers and CXO
                if (item.href === '/history') {
                  return userRole === 'HR Manager' || userRole === 'CXO';
                }
                
                return true;
              })
              .map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors hover:bg-white/10 text-primary-foreground/90 hover:text-primary-foreground"
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
          </nav>

          {/* Footer Actions */}
           <div className="px-4 py-4 border-t border-white/10 space-y-2">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-primary-foreground hover:bg-white/10"
              onClick={() => setApplyLeaveDialogOpen(true)}
            >
              <FileText className="mr-3 h-4 w-4" />
              Apply for Leave
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-primary-foreground hover:bg-white/10"
              onClick={handleSignOut}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b bg-card/95 backdrop-blur-sm px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <h1 className="text-xl font-semibold text-foreground">
                Human Resource Management System
              </h1>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
      <ApplyLeaveDialog
        open={applyLeaveDialogOpen}
        onOpenChange={setApplyLeaveDialogOpen}
        onSuccess={() => { /* Optionally refresh data or show toast */ }}
      />
    </div>
  );
};

export default HRMSLayout;