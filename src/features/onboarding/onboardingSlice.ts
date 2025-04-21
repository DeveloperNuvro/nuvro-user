// src/features/onboarding/onboardingSlice.ts
import { createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import { api } from '@/api/axios';

export interface OnboardingData {
  businessName: string;
  industry: string;
  businessType: string;
  platform: string;
  supportSize: string;
  supportChannels: string[];
  websiteTraffic: string;
  monthlyConversations: string;
  goals: string[];
}

export interface OnboardingState {
  data: OnboardingData | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: OnboardingState = {
  data: null,
  status: 'idle',
  error: null,
};

// 🔄 Async Thunk
export const submitOnboarding = createAsyncThunk<
  { message: string }, // return type
  OnboardingData, // payload
  { rejectValue: string }
>('onboarding/submit', async (formData, thunkAPI) => {
  try {
    const res = await api.post('/api/v1/business', formData);
    return res.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Onboarding failed');
  }
});

const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState,
  reducers: {
    resetOnboarding(state) {
      state.data = null;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitOnboarding.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(submitOnboarding.fulfilled, (state, _action) => {
        state.status = 'succeeded';
      })
      .addCase(submitOnboarding.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Onboarding failed';
      });
  },
});

export const { resetOnboarding } = onboardingSlice.actions;
export default onboardingSlice.reducer;
