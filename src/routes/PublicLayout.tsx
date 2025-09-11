// src/routes/PublicLayout.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import { ROLES } from "../appRoutes";


const PublicLayout = () => {
  const { user } = useAppSelector((state) => state.auth);

  const isAuthenticated = !!user && (user.role === ROLES.AGENT || user.role === ROLES.BUSINESS);
  
  if (isAuthenticated) {

    const defaultProtectedRoute = user.role === ROLES.AGENT 
      ? "/main-menu/agent/inbox" 
      : "/main-menu/overview";
      
    return <Navigate to={defaultProtectedRoute} replace />;
  }

  // User is not authenticated, so render the public child routes
  return <Outlet />;
};

export default PublicLayout;