import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/api/axios";


// Interface for the populated owner object
interface PopulatedOwner {
  _id: string;
  name: string;
  email: string;
}

export interface IAiIntegrations {
  businessId: string;
  website: boolean;
  whatsapp: boolean;
  api: boolean;
  integrationDetails: {
    apiKey: string;
    status: 'active' | 'inactive';
    integrationTypes: Array<'website' | 'whatsapp' | 'api'>;
    configDetails?: Record<string, any>;
    limits: {
      maxWebsites: number;
      maxWhatsappNumbers: number;
      maxModelTraining?: number; // Optional for API integrations
      maxAgents?: number; // Optional for API integrations
      maxApiCalls: number;
      maxConversationsPerMonth: number;
    };
    usageStats: {
      websitesConnected: number;
      whatsappNumbersConnected: number;
      apiCallsMade: number;
      monthlyConversations: number;
      modelTrained:  number,
      agentsCreated: number, 
    };
    existingDomains: string[];
    expiresAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// The Business interface, updated to match the partial data from your controller.
// Fields not selected in the controller are now optional.
export interface Business {
  _id: string;
  name: string;
  domainName: string;
  // The 'owner' field is now a populated object
  owner: PopulatedOwner | string; // Use a union type for flexibility
  subscriptionPlan?: 'basic' | 'premium' | 'enterprise'; // Note: your controller selects 'subscriptionPLan', likely a typo for 'subscriptionPlan'
  subscriptionStatus: 'trial' | 'active' | 'canceled' | 'past_due' | 'incomplete';
  currentPeriodEnd?: string; // Dates are strings after JSON serialization
  trialEndDate?: string;
  
  // These fields are no longer sent by the updated controller, so they are optional
  industry?: string;
  businessType?: 'B2B' | 'B2C' | 'e-Commerce Store' | 'Other';
  platform?: string;
  // ... and so on for other unselected fields
  cancelAtPeriodEnd?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// The state for this slice
interface BusinessState {
  status: "idle" | "loading" | "updating" | "succeeded" | "failed";
  error: string | null;
  selectedBusiness: Business | null;
  aiIntegrations?: IAiIntegrations | null; 
}

// The payload for the editBusinessById thunk
interface EditBusinessPayload {
  id: string;
  updates: Partial<Business>; // This already handles partial updates correctly
}

// --- INITIAL STATE ---

const initialState: BusinessState = {
  status: "idle",
  error: null,
  selectedBusiness: null,
  aiIntegrations: null, // Initialize aiIntegrations to null
};

// --- ASYNC THUNKS ---

/**
 * Thunk to fetch a single business by its ID.
 * The return type now matches the partial Business interface.
 */
export const fetchBusinessById = createAsyncThunk<
  Business,
  string, // business ID
  { rejectValue: string }
>(
  "business/fetchBusinessById",
  async (businessId, thunkAPI) => {
    try {
      const response = await api.get(`/api/v1/business/${businessId}`);
      return response.data.data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to fetch business details.");
    }
  }
);

// --- ASYNC THUNK FOR AI INTEGRATIONS ---
export const fetchAiIntregationByBusinessId = createAsyncThunk<
  IAiIntegrations,
  string, // business ID
  { rejectValue: string }
>(
  "business/fetchAiIntregationByBusinessId",
  async (businessId, thunkAPI) => {
    try {
      const response = await api.get(`/api/v1/business/integrations/${businessId}`);
      return response.data.data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to fetch AI integration details.");
    }
  }
);


/**
 * Thunk to edit a business by its ID.
 * It will return the full, updated business object as defined by the edit controller.
 */
export const editBusinessById = createAsyncThunk<
  Business,
  EditBusinessPayload,
  { rejectValue: string }
>(
  "business/editBusinessById",
  async (payload, thunkAPI) => {
    try {
      const { id, updates } = payload;
      const response = await api.put(`/api/v1/business/${id}`, updates);
      return response.data.data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to update business details.");
    }
  }
);


export const handleCheckoutSuccess = createAsyncThunk<
  { business: Business },    // Type of the return value on success
  string,                     // Type of the payload argument (the session_id)
  { rejectValue: string }     // Type of the reject value
>(
  "business/handleCheckoutSuccess",
  async (sessionId, thunkAPI) => {
    try {
      const response = await api.get(`/api/v1/subscriptions/checkout-success?session_id=${sessionId}`);
      // The backend returns { success, message, data: { business: updatedBusiness } }
      return response.data.data; 
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to finalize subscription.");
    }
  }
);

// --- SLICE DEFINITION ---

const businessSlice = createSlice({
  name: "business",
  initialState,
  reducers: {
    clearSelectedBusiness(state) {
      state.selectedBusiness = null;
      state.aiIntegrations = null;
      state.status = 'idle';
      state.error = null;
    },
     setBusiness(state, action: PayloadAction<Business>) {
        state.selectedBusiness = action.payload;
        // Also update auth slice if needed, or handle that in the component
    }
  },
  extraReducers: (builder) => {
    builder
      // Cases for fetchBusinessById
      .addCase(fetchBusinessById.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchBusinessById.fulfilled, (state, action: PayloadAction<Business>) => {
        state.status = "succeeded";
        state.selectedBusiness = action.payload;
      })
      .addCase(fetchBusinessById.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.status = "failed";
        state.error = action.payload || "An unknown error occurred.";
      })

      // Cases for fetchAiIntregationByBusinessId
      .addCase(fetchAiIntregationByBusinessId.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAiIntregationByBusinessId.fulfilled, (state, action: PayloadAction<IAiIntegrations>) => {
        state.status = "succeeded";
        state.aiIntegrations = action.payload || null;
      })
      .addCase(fetchAiIntregationByBusinessId.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.status = "failed";
        state.error = action.payload || "An unknown error occurred.";
      })

      // Cases for editBusinessById
      .addCase(editBusinessById.pending, (state) => {
        state.status = "updating";
        state.error = null;
      })
      .addCase(editBusinessById.fulfilled, (state, action: PayloadAction<Business>) => {
        state.status = "succeeded";
        if (state.selectedBusiness && state.selectedBusiness._id === action.payload._id) {
          state.selectedBusiness = { ...state.selectedBusiness, ...action.payload };
        } else {
          state.selectedBusiness = action.payload;
        }
      })
      .addCase(editBusinessById.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.status = "failed";
        state.error = action.payload || "An unknown error occurred.";
      })

       .addCase(handleCheckoutSuccess.pending, (state) => {
        state.status = "updating"; // Use 'updating' to show a loading state
        state.error = null;
      })
      .addCase(handleCheckoutSuccess.fulfilled, (state, action: PayloadAction<{ business: Business }>) => {
        state.status = "succeeded";
        state.selectedBusiness = action.payload.business; // Update the state with the fresh data
        state.error = null;
      })
      .addCase(handleCheckoutSuccess.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "An error occurred during finalization.";
      });
  },
});

export const { clearSelectedBusiness } = businessSlice.actions;
export default businessSlice.reducer;