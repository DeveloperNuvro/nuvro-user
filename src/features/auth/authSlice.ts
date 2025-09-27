import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/api/axios';
import axios from 'axios';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  businessId?: string;
  language?: string;
  _id?: string; // MongoDB ObjectId
}



export interface AuthState {
  user: User | null;
  accessToken: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  bootstrapped: boolean;
}


export const updateUserLanguage = createAsyncThunk<
  User,
  { language: string }
>('auth/updateUserLanguage', async (payload, thunkAPI) => {
  try {

    const response = await api.post('/api/v1/users/change-language', payload);
    return response.data.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to update language');
  }
});


export const registerUser = createAsyncThunk<
  { user: User; accessToken: string },
  { name: string; email: string; password: string; role?: string }
>('auth/registerUser', async (payload, thunkAPI) => {
  try {
    const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/v1/users/register`, payload);
    console.log('Response:', response.data);
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Register failed');
  }
});


export const loginUser = createAsyncThunk<
  { user: User; accessToken: string },
  { email: string; password: string }
>('auth/loginUser', async (payload, thunkAPI) => {
  try {
    const response = await api.post(`/api/v1/users/login`, payload);
    return response.data;
  } catch (error: any) {
    console.log(error)
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Login failed');
  }
});


export const refreshAccessToken = createAsyncThunk<
  { accessToken: string }
>('auth/refreshAccessToken', async (_, thunkAPI) => {
  try {
    const response = await api.post('/api/v1/users/refresh-token');
    return { accessToken: response.data.data.accessToken, user: response.data.data.user };
  } catch (error: any) {
    return thunkAPI.rejectWithValue('Token refresh failed');
  }
});


export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, thunkAPI) => {
    try {
      const res = await api.post('/api/v1/users/logout');
      return res.data.message;
    } catch (error: any) {
      return thunkAPI.rejectWithValue('Logout failed');
    }
  }
);

// --- NEW ASYNC THUNK FOR DELETING USER ACCOUNT ---
export const deleteUserAccount = createAsyncThunk(
  'auth/deleteUserAccount',
  async (userId: string, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.delete(`/api/v1/users/${userId}`);
      console.log('Account deletion response:', response.data);
      // Dispatch logoutUser to clear out tokens and user state
      await dispatch(logoutUser());
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete account.');
    }
  }
);


const initialState: AuthState = {
  user: null,
  accessToken: null,
  status: 'idle',
  error: null,
  bootstrapped: false,
};


const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.status = 'idle';
      state.error = null;
      state.error = null;
      state.bootstrapped = true;
    },
    setAccessToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
    },
    setBootstrapped(state) {
      state.bootstrapped = true;
    },
  },
  extraReducers: (builder) => {
    builder

      .addCase(registerUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action: any) => {
        state.user = action.payload.data.user;
        state.accessToken = action.payload.data.accessToken;
        state.status = 'succeeded';
      })


      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: any) => {
        console.log(action.payload);
        state.status = 'succeeded';
        state.user = action.payload.data.user;
        state.accessToken = action.payload.data.accessToken;
      })

      .addCase(refreshAccessToken.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(refreshAccessToken.fulfilled, (state, action: any) => {
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
        state.status = 'succeeded';
        state.bootstrapped = true;
      })

      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.status = 'idle';
        state.error = null;
        state.bootstrapped = true;
      })


      .addCase(updateUserLanguage.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      }
      )
      .addCase(updateUserLanguage.fulfilled, (state, action) => {
        state.status = 'succeeded';
         if (state.user) {
          state.user.language = action.payload.language;
        }
      })
      .addCase(updateUserLanguage.rejected, (state, action: any) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to update language';
      }
      )
      // --- EXTRA REDUCERS FOR DELETING USER ACCOUNT ---
      .addCase(deleteUserAccount.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteUserAccount.fulfilled, (state) => {
        state.status = 'succeeded';
        // The user state is cleared by the logoutUser action that is dispatched
        // in the thunk, so we don't need to clear it here again.
      })
      .addCase(deleteUserAccount.rejected, (state, action: any) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to delete account';
      })


      .addMatcher(
        (action): action is { type: string; error: { message: string } } =>
          action.type.startsWith('auth/') && action.type.endsWith('/rejected'),
        (state, action) => {
          state.status = 'failed';
          state.error = action.error.message || 'Something went wrong';
        }
      );
  },
});

export const { logout, setAccessToken, setBootstrapped } = authSlice.actions;
export default authSlice.reducer;