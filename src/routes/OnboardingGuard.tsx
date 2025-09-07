// src/routes/OnboardingGuard.tsx
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store';
import { Navigate } from 'react-router-dom';

const OnboardingGuard = ({ children }: any) => {
  const user: any = useSelector((state: RootState) => state.auth.user);

  console.log(user)
  if (user?.onboardingCompleted) {
    if(user?.role === 'agent') return <Navigate to="/main-menu/Customers" replace />
    else return <Navigate to="/main-menu/overview" replace />
  }

  return children;
};

export default OnboardingGuard;
