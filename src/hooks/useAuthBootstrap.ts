// src/hooks/useAuthBootstrap.ts
import { useEffect } from 'react';
import { useAppDispatch } from '@/app/hooks';
import { refreshAccessToken, logout, setBootstrapped } from '@/features/auth/authSlice';
import { useNavigate } from 'react-router-dom';

export const useAuthBootstrap = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

useEffect(() => {
  console.log("🔁 Bootstrapping session...");
  dispatch(refreshAccessToken())
    .unwrap()
    .then(() => {
      console.log("✅ Token refreshed");
    })
    .catch(() => {
      console.log("❌ Refresh failed");
      dispatch(logout());
      navigate('/signin');
    })
    .finally(() => {
      dispatch(setBootstrapped());
    });
}, []);

};
