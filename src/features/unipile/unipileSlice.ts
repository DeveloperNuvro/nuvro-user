import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/axios';

export type ChannelMode = 'human_only' | 'hybrid' | 'ai_only';
export type ChannelFallbackBehavior = 'route_to_ai' | 'assign_to_human' | 'create_ticket';
export type OutsideHoursOption = 'create_ticket' | 'talk_with_ai' | 'wait_for_human';

export interface ChannelWorkingHoursSchedule {
  dayOfWeek: number;
  start: string;
  end: string;
}
export interface ChannelWorkingHours {
  timezone: string;
  enabled: boolean;
  schedule: ChannelWorkingHoursSchedule[];
}
export interface OutsideHoursBehavior {
  showClosedMessage: boolean;
  options: OutsideHoursOption[];
}

export interface UnipileConnection {
  id: string;
  connectionId: string;
  platform: 'whatsapp' | 'instagram' | 'telegram' | 'email' | 'linkedin' | 'google' | 'microsoft' | 'imap' | 'twitter' | 'facebook';
  name: string;
  status: 'active' | 'inactive' | 'error' | 'pending';
  createdAt: string;
  updatedAt: string;
  checkpoint?: {
    type?: string;
    authUrl?: string;
    qrcode?: string;
  };
  /** Conversation Engine: channel config */
  mode?: ChannelMode;
  defaultFlowId?: string | null;
  workingHours?: ChannelWorkingHours | null;
  outsideHoursBehavior?: OutsideHoursBehavior | null;
  fallbackBehavior?: ChannelFallbackBehavior;
}

export interface UnipileCredentials {
  phoneNumber?: string;
  apiKey?: string;
  instagramUsername?: string;
  email?: string;
  [key: string]: any;
}

export interface CreateConnectionRequest {
  platform: 'whatsapp' | 'instagram' | 'telegram' | 'email' | 'linkedin' | 'google' | 'microsoft' | 'imap' | 'twitter' | 'facebook';
  name: string;
  credentials?: UnipileCredentials; // Optional since Unipile handles auth via hosted wizard
  agentId?: string; // 🔧 NEW: Associate connection with specific AI agent
}

export interface PlatformStats {
  conversations: Array<{
    _id: string;
    count: number;
    lastMessage: string;
  }>;
  connections: Record<string, number>;
}

export interface UnipileState {
  connections: UnipileConnection[];
  stats: PlatformStats | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: UnipileState = {
  connections: [],
  stats: null,
  status: 'idle',
  error: null,
};

// Async thunks
export const fetchUnipileConnections = createAsyncThunk(
  'unipile/fetchConnections',
  async (agentId: string | undefined, { rejectWithValue: _rejectWithValue }) => {
    try {
      // 🔧 NEW: Add agentId as query param if provided
      const url = agentId 
        ? `/api/v1/unipile/connections?agentId=${agentId}`
        : '/api/v1/unipile/connections';
      const response = await api.get(url);
      
      let connections = [];
      if (Array.isArray(response.data)) {
        connections = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        connections = response.data.data;
      }
      
      const mappedConnections = connections.map((conn: any) => {
        // Normalize status to lowercase and handle various formats
        let normalizedStatus = (conn.status || 'active').toString().toLowerCase().trim();
        
        // Map common status variations
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
          id: conn.id,
          connectionId: conn.connectionId || conn.id,
          platform: conn.platform?.toLowerCase() || 'unknown',
          name: conn.name || conn.connectionName || `${conn.platform} Connection`,
          status: normalizedStatus,
          createdAt: conn.createdAt || conn.created_at,
          updatedAt: conn.updatedAt || conn.updated_at,
          checkpoint: conn.checkpoint,
          agentId: conn.agentId ? String(conn.agentId) : undefined,
          mode: conn.mode ?? 'hybrid',
          defaultFlowId: conn.defaultFlowId ?? null,
          workingHours: conn.workingHours ?? undefined,
          outsideHoursBehavior: conn.outsideHoursBehavior ?? undefined,
          fallbackBehavior: conn.fallbackBehavior ?? 'route_to_ai',
        };
      });
      
      return mappedConnections;
    } catch (error: any) {
      return [];
    }
  }
);

