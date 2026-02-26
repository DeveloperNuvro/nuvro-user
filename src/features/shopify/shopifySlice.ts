import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '@/api/axios';

export interface ShopifyIntegration {
  id: string;
  storeDomain: string;
  isActive: boolean;
  lastSyncAt?: string;
  syncStatus?: 'idle' | 'syncing' | 'failed';
  lastError?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Minimal product shape from GET .../products API */
export interface ShopifyProduct {
  id: number;
  title: string;
  handle?: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  variants?: Array<{ id: number; title?: string; price?: string; inventory_quantity?: number }>;
  images?: Array<{ id: number; src: string }>;
}

export interface ShopifyProductsPage {
  products: ShopifyProduct[];
  nextPageInfo: string | null;
  hasMore: boolean;
}

export interface ShopifyState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  integration: ShopifyIntegration | null;
  testStatus: 'idle' | 'testing' | 'succeeded' | 'failed';
  testResult: {
    connected: boolean;
    storeDomain?: string;
    productCount?: number;
  } | null;
  productsList: ShopifyProductsPage | null;
  productsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  productsError: string | null;
}

const initialState: ShopifyState = {
  status: 'idle',
  error: null,
  integration: null,
  testStatus: 'idle',
  testResult: null,
  productsList: null,
  productsStatus: 'idle',
  productsError: null,
};

interface ConnectShopifyPayload {
  businessId: string;
  modelId: string;
  storeDomain: string;
  accessToken: string;
}

interface UpdateShopifyPayload {
  businessId: string;
  modelId: string;
  storeDomain?: string;
  accessToken?: string;
  isActive?: boolean;
}

export const connectShopify = createAsyncThunk<
  ShopifyIntegration,
  ConnectShopifyPayload,
  { rejectValue: string }
>(
  'shopify/connect',
  async (payload, thunkAPI) => {
    try {
      const res = await api.post(
        `/api/v1/shopify/${payload.businessId}/connect`,
        {
          modelId: payload.modelId,
          storeDomain: payload.storeDomain,
          accessToken: payload.accessToken,
        }
      );
      return res.data.data.integration;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to connect Shopify store'
      );
    }
  }
);

export const getShopifyIntegration = createAsyncThunk<
  ShopifyIntegration | null,
  { businessId: string; modelId: string },
  { rejectValue: string }
>(
  'shopify/getIntegration',
  async (payload, thunkAPI) => {
    try {
      const res = await api.get(
        `/api/v1/shopify/${payload.businessId}/models/${payload.modelId}`
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
        error.response?.data?.message || 'Failed to fetch Shopify integration'
      );
    }
  }
);

export const updateShopifyIntegration = createAsyncThunk<
  ShopifyIntegration,
  UpdateShopifyPayload,
  { rejectValue: string }
>(
  'shopify/update',
  async (payload, thunkAPI) => {
    try {
      const res = await api.put(
        `/api/v1/shopify/${payload.businessId}/models/${payload.modelId}`,
        {
          storeDomain: payload.storeDomain,
          accessToken: payload.accessToken,
          isActive: payload.isActive,
        }
      );
      return res.data.data.integration;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to update Shopify integration'
      );
    }
  }
);

export const disconnectShopify = createAsyncThunk<
  void,
  { businessId: string; modelId: string },
  { rejectValue: string }
>(
  'shopify/disconnect',
  async (payload, thunkAPI) => {
    try {
      await api.delete(
        `/api/v1/shopify/${payload.businessId}/models/${payload.modelId}`
      );
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to disconnect Shopify store'
      );
    }
  }
);

export const testShopifyConnection = createAsyncThunk<
  { connected: boolean; storeDomain?: string; productCount?: number },
  { businessId: string; modelId: string },
  { rejectValue: string }
>(
  'shopify/test',
  async (payload, thunkAPI) => {
    try {
      const res = await api.post(
        `/api/v1/shopify/${payload.businessId}/models/${payload.modelId}/test`
      );
      return res.data.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to test Shopify connection'
      );
    }
  }
);

