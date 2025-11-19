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
  
  console.log("🔁 Bootstrapping session...");
  dispatch(refreshAccessToken())
    .unwrap()
    .then(() => {
      console.log("✅ Token refreshed");
    })
    .catch(() => {
      console.log("❌ Refresh failed");
      dispatch(logout());
      // Only redirect to signin if not on public pages
      if (!isPublicPage) {
        navigate('/signin');
      }
    })
    .finally(() => {
      dispatch(setBootstrapped());
    });
}, [location.pathname, dispatch, navigate]);

};
