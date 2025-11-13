// src/features/whatsappIntregation/integrationsSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/api/axios";
import { unipileApi } from "@/api/unipileApi";
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
>('integrations/fetchStatus', async (_, _thunkAPI) => {
    try {
        // Try multiple possible endpoints for integration status
        const endpoints = [
            '/api/v1/integrations/status',
            '/api/v1/whatsapp/status',
            '/api/v1/unipile/status'
        ];
        
        let response;
        
        for (const endpoint of endpoints) {
            try {
                console.log(`🔍 Trying status endpoint: ${endpoint}`);
                response = await api.get(endpoint);
                console.log(`✅ Success with status endpoint: ${endpoint}`);
                break;
            } catch (error: any) {
                console.log(`⚠️ Failed with status endpoint ${endpoint}:`, error.response?.status);
            }
        }
        
        if (!response) {
            // If all endpoints fail, return a default status
            console.log('ℹ️ All status endpoints failed, returning default status');
            return {
                whatsapp: { active: false, phoneNumber: null },
                unipile: { connections: 0, active: 0 }
            };
        }
        
        return response.data.data || response.data;
    } catch (error: any) {
        console.error('❌ All status endpoints failed:', error);
        // Return default status instead of rejecting
        return {
            whatsapp: { active: false, phoneNumber: null },
            unipile: { connections: 0, active: 0 }
        };
    }
});

// Thunk to activate WhatsApp is now simpler
export const activateWhatsApp = createAsyncThunk<
    { phoneNumber: string },
    { businessId: string },
    { rejectValue: string }
>('integrations/activateWhatsApp', async (payload, thunkAPI) => {
    try {
        console.log('🚀 Activating WhatsApp with payload:', payload);
        
        // Use Unipile API for WhatsApp activation
        const unipilePayload = {
            connector: "whatsapp",
            name: "WhatsApp Business Integration"
        };
        
        console.log('🔗 Creating WhatsApp connection via Unipile API:', unipilePayload);
        const response = await unipileApi.post("/accounts", unipilePayload);
        console.log('📡 WhatsApp activation response:', response.data);
        
        const responseData = response.data;
        console.log('📋 Unipile WhatsApp response data:', responseData);
        
        // Save WhatsApp connection to backend with correct webhook URL
        try {
            console.log('💾 Saving WhatsApp connection to backend...');
            const backendPayload = {
                platform: 'whatsapp',
                name: 'WhatsApp Business Integration',
                connectionId: responseData.id || responseData.account_id,
                credentials: {}, // Add empty credentials object
                status: 'active', // Use 'active' instead of 'pending'
                webhookUrl: `${import.meta.env.VITE_API_BASE_URL}/api/v1/unipile/webhook`, // Correct webhook URL
                businessId: payload.businessId,
            };
            
            console.log('💾 WhatsApp backend payload:', backendPayload);
            
            // Save to backend - use the correct endpoint that exists
            const backendResponse = await api.post('/api/v1/unipile/connections', backendPayload);
            console.log('💾 WhatsApp backend save response:', backendResponse.data);
            
        } catch (backendError: any) {
            console.error('⚠️ Failed to save WhatsApp connection to backend:', backendError);
            // Don't fail the whole operation if backend save fails
        }

        // Handle Unipile hosted auth wizard response
        if (responseData?.auth_url) {
            console.log('🔗 Opening Unipile WhatsApp auth URL:', responseData.auth_url);
            window.open(responseData.auth_url, '_blank');
            toast.success("WhatsApp activation initiated! Please complete authentication in the new window.");
            return { phoneNumber: 'pending' };
        } else if (responseData?.checkpoint?.type === 'QRCODE' && responseData?.checkpoint?.qrcode) {
            console.log('📱 QR Code received for WhatsApp authentication');
            toast.success("WhatsApp activation initiated! Please scan the QR code to complete setup.");
            return { phoneNumber: 'pending' };
        } else if (responseData?.id) {
            // Direct connection created successfully
            toast.success("WhatsApp activated successfully!");
            return { phoneNumber: 'pending' };
        } else {
            // Fallback
            toast.success("WhatsApp activation initiated!");
            return { phoneNumber: 'pending' };
        }

    } catch (err: any) {
        console.error('❌ WhatsApp activation failed:', err);
        console.error('❌ Error response:', err.response?.data);
        console.error('❌ Error status:', err.response?.status);

        let errorMessage = "Failed to activate WhatsApp";
        if (err.response?.status === 400) {
            errorMessage = err.response.data.message || 'Invalid request data. Please check the payload format.';
        } else if (err.response?.status === 401) {
            errorMessage = 'Unauthorized. Please check your Unipile API key.';
        } else if (err.response?.status === 403) {
            errorMessage = 'Forbidden. Insufficient permissions for WhatsApp integration.';
        } else if (err.response?.status === 404) {
            errorMessage = 'WhatsApp connector not found. Please check if WhatsApp is supported.';
        } else if (err.response?.status === 409) {
            errorMessage = 'WhatsApp connection already exists.';
        } else if (err.response?.status === 500) {
            errorMessage = 'Unipile server error. Please try again later.';
        } else if (err.response?.data?.message) {
            errorMessage = err.response.data.message;
        }
        
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