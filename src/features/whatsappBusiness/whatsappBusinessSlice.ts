import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/axios';

export type ChannelMode = 'human_only' | 'hybrid' | 'ai_only';
export type ChannelFallbackBehavior = 'route_to_ai' | 'assign_to_human' | 'create_ticket';

export interface WhatsAppBusinessConnection {
  connectionId: string;
  phoneNumberId: string;
  phoneNumber: string;
  connectionName: string;
  status: 'pending' | 'active' | 'inactive' | 'error' | 'connected';
  agentId?: string;
  mode?: ChannelMode;
  defaultFlowId?: string | null;
  workingHours?: Record<string, unknown> | null;
  outsideHoursBehavior?: Record<string, unknown> | null;
  fallbackBehavior?: ChannelFallbackBehavior;
  metadata?: {
    phoneNumber?: string;
    displayName?: string;
    qualityRating?: string;
    verifiedName?: string;
    accountMode?: string;
    [key: string]: any;
  };
  connectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWhatsAppConnectionRequest {
  phoneNumberId: string;
  phoneNumber: string;
  businessAccountId: string;
  accessToken: string;
  appId?: string;
  appSecret?: string;
  connectionName?: string;
  agentId?: string;
  apiVersion?: string;
}

export interface WhatsAppBusinessState {
  connections: WhatsAppBusinessConnection[];
  templates: Record<string, WhatsAppTemplate[]>; // connectionId -> templates
  templateLibrary: TemplateLibraryItem[]; // Default templates library
  sessionChecks: Record<string, SessionCheckResult>; // phoneNumber -> session check
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: WhatsAppBusinessState = {
  connections: [],
  templates: {},
  templateLibrary: [],
  sessionChecks: {},
  status: 'idle',
  error: null,
};

// Async thunks
export const fetchWhatsAppConnections = createAsyncThunk(
  'whatsappBusiness/fetchConnections',
  async (agentId: string | undefined, { rejectWithValue: _rejectWithValue }) => {
    try {
      const url = agentId 
        ? `/api/v1/whatsapp-business/connections?agentId=${agentId}`
        : '/api/v1/whatsapp-business/connections';
      const response = await api.get(url);
      
      let connections = [];
      if (Array.isArray(response.data?.data?.connections)) {
        connections = response.data.data.connections;
      } else if (Array.isArray(response.data?.connections)) {
        connections = response.data.connections;
      } else if (Array.isArray(response.data?.data)) {
        connections = response.data.data;
      } else if (Array.isArray(response.data)) {
        connections = response.data;
      }
      
      const mappedConnections = connections.map((conn: any) => {
        let normalizedStatus = (conn.status || 'active').toString().toLowerCase().trim();
        
        const statusMap: Record<string, string> = {
          'connected': 'active',
          'disconnected': 'inactive',
          'failed': 'error',
          'error': 'error',
          'inactive': 'inactive',
          'active': 'active',
          'pending': 'pending'
        };
        
        normalizedStatus = statusMap[normalizedStatus] || normalizedStatus;
        
        return {
          connectionId: conn.connectionId || conn._id?.toString() || conn.id,
          phoneNumberId: conn.phoneNumberId,
          phoneNumber: conn.phoneNumber,
          connectionName: conn.connectionName || conn.name || `WhatsApp Business - ${conn.phoneNumber}`,
          status: normalizedStatus,
          agentId: conn.agentId ? String(conn.agentId) : undefined,
          mode: conn.mode ?? 'hybrid',
          defaultFlowId: conn.defaultFlowId ?? null,
          workingHours: conn.workingHours ?? undefined,
          outsideHoursBehavior: conn.outsideHoursBehavior ?? undefined,
          fallbackBehavior: conn.fallbackBehavior ?? 'route_to_ai',
          metadata: conn.metadata || {},
          connectedAt: conn.connectedAt,
          createdAt: conn.createdAt || conn.created_at,
          updatedAt: conn.updatedAt || conn.updated_at,
        };
      });
      
      return mappedConnections;
    } catch (error: any) {
      return [];
    }
  }
);

export const initiateOAuthFlow = createAsyncThunk(
  'whatsappBusiness/initiateOAuth',
  async (connectionData: { agentId?: string; connectionName?: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/v1/whatsapp-business/connections/oauth/initiate', connectionData);
      
      const responseData = response.data?.data || response.data;
      return responseData;
    } catch (error: any) {
      let errorMessage = 'Failed to initiate OAuth flow';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      return rejectWithValue(errorMessage);
    }
  }
);

export const createWhatsAppConnection = createAsyncThunk(
  'whatsappBusiness/createConnection',
  async (connectionData: CreateWhatsAppConnectionRequest, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/v1/whatsapp-business/connections', connectionData);
      
      const responseData = response.data?.data || response.data;
      return responseData;
    } catch (error: any) {
      let errorMessage = 'Failed to create WhatsApp connection';
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        } else {
          errorMessage = `Invalid connection data: ${errorData?.detail || JSON.stringify(errorData)}`;
        }
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to create connections';
      } else if (error.response?.status === 404) {
        errorMessage = 'Integration service not available. Please contact support.';
      } else if (error.response?.status === 409) {
        errorMessage = 'Connection already exists for this phone number';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

export interface UpdateWhatsAppConnectionUpdates extends Partial<CreateWhatsAppConnectionRequest> {
  mode?: ChannelMode;
  defaultFlowId?: string | null;
  workingHours?: Record<string, unknown> | null;
  outsideHoursBehavior?: Record<string, unknown> | null;
  fallbackBehavior?: ChannelFallbackBehavior;
}
export const updateWhatsAppConnection = createAsyncThunk(
  'whatsappBusiness/updateConnection',
  async ({ connectionId, updates }: { connectionId: string; updates: UpdateWhatsAppConnectionUpdates }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/api/v1/whatsapp-business/connections/${connectionId}`, updates);
      const data = response.data?.data || response.data;
      return {
        connectionId,
        ...data,
      };
    } catch (error: any) {
      let errorMessage = 'Failed to update connection';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteWhatsAppConnection = createAsyncThunk(
  'whatsappBusiness/deleteConnection',
  async (connectionId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/api/v1/whatsapp-business/connections/${connectionId}`);
      return connectionId;
    } catch (error: any) {
      let errorMessage = 'Failed to delete connection';
      if (error.response?.status === 400) {
        errorMessage = 'Invalid connection ID provided';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to delete this connection.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Connection not found. It may have already been deleted.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const getPhoneNumberInfo = createAsyncThunk(
  'whatsappBusiness/getPhoneNumberInfo',
  async (connectionId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/v1/whatsapp-business/connections/${connectionId}/phone-info`);
      return {
        connectionId,
        ...(response.data?.data || response.data)
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get phone number info');
    }
  }
);

export const sendWhatsAppMessage = createAsyncThunk(
  'whatsappBusiness/sendMessage',
  async (messageData: {
    connectionId: string;
    to: string;
    text: string;
    previewUrl?: boolean;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/v1/whatsapp-business/messages/send', messageData);
      return response.data?.data || response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send message');
    }
  }
);

export const sendWhatsAppImage = createAsyncThunk(
  'whatsappBusiness/sendImage',
  async (messageData: {
    connectionId: string;
    to: string;
    imageUrl?: string;
    imageId?: string;
    caption?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/v1/whatsapp-business/messages/send-image', messageData);
      return response.data?.data || response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send image');
    }
  }
);

// 🔧 NEW: Template Management
export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  components: any[];
  createdAt?: string;
}

export const fetchWhatsAppTemplates = createAsyncThunk(
  'whatsappBusiness/fetchTemplates',
  async (connectionId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/v1/whatsapp-business/templates?connectionId=${connectionId}`);
      return {
        connectionId,
        templates: response.data?.data?.templates || response.data?.templates || [],
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch templates');
    }
  }
);

export const createWhatsAppTemplate = createAsyncThunk(
  'whatsappBusiness/createTemplate',
  async (templateData: {
    connectionId: string;
    name: string;
    language: string;
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
    components: any[];
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/v1/whatsapp-business/templates', templateData);
      return {
        connectionId: templateData.connectionId,
        template: response.data?.data?.template || response.data?.template,
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create template');
    }
  }
);

export const deleteWhatsAppTemplate = createAsyncThunk(
  'whatsappBusiness/deleteTemplate',
  async ({ connectionId, templateId }: { connectionId: string; templateId: string }, { rejectWithValue }) => {
    try {
      await api.delete(`/api/v1/whatsapp-business/templates/${templateId}?connectionId=${connectionId}`);
      return { connectionId, templateId };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete template');
    }
  }
);

// 🔧 NEW: Template Library (Default Templates)
export interface TemplateLibraryItem {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  components: any[];
  useCase: string;
  estimatedApprovalTime: string;
}

export const fetchTemplateLibrary = createAsyncThunk(
  'whatsappBusiness/fetchTemplateLibrary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/v1/whatsapp-business/templates/library');
      return response.data?.data?.templates || response.data?.templates || [];
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch template library');
    }
  }
);

export const createTemplateFromLibrary = createAsyncThunk(
  'whatsappBusiness/createTemplateFromLibrary',
  async (data: {
    connectionId: string;
    templateId: string;
    customName?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/v1/whatsapp-business/templates/library/create', data);
      return {
        connectionId: data.connectionId,
        template: response.data?.data?.template || response.data?.template,
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create template from library');
    }
  }
);

// 🔧 NEW: 24-Hour Session Check
export interface SessionCheckResult {
  withinWindow: boolean;
  hoursRemaining: number;
  lastMessageTimestamp: string | null;
  requiresTemplate: boolean;
}

export const check24HourSession = createAsyncThunk(
  'whatsappBusiness/check24HourSession',
  async ({ connectionId, phoneNumber }: { connectionId: string; phoneNumber: string }, { rejectWithValue }) => {
    try {
      const response = await api.get(
        `/api/v1/whatsapp-business/connections/${connectionId}/session-check/${phoneNumber}`
      );
      return {
        connectionId,
        phoneNumber,
        ...(response.data?.data || response.data),
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to check session');
    }
  }
);

const whatsappBusinessSlice = createSlice({
  name: 'whatsappBusiness',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetStatus: (state) => {
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch connections
      .addCase(fetchWhatsAppConnections.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchWhatsAppConnections.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.connections = Array.isArray(action.payload) ? action.payload : [];
        state.error = null;
      })
      .addCase(fetchWhatsAppConnections.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
        state.connections = [];
      })
      
      // Initiate OAuth flow
      .addCase(initiateOAuthFlow.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(initiateOAuthFlow.fulfilled, (state) => {
        state.status = 'succeeded';
        // OAuth URL is returned, will be handled in component
      })
      .addCase(initiateOAuthFlow.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Create connection
      .addCase(createWhatsAppConnection.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createWhatsAppConnection.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload) {
          const newConnection: WhatsAppBusinessConnection = {
            connectionId: action.payload.connectionId || action.payload._id?.toString() || action.payload.id,
            phoneNumberId: action.payload.phoneNumberId,
            phoneNumber: action.payload.phoneNumber,
            connectionName: action.payload.connectionName || action.payload.name,
            status: action.payload.status || 'active',
            agentId: action.payload.agentId ? String(action.payload.agentId) : undefined,
            metadata: action.payload.metadata || {},
            connectedAt: action.payload.connectedAt,
            createdAt: action.payload.createdAt || new Date().toISOString(),
            updatedAt: action.payload.updatedAt || new Date().toISOString(),
          };
          state.connections.push(newConnection);
        }
      })
      .addCase(createWhatsAppConnection.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Update connection
      .addCase(updateWhatsAppConnection.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateWhatsAppConnection.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const connection = state.connections.find(conn => conn.connectionId === action.payload.connectionId);
        if (connection) {
          Object.assign(connection, action.payload);
        }
      })
      .addCase(updateWhatsAppConnection.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Delete connection
      .addCase(deleteWhatsAppConnection.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteWhatsAppConnection.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.connections = state.connections.filter(conn => conn.connectionId !== action.payload);
      })
      .addCase(deleteWhatsAppConnection.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Get phone number info
      .addCase(getPhoneNumberInfo.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getPhoneNumberInfo.fulfilled, (state) => {
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(getPhoneNumberInfo.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Send message
      .addCase(sendWhatsAppMessage.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(sendWhatsAppMessage.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(sendWhatsAppMessage.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Send image
      .addCase(sendWhatsAppImage.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(sendWhatsAppImage.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(sendWhatsAppImage.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Fetch templates
      .addCase(fetchWhatsAppTemplates.fulfilled, (state, action) => {
        state.templates[action.payload.connectionId] = action.payload.templates;
      })
      
      // Create template
      .addCase(createWhatsAppTemplate.fulfilled, (state, action) => {
        if (!state.templates[action.payload.connectionId]) {
          state.templates[action.payload.connectionId] = [];
        }
        state.templates[action.payload.connectionId].push(action.payload.template);
      })
      
      // Delete template
      .addCase(deleteWhatsAppTemplate.fulfilled, (state, action) => {
        const templates = state.templates[action.payload.connectionId] || [];
        state.templates[action.payload.connectionId] = templates.filter(
          t => t.id !== action.payload.templateId
        );
      })
      
      // Fetch template library
      .addCase(fetchTemplateLibrary.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTemplateLibrary.fulfilled, (state, action) => {
        state.templateLibrary = action.payload;
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(fetchTemplateLibrary.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Create template from library
      .addCase(createTemplateFromLibrary.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createTemplateFromLibrary.fulfilled, (state, action) => {
        if (!state.templates[action.payload.connectionId]) {
          state.templates[action.payload.connectionId] = [];
        }
        state.templates[action.payload.connectionId].push(action.payload.template);
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(createTemplateFromLibrary.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Check 24-hour session
      .addCase(check24HourSession.fulfilled, (state, action) => {
        const key = `${action.payload.connectionId}_${action.payload.phoneNumber}`;
        state.sessionChecks[key] = {
          withinWindow: action.payload.withinWindow,
          hoursRemaining: action.payload.hoursRemaining,
          lastMessageTimestamp: action.payload.lastMessageTimestamp,
          requiresTemplate: action.payload.requiresTemplate,
        };
      });
  },
});

export const { clearError, resetStatus } = whatsappBusinessSlice.actions;
export default whatsappBusinessSlice.reducer;

