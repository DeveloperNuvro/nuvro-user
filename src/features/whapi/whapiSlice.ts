import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/axios';
import type {
  ChannelMode,
  ChannelFallbackBehavior,
  ChannelWorkingHours,
  OutsideHoursBehavior,
} from '@/features/unipile/unipileSlice';

export interface WhapiConnectionRow {
  id: string;
  whapiChannelId: string;
  connectionName: string;
  status: string;
  agentId?: string;
  webhookUrl?: string;
  mode?: ChannelMode;
  defaultFlowId?: string | null;
  workingHours?: ChannelWorkingHours | null;
  outsideHoursBehavior?: OutsideHoursBehavior | null;
  fallbackBehavior?: ChannelFallbackBehavior;
  metadata?: { phoneNumber?: string; whapiUserName?: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface WhapiProjectOption {
  id: string;
  name?: string;
}

export interface CreateWhapiConnectionRequest {
  name: string;
  projectId?: string;
  agentId?: string;
  /** Optional — Whapi manager API: 7–15 digits only */
  phone?: string;
}

export interface UpdateWhapiChannelConfigPayload {
  connectionId: string;
  mode?: ChannelMode;
  defaultFlowId?: string | null;
  workingHours?: ChannelWorkingHours | null;
  outsideHoursBehavior?: OutsideHoursBehavior | null;
  fallbackBehavior?: ChannelFallbackBehavior;
}

interface WhapiState {
  connections: WhapiConnectionRow[];
  projects: WhapiProjectOption[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  projectsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

function mapConn(raw: Record<string, unknown>): WhapiConnectionRow {
  const id = String(raw._id ?? raw.id ?? '');
  return {
    id,
    whapiChannelId: String(raw.whapiChannelId ?? ''),
    connectionName: String(raw.connectionName ?? 'WhatsApp (Whapi)'),
    status: String(raw.status ?? 'pending'),
    agentId: raw.agentId ? String(raw.agentId) : undefined,
    webhookUrl: raw.webhookUrl ? String(raw.webhookUrl) : undefined,
    mode: raw.mode as ChannelMode | undefined,
    defaultFlowId: raw.defaultFlowId != null ? String(raw.defaultFlowId) : null,
    workingHours: (raw.workingHours as ChannelWorkingHours) ?? null,
    outsideHoursBehavior: (raw.outsideHoursBehavior as OutsideHoursBehavior) ?? null,
    fallbackBehavior: raw.fallbackBehavior as ChannelFallbackBehavior | undefined,
    metadata: raw.metadata as WhapiConnectionRow['metadata'],
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

const initialState: WhapiState = {
  connections: [],
  projects: [],
  status: 'idle',
  projectsStatus: 'idle',
  error: null,
};

function errMsg(e: unknown, fallback: string): string {
  const ax = e as {
    response?: { data?: { message?: string; error?: string | Record<string, unknown> } };
  };
  const d = ax?.response?.data;
  if (typeof d?.message === 'string' && d.message.trim()) return d.message;
  const er = d?.error;
  if (er && typeof er === 'object' && 'message' in er && typeof (er as { message: unknown }).message === 'string') {
    return String((er as { message: string }).message);
  }
  if (typeof d?.error === 'string') return d.error;
  return fallback;
}

export const fetchWhapiConnections = createAsyncThunk('whapi/fetchConnections', async () => {
  const res = await api.get('/api/v1/whapi/connections');
  const raw = res.data?.data?.connections ?? res.data?.connections ?? res.data?.data;
  const list = Array.isArray(raw) ? raw : [];
  return list.map((c: Record<string, unknown>) => mapConn(c));
});

export const fetchWhapiPartnerProjects = createAsyncThunk('whapi/fetchProjects', async () => {
  const res = await api.get('/api/v1/whapi/partner/projects');
  const raw = res.data?.data?.projects ?? res.data?.projects;
  const list = Array.isArray(raw) ? raw : [];
  return list.map((p: { id?: string; name?: string }) => ({
    id: String(p.id ?? ''),
    name: p.name,
  })).filter((p: WhapiProjectOption) => p.id);
});

export const createWhapiConnectionThunk = createAsyncThunk(
  'whapi/createConnection',
  async (body: CreateWhapiConnectionRequest, { rejectWithValue }) => {
    try {
      const res = await api.post('/api/v1/whapi/connections', {
        name: body.name.trim(),
        projectId: body.projectId || undefined,
        agentId: body.agentId || undefined,
        phone: body.phone?.trim() || undefined,
      });
      return res.data?.data ?? res.data;
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Failed to create Whapi connection'));
    }
  }
);

export const deleteWhapiConnectionThunk = createAsyncThunk(
  'whapi/deleteConnection',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/api/v1/whapi/connections/${encodeURIComponent(id)}`);
      return id;
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Failed to delete connection'));
    }
  }
);

export const updateWhapiConnectionNameThunk = createAsyncThunk(
  'whapi/updateName',
  async ({ id, name }: { id: string; name: string }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/api/v1/whapi/connections/${encodeURIComponent(id)}/name`, {
        connectionName: name.trim(),
      });
      const data = res.data?.data ?? res.data;
      return { id, connectionName: String(data?.connectionName ?? name.trim()) };
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Failed to rename connection'));
    }
  }
);

export const updateWhapiChannelConfigThunk = createAsyncThunk(
  'whapi/updateChannelConfig',
  async (payload: UpdateWhapiChannelConfigPayload) => {
    const { connectionId, ...body } = payload;
    const res = await api.patch(`/api/v1/whapi/connections/${encodeURIComponent(connectionId)}/config`, body);
    const data = res.data?.data ?? res.data;
    return { connectionId, ...data };
  }
);

export const syncWhapiWebhooksThunk = createAsyncThunk(
  'whapi/syncWebhooks',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await api.post(`/api/v1/whapi/connections/${encodeURIComponent(id)}/sync-webhooks`);
      return { id, webhookUrl: res.data?.data?.webhookUrl as string | undefined };
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Failed to sync webhooks'));
    }
  }
);

const whapiSlice = createSlice({
  name: 'whapi',
  initialState,
  reducers: {
    clearWhapiError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWhapiConnections.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchWhapiConnections.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.connections = action.payload;
      })
      .addCase(fetchWhapiConnections.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load Whapi connections';
      })
      .addCase(fetchWhapiPartnerProjects.pending, (state) => {
        state.projectsStatus = 'loading';
      })
      .addCase(fetchWhapiPartnerProjects.fulfilled, (state, action) => {
        state.projectsStatus = 'succeeded';
        state.projects = action.payload;
      })
      .addCase(fetchWhapiPartnerProjects.rejected, (state) => {
        state.projectsStatus = 'failed';
      })
      .addCase(createWhapiConnectionThunk.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(createWhapiConnectionThunk.rejected, (state, action) => {
        state.error = (action.payload as string) || 'Create failed';
      })
      .addCase(deleteWhapiConnectionThunk.fulfilled, (state, action) => {
        state.connections = state.connections.filter((c) => c.id !== action.payload);
      })
      .addCase(updateWhapiConnectionNameThunk.fulfilled, (state, action) => {
        const { id, connectionName } = action.payload;
        const c = state.connections.find((x) => x.id === id);
        if (c) c.connectionName = connectionName;
      })
      .addCase(updateWhapiChannelConfigThunk.fulfilled, (state, action) => {
        const p = action.payload as {
          connectionId: string;
          mode?: ChannelMode;
          defaultFlowId?: string | null;
          workingHours?: ChannelWorkingHours | null;
          outsideHoursBehavior?: OutsideHoursBehavior | null;
          fallbackBehavior?: ChannelFallbackBehavior;
        };
        const c = state.connections.find((x) => x.id === p.connectionId);
        if (c) {
          if (p.mode !== undefined) c.mode = p.mode;
          if (p.defaultFlowId !== undefined) c.defaultFlowId = p.defaultFlowId;
          if (p.workingHours !== undefined) c.workingHours = p.workingHours;
          if (p.outsideHoursBehavior !== undefined) c.outsideHoursBehavior = p.outsideHoursBehavior;
          if (p.fallbackBehavior !== undefined) c.fallbackBehavior = p.fallbackBehavior;
        }
      })
      .addCase(syncWhapiWebhooksThunk.fulfilled, (state, action) => {
        const { id, webhookUrl } = action.payload;
        const c = state.connections.find((x) => x.id === id);
        if (c && webhookUrl) c.webhookUrl = webhookUrl;
      });
  },
});

export const { clearWhapiError } = whapiSlice.actions;
export default whapiSlice.reducer;
