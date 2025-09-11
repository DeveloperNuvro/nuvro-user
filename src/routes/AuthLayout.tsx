// src/routes/AuthLayout.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import { ROLES } from "../appRoutes";


 
const AuthLayout = () => {

  const { user } = useAppSelector((state) => state.auth);
  

  const isAuthenticated = !!user && (user.role === ROLES.AGENT || user.role === ROLES.BUSINESS);

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }
  
  return <Outlet />;
};

export default AuthLayout;