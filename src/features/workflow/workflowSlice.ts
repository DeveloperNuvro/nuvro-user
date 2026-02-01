import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  listWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  updateWorkflowTranslations,
  deleteWorkflow,
  seedDemoWorkflow,
  ConversationWorkflow,
  WorkflowStep,
  WorkflowLanguageContent,
} from '@/api/workflowApi';

export type { ConversationWorkflow, WorkflowStep, WorkflowLanguageContent };

interface WorkflowState {
  workflows: ConversationWorkflow[];
  currentWorkflow: ConversationWorkflow | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: WorkflowState = {
  workflows: [],
  currentWorkflow: null,
  status: 'idle',
  error: null,
};

export const fetchWorkflows = createAsyncThunk<
  ConversationWorkflow[],
  { businessId: string; agentId?: string },
  { rejectValue: string }
>('workflow/fetchWorkflows', async ({ businessId, agentId }, { rejectWithValue }) => {
  try {
    return await listWorkflows(businessId, agentId);
  } catch (err: unknown) {
    const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to fetch workflows';
    return rejectWithValue(message);
  }
});

export const fetchWorkflowById = createAsyncThunk<
  ConversationWorkflow,
  { businessId: string; workflowId: string },
  { rejectValue: string }
>('workflow/fetchWorkflowById', async ({ businessId, workflowId }, { rejectWithValue }) => {
  try {
    return await getWorkflow(businessId, workflowId);
  } catch (err: unknown) {
    const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to fetch workflow';
    return rejectWithValue(message);
  }
});

export const createWorkflowThunk = createAsyncThunk<
  ConversationWorkflow,
  {
    businessId: string;
    data: Parameters<typeof createWorkflow>[1];
  },
  { rejectValue: string }
>('workflow/createWorkflow', async ({ businessId, data }, { rejectWithValue }) => {
  try {
    return await createWorkflow(businessId, data);
  } catch (err: unknown) {
    const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create workflow';
    return rejectWithValue(message);
  }
});

export const updateWorkflowThunk = createAsyncThunk<
  ConversationWorkflow,
  {
    businessId: string;
    workflowId: string;
    data: Parameters<typeof updateWorkflow>[2];
  },
  { rejectValue: string }
>('workflow/updateWorkflow', async ({ businessId, workflowId, data }, { rejectWithValue }) => {
  try {
    return await updateWorkflow(businessId, workflowId, data);
  } catch (err: unknown) {
    const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update workflow';
    return rejectWithValue(message);
  }
});

export const updateWorkflowTranslationsThunk = createAsyncThunk<
  ConversationWorkflow,
  {
    businessId: string;
    workflowId: string;
    translations: Record<string, WorkflowLanguageContent>;
  },
  { rejectValue: string }
>('workflow/updateTranslations', async ({ businessId, workflowId, translations }, { rejectWithValue }) => {
  try {
    return await updateWorkflowTranslations(businessId, workflowId, translations);
  } catch (err: unknown) {
    const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update translations';
    return rejectWithValue(message);
  }
});

export const deleteWorkflowThunk = createAsyncThunk<
  string,
  { businessId: string; workflowId: string },
  { rejectValue: string }
>('workflow/deleteWorkflow', async ({ businessId, workflowId }, { rejectWithValue }) => {
  try {
    await deleteWorkflow(businessId, workflowId);
    return workflowId;
  } catch (err: unknown) {
    const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete workflow';
    return rejectWithValue(message);
  }
});

export const seedDemoWorkflowThunk = createAsyncThunk<
  { created?: boolean; updated?: boolean; workflowId: string },
  { businessId: string; agentId: string },
  { rejectValue: string }
>('workflow/seedDemoWorkflow', async ({ businessId, agentId }, { rejectWithValue }) => {
  try {
    return await seedDemoWorkflow(businessId, agentId);
  } catch (err: unknown) {
    const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to seed demo workflow';
    return rejectWithValue(message);
  }
});

const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    clearCurrentWorkflow(state) {
      state.currentWorkflow = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkflows.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchWorkflows.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.workflows = action.payload;
        state.error = null;
      })
      .addCase(fetchWorkflows.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? null;
      })
      .addCase(fetchWorkflowById.fulfilled, (state, action) => {
        state.currentWorkflow = action.payload;
      })
      .addCase(createWorkflowThunk.fulfilled, (state, action) => {
        state.workflows.unshift(action.payload);
      })
      .addCase(updateWorkflowThunk.fulfilled, (state, action) => {
        const idx = state.workflows.findIndex((w) => w._id === action.payload._id);
        if (idx >= 0) state.workflows[idx] = action.payload;
        if (state.currentWorkflow?._id === action.payload._id) state.currentWorkflow = action.payload;
      })
      .addCase(updateWorkflowTranslationsThunk.fulfilled, (state, action) => {
        const idx = state.workflows.findIndex((w) => w._id === action.payload._id);
        if (idx >= 0) state.workflows[idx] = action.payload;
        if (state.currentWorkflow?._id === action.payload._id) state.currentWorkflow = action.payload;
      })
      .addCase(deleteWorkflowThunk.fulfilled, (state, action) => {
        state.workflows = state.workflows.filter((w) => w._id !== action.payload);
        if (state.currentWorkflow?._id === action.payload) state.currentWorkflow = null;
      })
      .addCase(seedDemoWorkflowThunk.fulfilled, (state) => {
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(seedDemoWorkflowThunk.rejected, (state, action) => {
        state.error = action.payload ?? null;
      });
  },
});

export const { clearCurrentWorkflow } = workflowSlice.actions;
export default workflowSlice.reducer;
