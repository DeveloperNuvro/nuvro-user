import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '@/api/axios';

export interface WooCommerceIntegration {
  id: string;
  storeUrl: string;
  isActive: boolean;
  lastSyncAt?: string;
  syncStatus?: 'idle' | 'syncing' | 'failed';
  lastError?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WooCommerceState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  integration: WooCommerceIntegration | null;
  testStatus: 'idle' | 'testing' | 'succeeded' | 'failed';
  testResult: {
    connected: boolean;
    productsAvailable: boolean;
    totalProducts: number;
  } | null;
}

const initialState: WooCommerceState = {
  status: 'idle',
  error: null,
  integration: null,
  testStatus: 'idle',
  testResult: null,
};

interface ConnectWooCommercePayload {
  businessId: string;
  modelId: string;
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

interface UpdateWooCommercePayload {
  businessId: string;
  modelId: string;
  storeUrl?: string;
  consumerKey?: string;
  consumerSecret?: string;
  isActive?: boolean;
}

// Connect WooCommerce store
export const connectWooCommerce = createAsyncThunk<
  WooCommerceIntegration,
  ConnectWooCommercePayload,
  { rejectValue: string }
>(
  'wooCommerce/connect',
  async (payload, thunkAPI) => {
    try {
      const res = await api.post(
        `/api/v1/woocommerce/${payload.businessId}/connect`,
        {
          modelId: payload.modelId,
          storeUrl: payload.storeUrl,
          consumerKey: payload.consumerKey,
          consumerSecret: payload.consumerSecret,
        }
      );
      return res.data.data.integration;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to connect WooCommerce store'
      );
    }
  }
);

// Get WooCommerce integration
export const getWooCommerceIntegration = createAsyncThunk<
  WooCommerceIntegration | null,
  { businessId: string; modelId: string },
  { rejectValue: string }
>(
  'wooCommerce/getIntegration',
  async (payload, thunkAPI) => {
    try {
      const res = await api.get(
        `/api/v1/woocommerce/${payload.businessId}/models/${payload.modelId}`
      );
      if (res.data.data.connected === false) {
        return null;
      }
      return res.data.data.integration;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to fetch WooCommerce integration'
      );
    }
  }
);

// Update WooCommerce integration
export const updateWooCommerceIntegration = createAsyncThunk<
  WooCommerceIntegration,
  UpdateWooCommercePayload,
  { rejectValue: string }
>(
  'wooCommerce/update',
  async (payload, thunkAPI) => {
    try {
      const res = await api.put(
        `/api/v1/woocommerce/${payload.businessId}/models/${payload.modelId}`,
        {
          storeUrl: payload.storeUrl,
          consumerKey: payload.consumerKey,
          consumerSecret: payload.consumerSecret,
          isActive: payload.isActive,
        }
      );
      return res.data.data.integration;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to update WooCommerce integration'
      );
    }
  }
);

// Disconnect WooCommerce
export const disconnectWooCommerce = createAsyncThunk<
  void,
  { businessId: string; modelId: string },
  { rejectValue: string }
>(
  'wooCommerce/disconnect',
  async (payload, thunkAPI) => {
    try {
      await api.delete(
        `/api/v1/woocommerce/${payload.businessId}/models/${payload.modelId}`
      );
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to disconnect WooCommerce store'
      );
    }
  }
);

// Test WooCommerce connection
export const testWooCommerceConnection = createAsyncThunk<
  { connected: boolean; productsAvailable: boolean; totalProducts: number },
  { businessId: string; modelId: string },
  { rejectValue: string }
>(
  'wooCommerce/test',
  async (payload, thunkAPI) => {
    try {
      const res = await api.post(
        `/api/v1/woocommerce/${payload.businessId}/models/${payload.modelId}/test`
      );
      return res.data.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to test WooCommerce connection'
      );
    }
  }
);

const wooCommerceSlice = createSlice({
  name: 'wooCommerce',
  initialState,
  reducers: {
    resetWooCommerceState(state) {
      state.status = 'idle';
      state.error = null;
      state.integration = null;
      state.testStatus = 'idle';
      state.testResult = null;
    },
    clearTestResult(state) {
      state.testStatus = 'idle';
      state.testResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Connect
      .addCase(connectWooCommerce.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(connectWooCommerce.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.integration = action.payload;
      })
      .addCase(connectWooCommerce.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to connect';
      })
      // Get Integration
      .addCase(getWooCommerceIntegration.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getWooCommerceIntegration.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.integration = action.payload;
      })
      .addCase(getWooCommerceIntegration.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to fetch integration';
      })
      // Update
      .addCase(updateWooCommerceIntegration.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateWooCommerceIntegration.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.integration = action.payload;
      })
      .addCase(updateWooCommerceIntegration.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to update';
      })
      // Disconnect
      .addCase(disconnectWooCommerce.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(disconnectWooCommerce.fulfilled, (state) => {
        state.status = 'succeeded';
        state.integration = null;
      })
      .addCase(disconnectWooCommerce.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to disconnect';
      })
      // Test
      .addCase(testWooCommerceConnection.pending, (state) => {
        state.testStatus = 'testing';
        state.error = null;
      })
      .addCase(testWooCommerceConnection.fulfilled, (state, action) => {
        state.testStatus = 'succeeded';
        state.testResult = action.payload;
      })
      .addCase(testWooCommerceConnection.rejected, (state, action) => {
        state.testStatus = 'failed';
        state.error = action.payload || 'Connection test failed';
      });
  },
});

export const { resetWooCommerceState, clearTestResult } = wooCommerceSlice.actions;
export default wooCommerceSlice.reducer;

