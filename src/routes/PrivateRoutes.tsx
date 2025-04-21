// src/routes/PrivateRoute.tsx
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store';
import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = () => {
  const { accessToken, user } = useSelector((state: RootState) => state.auth);
  const isAuthenticated = !!accessToken && !!user;

  return isAuthenticated ? <Outlet /> : <Navigate to="/signin" replace />;
};

export default PrivateRoute;
