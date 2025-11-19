// src/hooks/useAuthBootstrap.ts
import { useEffect } from 'react';
import { useAppDispatch } from '@/app/hooks';
import { refreshAccessToken, logout, setBootstrapped } from '@/features/auth/authSlice';
import { useNavigate, useLocation } from 'react-router-dom';

export const useAuthBootstrap = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

useEffect(() => {
  // 🔧 FIX: Don't redirect if user is on public pages (signin, signup, password reset)
  const isPublicPage = 
    location.pathname === '/reset-password' || 
    location.pathname === '/forgot-password' ||
    location.pathname === '/signup' ||
    location.pathname === '/signin';
  
  console.log("🔁 Bootstrapping session...", { pathname: location.pathname, isPublicPage });
  
  dispatch(refreshAccessToken())
    .unwrap()
    .then((result) => {
      console.log("✅ Token refreshed successfully", { hasUser: !!result?.user, hasToken: !!result?.accessToken });
    })
    .catch((error) => {
      console.log("❌ Refresh failed", { error, pathname: location.pathname });
      dispatch(logout());
      // 🔧 FIX: Only redirect to signin if not on public pages AND not already on signin
      // This prevents redirect loops
      if (!isPublicPage && location.pathname !== '/signin') {
        console.log("🔄 Redirecting to signin from:", location.pathname);
        navigate('/signin', { replace: true });
      } else {
        console.log("⏸️ Skipping redirect - already on public page");
      }
    })
    .finally(() => {
      dispatch(setBootstrapped());
    });
}, [location.pathname, dispatch, navigate]);

};
