import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { RootState } from '@/app/store';

const AuthLayoutGuard = () => {
  const location = useLocation();
  const { user, accessToken, status, bootstrapped }: any = useSelector((state: RootState) => state.auth);
  
    const isAuthenticated = user.role === 'agent' || user.role === 'business' && accessToken && status === 'succeeded';

  // Don't make a decision until the session has been checked
  if (!bootstrapped) {
    return <div>Loading session...</div>;
  }
  
  // If the user is authenticated, render the nested routes (e.g., DashboardLayout).
  if (isAuthenticated) {
    return <Outlet />;
  }

  // If the user is not authenticated, redirect them to the sign-in page.
  return <Navigate to="/signin" state={{ from: location }} replace />;
};

export default AuthLayoutGuard;