export const createUnipileConnection = createAsyncThunk(
  'unipile/createConnection',
  async (connectionData: CreateConnectionRequest, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/v1/unipile/connections', {
        platform: connectionData.platform,
        name: connectionData.name,
        credentials: connectionData.credentials || {},
        agentId: connectionData.agentId // 🔧 NEW: Pass agentId to backend
      });
      
      const responseData = response.data.data || response.data;
      return responseData;
    } catch (error: any) {
      let errorMessage = 'Failed to create connection';
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
        errorMessage = 'Connection already exists for this platform';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

export interface UpdateChannelConfigPayload {
  connectionId: string;
  mode?: ChannelMode;
  defaultFlowId?: string | null;
  workingHours?: ChannelWorkingHours | null;
  outsideHoursBehavior?: OutsideHoursBehavior | null;
  fallbackBehavior?: ChannelFallbackBehavior;
}
export const updateUnipileChannelConfig = createAsyncThunk(
  'unipile/updateChannelConfig',
  async (payload: UpdateChannelConfigPayload) => {
    const { connectionId, ...body } = payload;
    const res = await api.patch(`/api/v1/unipile/connections/${connectionId}/config`, body);
    const data = res.data?.data ?? res.data;
    return { connectionId, ...data };
  }
);

export const reconnectUnipileConnection = createAsyncThunk(
  'unipile/reconnectConnection',
  async (connectionId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const connection = state.unipile.connections.find((conn: UnipileConnection) => 
        conn.connectionId === connectionId || conn.id === connectionId
      );
      
      if (!connection) {
        return rejectWithValue('Connection not found');
      }
      
      const reconnectId = connection.connectionId || connection.id;
      const response = await api.post(`/api/v1/unipile/connections/${reconnectId}/reconnect`);
      
      const responseData = response.data.data || response.data;
      return {
        connectionId: reconnectId,
        ...responseData
      };
    } catch (error: any) {
      let errorMessage = 'Failed to reconnect connection';
      if (error.response?.status === 400) {
        errorMessage = 'Invalid connection ID provided';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to reconnect this connection.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Connection not found.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteUnipileConnection = createAsyncThunk(
  'unipile/deleteConnection',
  async (connectionId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const connection = state.unipile.connections.find((conn: UnipileConnection) => 
        conn.connectionId === connectionId || conn.id === connectionId
      );
      
      if (!connection) {
        return rejectWithValue('Connection not found');
      }
      
      const deleteId = connection.connectionId || connection.id;
      await api.delete(`/api/v1/unipile/connections/${deleteId}`);
      
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

export const updateConnectionStatus = createAsyncThunk(
  'unipile/updateConnectionStatus',
  async ({ connectionId, status }: { connectionId: string; status: 'active' | 'inactive' }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const connection = state.unipile.connections.find((conn: UnipileConnection) => 
        conn.connectionId === connectionId || conn.id === connectionId
      );
      
      if (!connection) {
        return rejectWithValue('Connection not found');
      }
      
      const updateId = connection.connectionId || connection.id;
      await api.patch(`/api/v1/unipile/connections/${updateId}/status`, { status });
      
      return { connectionId, status };
    } catch (error: any) {
      let errorMessage = 'Failed to update connection status';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchPlatformStats = createAsyncThunk(
  'unipile/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      // 🔧 FIX: Use correct backend endpoint
      const response = await api.get('/api/v1/unipile/stats');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch platform stats');
    }
  }
);

export const sendManualMessage = createAsyncThunk(
  'unipile/sendManualMessage',
  async (messageData: {
    connectionId: string;
    to: string;
    content: string;
    messageType?: 'text' | 'image' | 'video' | 'audio' | 'document';
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/v1/unipile/messages/send', messageData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send message');
    }
  }
);

export const updateWebhookUrl = createAsyncThunk(
  'unipile/updateWebhookUrl',
  async (connectionId: string, { rejectWithValue }) => {
    try {
      const webhookUrl = `${import.meta.env.VITE_API_BASE_URL}/api/v1/unipile/webhook`;
      const response = await api.patch(`/api/v1/unipile/connections/${connectionId}/webhook`, {
        webhookUrl: webhookUrl
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update webhook URL');
    }
  }
);

export const syncUnipileConnectionsToBackend = createAsyncThunk(
  'unipile/syncToBackend',
  async (_, { rejectWithValue }) => {
    try {
      // 🔧 FIX: Use dedicated sync endpoint that does comprehensive syncing
      const backendResponse = await api.post('/api/v1/unipile/connections/sync');
      
      let connections = [];
      if (Array.isArray(backendResponse.data)) {
        connections = backendResponse.data;
      } else if (backendResponse.data && Array.isArray(backendResponse.data.data)) {
        connections = backendResponse.data.data;
      }
      
      const savedConnections = connections.map((connection: any) => ({
        id: connection.id,
        connectionId: connection.connectionId || connection.id,
        platform: connection.platform?.toLowerCase() || 'unknown',
        name: connection.name || connection.connectionName || `${connection.platform} Connection`,
        status: connection.status || 'active',
        createdAt: connection.createdAt || connection.created_at,
        updatedAt: connection.updatedAt || connection.updated_at,
        checkpoint: connection.checkpoint
      }));
      
      return {
        syncedCount: connections.length,
        connections: savedConnections
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to sync connections');
    }
  }
);

// 🔧 NEW: Get account by ID with full details
export const getAccountById = createAsyncThunk(
  'unipile/getAccountById',
  async (accountId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/v1/unipile/accounts/${accountId}`);
      return response.data.data || response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get account details');
    }
  }
);

// 🔧 NEW: Restart a frozen account
export const restartAccount = createAsyncThunk(
  'unipile/restartAccount',
  async (accountId: string, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/v1/unipile/accounts/${accountId}/restart`);
      return {
        accountId,
        ...(response.data.data || response.data)
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to restart account');
    }
  }
);

// 🔧 NEW: Resend checkpoint notification (2FA/OTP)
export const resendCheckpoint = createAsyncThunk(
  'unipile/resendCheckpoint',
  async ({ accountId, provider }: { accountId: string; provider: 'LINKEDIN' | 'INSTAGRAM' }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/v1/unipile/accounts/checkpoint/resend', {
        account_id: accountId,
        provider
      });
      return {
        accountId,
        provider,
        ...(response.data.data || response.data)
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to resend checkpoint');
    }
  }
);

// 🔧 NEW: Solve checkpoint (2FA/OTP code)
export const solveCheckpoint = createAsyncThunk(
  'unipile/solveCheckpoint',
  async ({ 
    accountId, 
    code, 
    provider 
  }: { 
    accountId: string; 
    code: string; 
    provider: 'LINKEDIN' | 'INSTAGRAM' | 'TWITTER' | 'MESSENGER' 
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/v1/unipile/accounts/checkpoint', {
        account_id: accountId,
        code,
        provider
      });
      return {
        accountId,
        provider,
        ...(response.data.data || response.data)
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to solve checkpoint');
    }
  }
);

// 🔧 NEW: Synchronize account messaging data
export const syncAccount = createAsyncThunk(
  'unipile/syncAccount',
  async ({ 
    accountId, 
    options 
  }: { 
    accountId: string; 
    options?: {
      chunk_size?: number;
      partial?: boolean;
      linkedin_product?: 'MESSAGING' | 'SALES_NAVIGATOR';
      before?: string;
      after?: string;
    }
  }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (options?.chunk_size) params.append('chunk_size', String(options.chunk_size));
      if (options?.partial !== undefined) params.append('partial', String(options.partial));
      if (options?.linkedin_product) params.append('linkedin_product', options.linkedin_product);
      if (options?.before) params.append('before', options.before);
      if (options?.after) params.append('after', options.after);

      const queryString = params.toString();
      const url = `/api/v1/unipile/accounts/${accountId}/sync${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      return {
        accountId,
        ...(response.data.data || response.data)
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to sync account');
    }
  }
);

const unipileSlice = createSlice({
  name: 'unipile',
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
      .addCase(fetchUnipileConnections.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchUnipileConnections.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Ensure payload is always an array
        state.connections = Array.isArray(action.payload) ? action.payload : [];
        state.error = null;
      })
      .addCase(fetchUnipileConnections.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
        // Ensure connections is still an array even on error
        state.connections = [];
      })
      
      // Create connection
      .addCase(createUnipileConnection.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createUnipileConnection.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Add the new connection to the list
        state.connections.push(action.payload);
      })
      .addCase(createUnipileConnection.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(updateUnipileChannelConfig.fulfilled, (state, action) => {
        const { connectionId, mode, defaultFlowId, workingHours, outsideHoursBehavior, fallbackBehavior } = action.payload;
        const conn = state.connections.find((c) => c.id === connectionId || c.connectionId === connectionId);
        if (conn) {
          if (mode !== undefined) conn.mode = mode;
          if (defaultFlowId !== undefined) conn.defaultFlowId = defaultFlowId;
          if (workingHours !== undefined) conn.workingHours = workingHours;
          if (outsideHoursBehavior !== undefined) conn.outsideHoursBehavior = outsideHoursBehavior;
          if (fallbackBehavior !== undefined) conn.fallbackBehavior = fallbackBehavior;
        }
      })
      
      // Reconnect connection
      .addCase(reconnectUnipileConnection.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(reconnectUnipileConnection.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const connection = state.connections.find(conn => 
          conn.connectionId === action.payload.connectionId || conn.id === action.payload.connectionId
        );
        if (connection) {
          connection.status = 'pending';
          if (action.payload.checkpoint) {
            connection.checkpoint = action.payload.checkpoint;
          }
        }
      })
      .addCase(reconnectUnipileConnection.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Delete connection
      .addCase(deleteUnipileConnection.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteUnipileConnection.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.connections = state.connections.filter(conn => conn.connectionId !== action.payload);
      })
      .addCase(deleteUnipileConnection.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Update connection status
      .addCase(updateConnectionStatus.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateConnectionStatus.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const connection = state.connections.find(conn => conn.connectionId === action.payload.connectionId);
        if (connection) {
          connection.status = action.payload.status;
        }
      })
      .addCase(updateConnectionStatus.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Fetch platform stats
      .addCase(fetchPlatformStats.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPlatformStats.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.stats = action.payload;
      })
      .addCase(fetchPlatformStats.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Send manual message
      .addCase(sendManualMessage.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(sendManualMessage.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(sendManualMessage.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Sync connections to backend
      .addCase(syncUnipileConnectionsToBackend.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(syncUnipileConnectionsToBackend.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.connections = Array.isArray(action.payload.connections) ? action.payload.connections : [];
        state.error = null;
      })
      .addCase(syncUnipileConnectionsToBackend.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Get account by ID
      .addCase(getAccountById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getAccountById.fulfilled, (state) => {
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(getAccountById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Restart account
      .addCase(restartAccount.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(restartAccount.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const connection = state.connections.find(conn => 
          conn.connectionId === action.payload.accountId || conn.id === action.payload.accountId
        );
        if (connection) {
          connection.status = 'pending'; // Restarting puts account in pending state
        }
        state.error = null;
      })
      .addCase(restartAccount.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Resend checkpoint
      .addCase(resendCheckpoint.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(resendCheckpoint.fulfilled, (state) => {
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(resendCheckpoint.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Solve checkpoint
      .addCase(solveCheckpoint.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(solveCheckpoint.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const connection = state.connections.find(conn => 
          conn.connectionId === action.payload.accountId || conn.id === action.payload.accountId
        );
        if (connection) {
          connection.status = 'pending'; // Will be updated via webhook when connection completes
        }
        state.error = null;
      })
      .addCase(solveCheckpoint.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Sync account
      .addCase(syncAccount.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(syncAccount.fulfilled, (state) => {
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(syncAccount.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { clearError, resetStatus } = unipileSlice.actions;
export default unipileSlice.reducer;
