import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { RootState } from '@/app/store';

const AuthLayoutGuard = () => {
  const location = useLocation();
  const { user, accessToken, status, bootstrapped }: any = useSelector((state: RootState) => state.auth);
  
    const isAuthenticated = user.role === 'agent' || user.role === 'business' && accessToken && status === 'succeeded';

  if (!bootstrapped) {
    return <div>Loading session...</div>;
  }
  

  if (isAuthenticated) {
    return <Outlet />;
  }

  
  return <Navigate to="/signin" state={{ from: location }} replace />;
};

export default AuthLayoutGuard;