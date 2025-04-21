import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import onboardingReducer from '../features/onboarding/onboardingSlice';
import trainModelReducer from '../features/aiModel/trainModelSlice';
import aiAgentReducer from '../features/aiAgent/aiAgentSlice';
export const store = configureStore({
  reducer: {
    auth: authReducer,
    onboarding: onboardingReducer,
    trainModel: trainModelReducer,
    aiAgent: aiAgentReducer
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
