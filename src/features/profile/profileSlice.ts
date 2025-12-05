// src/features/profile/profileSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/api/axios"; // Your configured axios instance
import { toast } from "react-hot-toast";

// --- 1. INTERFACES to match your data structures ---

// Assuming your User and Business models have these fields
interface UserProfile {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  businessId: string;
}

interface BusinessProfile {
  _id: string;
  name: string;
  logo?: string;
  widgetColor?: string;
}

// The combined profile data we will fetch
export interface ProfileData {
  name: string;
  email: string;
  phone?: string;
  businessName: string;
  businessLogo?: string;
  widgetColor?: string;
}

// The main state for this slice
interface ProfileState {
  status: "idle" | "loading" | "succeeded" | "failed";
  updateStatus: "idle" | "loading" | "succeeded" | "failed"; // For tracking updates specifically
  error: string | null;
  profile: ProfileData | null;
}


// --- 2. INITIAL STATE ---

const initialState: ProfileState = {
  status: "idle",
  updateStatus: "idle",
  error: null,
  profile: null,
};


// --- 3. ASYNC THUNKS ---

// Thunk to fetch the initial combined user and business profile data
export const fetchUserProfile = createAsyncThunk<
  ProfileData,
  void, // No arguments needed, user is identified by auth token
  { rejectValue: string }
>(
  "profile/fetchProfile",
  async (_, thunkAPI) => {
    try {
      // Assuming you have an endpoint like GET /api/v1/profile/me
      const response = await api.get('/api/v1/profile/me');
      return response.data.data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || 'Failed to fetch profile data');
    }
  }
);

// Thunk to update the user's personal details
export const updateUserProfile = createAsyncThunk<
  UserProfile,
  Partial<UserProfile>, // We send only the fields we want to change
  { rejectValue: string }
>(
  "profile/updateUser",
  async (payload, thunkAPI) => {
    try {
      const response = await api.patch('/api/v1/profile/user', payload);
      toast.success("Profile updated successfully!");
      return response.data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Failed to update profile";
      toast.error(errorMessage);
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Thunk to update the business profile (name and/or widgetColor)
export const updateBusinessProfile = createAsyncThunk<
  BusinessProfile,
  { businessName?: string; widgetColor?: string },
  { rejectValue: string }
>(
  "profile/updateBusiness",
  async (payload, thunkAPI) => {
    try {
      const response = await api.patch('/api/v1/profile/business', payload);
      const successMessage = payload.widgetColor 
        ? "Widget color updated successfully!" 
        : "Business name updated successfully!";
      toast.success(successMessage);
      return response.data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Failed to update business profile";
      toast.error(errorMessage);
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Thunk to change the user's password
export const changeUserPassword = createAsyncThunk<
  void, // No data is returned on success
  { oldPassword: string, newPassword: string },
  { rejectValue: string }
>(
  "profile/changePassword",
  async (payload, thunkAPI) => {
    try {
      await api.patch('/api/v1/profile/change-password', payload);
      toast.success("Password changed successfully!");
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Failed to change password";
      toast.error(errorMessage);
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Thunk to upload the business logo
export const uploadBusinessLogo = createAsyncThunk<
  { logoUrl: string },
  File, // The argument is a File object
  { rejectValue: string }
>(
  "profile/uploadLogo",
  async (file, thunkAPI) => {
    const formData = new FormData();
    formData.append('logo', file);
    try {
      const response = await api.post('/api/v1/profile/business/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success("Logo uploaded successfully!");
      return response.data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Failed to upload logo";
      toast.error(errorMessage);
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);


// --- 4. THE SLICE ---
const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    clearProfile: (state) => {
      state.profile = null;
      state.status = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // --- Fetch Profile ---
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchUserProfile.fulfilled, (state, action: PayloadAction<ProfileData>) => {
        state.status = "succeeded";
        state.profile = action.payload;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });

    // --- Update Actions ---
    const updateActions = [updateUserProfile, updateBusinessProfile, changeUserPassword, uploadBusinessLogo];

    updateActions.forEach(action => {
      builder
        .addCase(action.pending, (state) => {
          state.updateStatus = 'loading';
          state.error = null;
        })
        .addCase(action.rejected, (state, action) => {
          state.updateStatus = 'failed';
          state.error = action.payload as string;
        });
    });

    // --- Specific Update Fulfilled Cases ---
    builder
      .addCase(updateUserProfile.fulfilled, (state, action: PayloadAction<UserProfile>) => {
        state.updateStatus = 'succeeded';
        if (state.profile) {
          state.profile.name = action.payload.name;
          state.profile.email = action.payload.email;
          state.profile.phone = action.payload.phone;
        }
      })
      .addCase(updateBusinessProfile.fulfilled, (state, action: PayloadAction<BusinessProfile>) => {
        state.updateStatus = 'succeeded';
        if (state.profile) {
          state.profile.businessName = action.payload.name;
          if (action.payload.widgetColor !== undefined) {
            state.profile.widgetColor = action.payload.widgetColor;
          }
        }
      })
      .addCase(changeUserPassword.fulfilled, (state) => {
        state.updateStatus = 'succeeded';
      })
      .addCase(uploadBusinessLogo.fulfilled, (state, action: PayloadAction<{ logoUrl: string }>) => {
        state.updateStatus = 'succeeded';
        if (state.profile) {
          state.profile.businessLogo = action.payload.logoUrl;
        }
      });
  },
});

export const { clearProfile } = profileSlice.actions;
export default profileSlice.reducer;