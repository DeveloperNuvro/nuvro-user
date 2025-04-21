// src/hooks/useAuthBootstrap.ts
import { useEffect } from 'react';
import { useAppDispatch } from '@/app/hooks';
import { refreshAccessToken, logout, setBootstrapped } from '@/features/auth/authSlice';
import { useNavigate } from 'react-router-dom';

export const useAuthBootstrap = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const timeout = setTimeout(() => {
      dispatch(logout());
      navigate('/signin');
    }, 10000); // ⏱ 10-second timeout

    dispatch(refreshAccessToken())
      .unwrap()
      .catch(() => {
        dispatch(logout()); // important for cleanup
        navigate('/signin');
      })
      .finally(() => {
        clearTimeout(timeout); // ✅ Clear timeout if refresh finishes early
        dispatch(setBootstrapped()); // ✅ Allow UI to render
      });
  }, []);
};
