import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/axios';

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
  async (_, { rejectWithValue: _rejectWithValue }) => {
    try {
      const response = await api.get('/api/v1/unipile/connections');
      
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
          checkpoint: conn.checkpoint
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
        credentials: connectionData.credentials || {}
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
      const response = await api.get('/api/v1/integrations/unipile/stats');
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
      const backendResponse = await api.get('/api/v1/unipile/connections');
      
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
      });
  },
});

export const { clearError, resetStatus } = unipileSlice.actions;
export default unipileSlice.reducer;
