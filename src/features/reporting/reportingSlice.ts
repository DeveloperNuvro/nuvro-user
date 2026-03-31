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

export interface WorkflowAnalyticsBySurfaceRow {
  inboundSurface: string;
  count: number;
}

export interface WorkflowAnalyticsDailyRow {
  date: string;
  count: number;
}

export interface WorkflowAnalyticsDailySurfaceRow {
  date: string;
  inboundSurface: string;
  count: number;
}

/** Workflow step analytics (e.g. user chose "Talk with AI" in chat workflow). */
export interface WorkflowAnalyticsReport {
  range: { start: string; end: string };
  eventType: string;
  totals: { totalEvents: number; uniqueCustomers: number; uniqueConversations: number };
  bySurface: WorkflowAnalyticsBySurfaceRow[];
  daily: WorkflowAnalyticsDailyRow[];
  dailyBySurface: WorkflowAnalyticsDailySurfaceRow[];
}

interface ReportingState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  userPerformance: UserPerformanceReport | null;
  assignments: AssignmentReport | null;
  tickets: TicketReport | null;
  workflowAnalytics: WorkflowAnalyticsReport | null;
}

const initialState: ReportingState = {
  status: 'idle',
  error: null,
  userPerformance: null,
  assignments: null,
  tickets: null,
  workflowAnalytics: null,
};

export type ReportingBundlePayload = {
  userPerformance: UserPerformanceReport;
  assignments: AssignmentReport;
  tickets: TicketReport;
  workflowAnalytics: WorkflowAnalyticsReport;
};

/** Single round-trip load for all reporting tabs (avoids flickering loading state from three parallel thunks). */
export const fetchReportingBundle = createAsyncThunk<
  ReportingBundlePayload,
  { businessId: string; start?: string; end?: string },
  { rejectValue: string }
>('reporting/fetchReportingBundle', async ({ businessId, start, end }, thunkAPI) => {
  try {
    const params: Record<string, string> = {};
    if (start) params.start = start;
    if (end) params.end = end;
    const base = `/api/v1/reporting/business/${businessId}`;
    const [up, asg, tix, wf] = await Promise.all([
      api.get(`${base}/user-performance`, { params }),
      api.get(`${base}/assignments`, { params }),
      api.get(`${base}/tickets`, { params }),
      api.get(`${base}/workflow-analytics`, { params }),
    ]);
    return {
      userPerformance: up.data.data as UserPerformanceReport,
      assignments: asg.data.data as AssignmentReport,
      tickets: tix.data.data as TicketReport,
      workflowAnalytics: wf.data.data as WorkflowAnalyticsReport,
    };
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Failed to load reports');
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
      state.workflowAnalytics = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReportingBundle.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchReportingBundle.fulfilled, (state, action: PayloadAction<ReportingBundlePayload>) => {
        state.status = 'succeeded';
        const up = action.payload.userPerformance;
        const asg = action.payload.assignments;
        const tix = action.payload.tickets;
        state.userPerformance = {
          ...up,
          ai: {
            messages: Number(up?.ai?.messages) || 0,
            conversations: Number(up?.ai?.conversations) || 0,
          },
          agents: Array.isArray(up?.agents) ? up.agents : [],
        };
        const rawTotals = asg?.totals;
        const assignmentTypes: Array<'ai' | 'manual' | 'system'> = ['ai', 'manual', 'system'];
        const totalsNormalized: AssignmentTotalsRow[] = assignmentTypes.map((assignedByType) => {
          const row = rawTotals?.find((r) => r.assignedByType === assignedByType);
          return {
            assignedByType,
            count: Number(row?.count) || 0,
            uniqueConversations: Number(row?.uniqueConversations) || 0,
          };
        });
        state.assignments = {
          ...asg,
          totals: totalsNormalized,
          daily: Array.isArray(asg?.daily) ? asg.daily : [],
          byAgent: Array.isArray(asg?.byAgent) ? asg.byAgent : [],
        };
        const tt = tix?.totals;
        state.tickets = {
          ...tix,
          totals: {
            ai: Number(tt?.ai) || 0,
            human: Number(tt?.human) || 0,
            system: Number(tt?.system) || 0,
            total: Number(tt?.total) || 0,
          },
          legacySample: Array.isArray(tix?.legacySample) ? tix.legacySample : undefined,
        };
        const wfa = action.payload.workflowAnalytics;
        const wft = wfa?.totals;
        state.workflowAnalytics = {
          ...wfa,
          eventType: typeof wfa?.eventType === 'string' ? wfa.eventType : 'talk_with_ai',
          totals: {
            totalEvents: Number(wft?.totalEvents) || 0,
            uniqueCustomers: Number(wft?.uniqueCustomers) || 0,
            uniqueConversations: Number(wft?.uniqueConversations) || 0,
          },
          bySurface: Array.isArray(wfa?.bySurface) ? wfa.bySurface : [],
          daily: Array.isArray(wfa?.daily) ? wfa.daily : [],
          dailyBySurface: Array.isArray(wfa?.dailyBySurface) ? wfa.dailyBySurface : [],
        };
      })
      .addCase(fetchReportingBundle.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Failed to load reports';
      });
  },
});

export const { clearReporting } = reportingSlice.actions;
export default reportingSlice.reducer;