/** Get Shopify OAuth authorize URL; frontend redirects user to this URL. */
export const getShopifyOAuthRedirectUrl = createAsyncThunk<
  string,
  { shop: string; businessId: string; modelId: string },
  { rejectValue: string }
>(
  'shopify/getOAuthRedirectUrl',
  async (payload, thunkAPI) => {
    try {
      const res = await api.get('/api/v1/shopify/oauth/authorize-url', {
        params: {
          shop: payload.shop.trim(),
          businessId: payload.businessId,
          modelId: payload.modelId,
        },
      });
      const url = res.data?.data?.redirectUrl;
      if (!url) return thunkAPI.rejectWithValue('No redirect URL returned');
      return url;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to get Shopify connect URL'
      );
    }
  }
);

export interface GetShopifyProductsPayload {
  businessId: string;
  modelId: string;
  limit?: number;
  pageInfo?: string | null;
  refresh?: boolean;
}

/** Get paginated Shopify products (cached on backend). */
export const getShopifyProducts = createAsyncThunk<
  ShopifyProductsPage,
  GetShopifyProductsPayload,
  { rejectValue: string }
>(
  'shopify/getProducts',
  async (payload, thunkAPI) => {
    try {
      const params: Record<string, string | number> = {
        limit: Math.min(Math.max(1, payload.limit ?? 20), 250),
      };
      if (payload.pageInfo) params.page_info = payload.pageInfo;
      if (payload.refresh) params.refresh = 1;
      const res = await api.get(
        `/api/v1/shopify/${payload.businessId}/models/${payload.modelId}/products`,
        { params }
      );
      const data = res.data?.data;
      if (!data) return thunkAPI.rejectWithValue('No data returned');
      return {
        products: Array.isArray(data.products) ? data.products : [],
        nextPageInfo: data.nextPageInfo ?? null,
        hasMore: !!data.hasMore,
      };
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to fetch products'
      );
    }
  }
);

const shopifySlice = createSlice({
  name: 'shopify',
  initialState,
  reducers: {
    resetShopifyState(state) {
      state.status = 'idle';
      state.error = null;
      state.integration = null;
      state.testStatus = 'idle';
      state.testResult = null;
      state.productsList = null;
      state.productsStatus = 'idle';
      state.productsError = null;
    },
    clearShopifyTestResult(state) {
      state.testStatus = 'idle';
      state.testResult = null;
    },
    clearShopifyProducts(state) {
      state.productsList = null;
      state.productsStatus = 'idle';
      state.productsError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(connectShopify.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(connectShopify.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.integration = action.payload;
      })
      .addCase(connectShopify.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to connect';
      })
      .addCase(getShopifyIntegration.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getShopifyIntegration.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.integration = action.payload;
      })
      .addCase(getShopifyIntegration.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to fetch integration';
      })
      .addCase(updateShopifyIntegration.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateShopifyIntegration.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.integration = action.payload;
      })
      .addCase(updateShopifyIntegration.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to update';
      })
      .addCase(disconnectShopify.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(disconnectShopify.fulfilled, (state) => {
        state.status = 'succeeded';
        state.integration = null;
      })
      .addCase(disconnectShopify.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to disconnect';
      })
      .addCase(testShopifyConnection.pending, (state) => {
        state.testStatus = 'testing';
        state.error = null;
      })
      .addCase(testShopifyConnection.fulfilled, (state, action) => {
        state.testStatus = 'succeeded';
        state.testResult = action.payload;
      })
      .addCase(testShopifyConnection.rejected, (state, action) => {
        state.testStatus = 'failed';
        state.error = action.payload || 'Connection test failed';
      })
      .addCase(getShopifyProducts.pending, (state) => {
        state.productsStatus = 'loading';
        state.productsError = null;
      })
      .addCase(getShopifyProducts.fulfilled, (state, action) => {
        state.productsStatus = 'succeeded';
        state.productsList = action.payload;
      })
      .addCase(getShopifyProducts.rejected, (state, action) => {
        state.productsStatus = 'failed';
        state.productsError = action.payload || 'Failed to fetch products';
      });
  },
});

export const { resetShopifyState, clearShopifyTestResult, clearShopifyProducts } = shopifySlice.actions;
export default shopifySlice.reducer;
