import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { employee, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      // If no employee (not authenticated), redirect to login
      if (!employee) {
        navigate('/');
        return;
      }

      // If specific roles are required, check them
      if (allowedRoles && allowedRoles.length > 0) {
        const userRole = employee.roles?.role_name;
        if (!userRole || !allowedRoles.includes(userRole)) {
          navigate('/');
          return;
        }
      }
    }
  }, [employee, loading, navigate, allowedRoles]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!employee) {
    return null;
  }

  // If roles are specified, check them
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = employee.roles?.role_name;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return null;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;