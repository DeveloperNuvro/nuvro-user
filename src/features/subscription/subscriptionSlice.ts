import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/api/axios";

// --- INTERFACES ---

// The state for this slice is very simple. It only tracks the status of async operations.
// The actual subscription data lives on the user/auth state.
interface SubscriptionState {
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

// The expected response from the backend when creating a session
interface SessionResponse {
  url: string;
}

// The payload for creating a new checkout session
interface CreateCheckoutPayload {
  priceId: string;
}

// --- INITIAL STATE ---

const initialState: SubscriptionState = {
  status: "idle",
  error: null,
};

// --- ASYNC THUNKS ---

/**
 * Thunk to create a Stripe Checkout session.
 * It takes a priceId and returns a URL to redirect the user to.
 */
export const createCheckoutSession = createAsyncThunk<
  SessionResponse,          // Type of the return value on success
  CreateCheckoutPayload,    // Type of the payload argument
  { rejectValue: string }   // Type of the reject value
>(
  "subscription/createCheckoutSession",
  async (payload, thunkAPI) => {
    try {
      // The backend endpoint handles associating this with the logged-in user
      const response = await api.post("/api/v1/subscriptions/create-checkout-session", payload);
      // The backend returns { success, message, data: { url } }
      return response.data.data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to create checkout session.");
    }
  }
);

/**
 * Thunk to create a Stripe Customer Portal session.
 * It takes no arguments and returns a URL for redirection.
 */
export const createPortalSession = createAsyncThunk<
  SessionResponse,          // Type of the return value on success
  void,                     // No payload needed
  { rejectValue: string }   // Type of the reject value
>(
  "subscription/createPortalSession",
  async (_, thunkAPI) => {
    try {
      const response = await api.post("/api/v1/subscriptions/create-portal-session");
      return response.data.data;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to create customer portal session.");
    }
  }
);

// --- SLICE DEFINITION ---

const subscriptionSlice = createSlice({
  name: "subscription",
  initialState,
  reducers: {
    // A simple reducer to clear any errors if needed
    clearSubscriptionError(state) {
      state.error = null;
      state.status = 'idle';
    }
  },
  extraReducers: (builder) => {
    builder
      // Cases for createCheckoutSession
      .addCase(createCheckoutSession.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(createCheckoutSession.fulfilled, (state) => {
        state.status = "succeeded";
        // The logic (redirection) happens in the component, not the slice.
      })
      .addCase(createCheckoutSession.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.status = "failed";
        state.error = action.payload || "An unknown error occurred.";
      })

      // Cases for createPortalSession
      .addCase(createPortalSession.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(createPortalSession.fulfilled, (state) => {
        state.status = "succeeded";
        // The logic (redirection) happens in the component, not the slice.
      })
      .addCase(createPortalSession.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.status = "failed";
        state.error = action.payload || "An unknown error occurred.";
      });
  },
});

export const { clearSubscriptionError } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;