// src/routes/PublicLayout.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import { ROLES } from "../appRoutes";


const PublicLayout = () => {
  const { user } = useAppSelector((state) => state.auth);
  const location = useLocation();

  const isAuthenticated = !!user && (user.role === ROLES.AGENT || user.role === ROLES.BUSINESS);
  
  // 🔧 FIX: Allow access to reset-password even if authenticated (user might want to reset password while logged in)
  // Also allow forgot-password page
  const isPasswordResetPage = location.pathname === '/reset-password' || location.pathname === '/forgot-password';
  
  if (isAuthenticated && !isPasswordResetPage) {
    const defaultProtectedRoute = user.role === ROLES.AGENT 
      ? "/main-menu/agent/inbox" 
      : "/main-menu/overview";
      
    return <Navigate to={defaultProtectedRoute} replace />;
  }

  // User is not authenticated OR accessing password reset pages, so render the public child routes
  return <Outlet />;
};

export default PublicLayout;