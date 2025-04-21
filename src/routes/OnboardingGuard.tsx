// src/routes/OnboardingGuard.tsx
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store';
import { Navigate } from 'react-router-dom';

const OnboardingGuard = ({ children }: any) => {
  const user: any = useSelector((state: RootState) => state.auth.user);

  // If user has completed onboarding, redirect to dashboard
  if (user?.onboardingCompleted) {
    return <Navigate to="/main-menu" replace />;
  }

  return children;
};

export default OnboardingGuard;
