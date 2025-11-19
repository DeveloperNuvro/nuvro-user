// src/routes/PublicLayout.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import { ROLES } from "../appRoutes";


const PublicLayout = () => {
  const { user } = useAppSelector((state) => state.auth);
  const location = useLocation();

  const isAuthenticated = !!user && (user.role === ROLES.AGENT || user.role === ROLES.BUSINESS);
  
  // 🔧 FIX: Allow access to public pages even if authenticated
  // - Password reset pages (user might want to reset password while logged in)
  // - Signup page (user might want to create a new account)
  // - Signin page (user might want to switch accounts)
  const isPublicPage = 
    location.pathname === '/reset-password' || 
    location.pathname === '/forgot-password' ||
    location.pathname === '/signup' ||
    location.pathname === '/signin';
  
  console.log('🔍 PublicLayout Debug:', {
    pathname: location.pathname,
    isPublicPage,
    isAuthenticated,
    user: user ? { id: user.id, role: user.role } : null,
  });
  
  // 🔧 FIX: Only redirect authenticated users if they're NOT on public pages
  // This allows signin/signup to be accessible even when logged in
  if (isAuthenticated && !isPublicPage) {
    const defaultProtectedRoute = user.role === ROLES.AGENT 
      ? "/main-menu/agent/inbox" 
      : "/main-menu/overview";
    
    console.log('🔄 PublicLayout: Redirecting authenticated user to:', defaultProtectedRoute);
    return <Navigate to={defaultProtectedRoute} replace />;
  }

  // User is not authenticated OR accessing public pages, so render the public child routes
  console.log('✅ PublicLayout: Rendering public route');
  return <Outlet />;
};

export default PublicLayout;