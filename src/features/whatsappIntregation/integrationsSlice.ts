// src/features/whatsappIntregation/integrationsSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/api/axios";
import { toast } from "react-hot-toast";

// State interfaces remain the same, but without countries
export interface IntegrationState {
    whatsapp: {
        isActive: boolean;
        phoneNumber: string | null;
    };
}

interface IntegrationsSliceState {
    status: "idle" | "loading" | "succeeded" | "failed";
    error: string | null;
    integrations: IntegrationState | null;
}

const initialState: IntegrationsSliceState = {
    status: "idle",
    error: null,
    integrations: null,
};

// --- ASYNC THUNKS ---

export const fetchIntegrationStatus = createAsyncThunk<
    IntegrationState,
    void, // No argument needed if businessId is handled by auth
    { rejectValue: string }
>('integrations/fetchStatus', async (_, thunkAPI) => {
    try {
        // You need to create this endpoint. It should return the AiIntregrations document.
        const response = await api.get('/api/v1/integrations/status');
        return response.data.data;
    } catch (error: any) {
        return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to fetch integration status');
    }
});

// Thunk to activate WhatsApp is now simpler
export const activateWhatsApp = createAsyncThunk<
    { phoneNumber: string },
    { businessId: string }, // Only requires businessId
    { rejectValue: string }
>('integrations/activateWhatsApp', async (payload, thunkAPI) => {
    try {
        // Assuming your backend route for activation is something like this
        const response = await api.post("/api/v1/whatsapp/activate", payload);
        toast.success("WhatsApp activated successfully!");
        return response.data.data;
    } catch (err: any) {
        const errorMessage = err.response?.data?.message || "Failed to activate WhatsApp";
        toast.error(errorMessage);
        return thunkAPI.rejectWithValue(errorMessage);
    }
});

// --- SLICE DEFINITION ---
const integrationsSlice = createSlice({
    name: "integrations",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            // Fetch Status Cases
            .addCase(fetchIntegrationStatus.pending, (state) => {
                state.status = "loading";
            })
            .addCase(fetchIntegrationStatus.fulfilled, (state, action: PayloadAction<IntegrationState>) => {
                state.status = "succeeded";
                state.integrations = action.payload;
                state.error = null;
            })
            .addCase(fetchIntegrationStatus.rejected, (state, action) => {
                state.status = "failed";
                state.integrations = null; // Clear stale data on failure
                state.error = action.payload ?? "An unknown error occurred.";
            })

            // Activate WhatsApp Cases
            .addCase(activateWhatsApp.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(activateWhatsApp.fulfilled, (state, action: PayloadAction<{ phoneNumber: string }>) => {
                state.status = "succeeded";
                // Ensure integrations object exists before updating
                if (!state.integrations) {
                    state.integrations = { whatsapp: { isActive: false, phoneNumber: null } };
                }
                state.integrations.whatsapp.isActive = true;
                state.integrations.whatsapp.phoneNumber = action.payload.phoneNumber;
            })
            .addCase(activateWhatsApp.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload ?? "An unknown error occurred.";
            });
    },
});

export default integrationsSlice.reducer;