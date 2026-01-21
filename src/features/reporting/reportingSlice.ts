import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/api/axios';

export interface UserPerformanceAgentRow {
  agentId: string;
  user: string;
  team: string;
  conversationsAssigned: number;
  conversationsClosed: number;
  uniqueContacts: number;
  messagesSent: number;
}

export interface UserPerformanceReport {
  range: { start: string; end: string };
  ai: { messages: number; conversations: number };
  agents: UserPerformanceAgentRow[];
}

export interface AssignmentTotalsRow {
  assignedByType: 'ai' | 'manual' | 'system';
  count: number;
  uniqueConversations: number;
}

export interface AssignmentDailyRow {
  date: string;
  assignedByType: 'ai' | 'manual' | 'system';
  count: number;
}

export interface AssignmentByAgentRow {
  agentId: string;
  count: number;
}

export interface AssignmentReport {
  range: { start: string; end: string };
  totals: AssignmentTotalsRow[];
  daily: AssignmentDailyRow[];
  byAgent: AssignmentByAgentRow[];
}

export interface TicketReport {
  range: { start: string; end: string };
  totals: { ai: number; human: number; system: number; total: number };
  legacySample?: Array<{ _id: string; subject: string; createdAt: string }>;
}

interface ReportingState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  userPerformance: UserPerformanceReport | null;
  assignments: AssignmentReport | null;
  tickets: TicketReport | null;
}

const initialState: ReportingState = {
  status: 'idle',
  error: null,
  userPerformance: null,
  assignments: null,
  tickets: null,
};

export const fetchUserPerformanceReport = createAsyncThunk<
  UserPerformanceReport,
  { businessId: string; start?: string; end?: string },
  { rejectValue: string }
>('reporting/fetchUserPerformanceReport', async ({ businessId, start, end }, thunkAPI) => {
  try {
    const params: any = {};
    if (start) params.start = start;
    if (end) params.end = end;
    const res = await api.get(`/api/v1/reporting/business/${businessId}/user-performance`, { params });
    return res.data.data;
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Failed to fetch user performance report');
  }
});

export const fetchAssignmentReport = createAsyncThunk<
  AssignmentReport,
  { businessId: string; start?: string; end?: string },
  { rejectValue: string }
>('reporting/fetchAssignmentReport', async ({ businessId, start, end }, thunkAPI) => {
  try {
    const params: any = {};
    if (start) params.start = start;
    if (end) params.end = end;
    const res = await api.get(`/api/v1/reporting/business/${businessId}/assignments`, { params });
    return res.data.data;
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Failed to fetch assignment report');
  }
});

export const fetchTicketReport = createAsyncThunk<
  TicketReport,
  { businessId: string; start?: string; end?: string },
  { rejectValue: string }
>('reporting/fetchTicketReport', async ({ businessId, start, end }, thunkAPI) => {
  try {
    const params: any = {};
    if (start) params.start = start;
    if (end) params.end = end;
    const res = await api.get(`/api/v1/reporting/business/${businessId}/tickets`, { params });
    return res.data.data;
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Failed to fetch ticket report');
  }
});

const reportingSlice = createSlice({
  name: 'reporting',
  initialState,
  reducers: {
    clearReporting: (state) => {
      state.status = 'idle';
      state.error = null;
      state.userPerformance = null;
      state.assignments = null;
      state.tickets = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserPerformanceReport.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchUserPerformanceReport.fulfilled, (state, action: PayloadAction<UserPerformanceReport>) => {
        state.status = 'succeeded';
        state.userPerformance = action.payload;
      })
      .addCase(fetchUserPerformanceReport.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Failed to fetch user performance report';
      })
      .addCase(fetchAssignmentReport.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAssignmentReport.fulfilled, (state, action: PayloadAction<AssignmentReport>) => {
        state.status = 'succeeded';
        state.assignments = action.payload;
      })
      .addCase(fetchAssignmentReport.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Failed to fetch assignment report';
      })
      .addCase(fetchTicketReport.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTicketReport.fulfilled, (state, action: PayloadAction<TicketReport>) => {
        state.status = 'succeeded';
        state.tickets = action.payload;
      })
      .addCase(fetchTicketReport.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Failed to fetch ticket report';
      });
  },
});

export const { clearReporting } = reportingSlice.actions;
export default reportingSlice.reducer;

