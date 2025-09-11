// src/routes/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';
import { ROLES } from '../appRoutes';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles: string[];
}

/**
 * A component to protect routes based on user roles (Authorization).
 * It assumes authentication has already been checked by a parent route (e.g., AuthLayout).
 * 
 * - If the user's role is in `allowedRoles`, it renders the child component.
 * - If the user is authenticated but not authorized, it redirects them to their default homepage.
 * - If the user is not authenticated at all, it redirects to the sign-in page.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);

  // This component relies on AuthLayout to handle the primary "is logged in" check,
  // but we include it here as a fallback for safety.
  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  const isAuthorized = allowedRoles.includes(user.role);

  if (isAuthorized) {
    return children; // User has the required role, render the component
  }

  // User is logged in but does not have the required role.
  // Redirect them to their own dashboard to avoid a "Forbidden" page.
  const defaultHomePage = user.role === ROLES.AGENT 
    ? '/main-menu/agent/inbox' 
    : '/main-menu/overview';
    
  return <Navigate to={defaultHomePage} replace />;
};

export default ProtectedRoute;