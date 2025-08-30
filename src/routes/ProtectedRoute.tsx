// src/components/auth/ProtectedRoute.tsx

import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { RootState } from '@/app/store';
import { ROLES } from '@/appRoutes'; // Import our defined roles

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const location = useLocation();
  const { user,  status, accessToken }: any = useSelector((state: RootState) => state.auth);

    const isAuthenticated = user.role && accessToken && status === 'succeeded';

  // Show a loading state while auth status is being determined
  if (status === 'loading' || status === 'idle') {
    return <div>Loading...</div>; // Or a spinner component
  }
  
  // If not authenticated, redirect to signin
  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // If authenticated, check for role authorization
  const isAuthorized = user && allowedRoles.includes(user.role);

  if (isAuthorized) {
    return children; // Access granted
  }
  
  // If authenticated but not authorized, redirect to their default home page
  if (user) {
    const defaultHomePage = user.role === ROLES.AGENT 
      ? '/main-menu/agent/inbox' 
      : '/main-menu/overview';
    
    return <Navigate to={defaultHomePage} replace />;
  }

  // Fallback redirect
  return <Navigate to="/signin" replace />;
};

export default ProtectedRoute;