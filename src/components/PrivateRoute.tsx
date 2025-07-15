import { Navigate } from "react-router-dom";
import { useAuthStatus } from "../pages/hooks/useAuthStatus";

interface PrivateRouteProps {
  element: any;
}

export function PrivateRoute({ element }: PrivateRouteProps) {
  const { isAuthenticated, loading } = useAuthStatus();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return element;
}
