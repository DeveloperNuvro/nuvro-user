import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/api/axios';
import { ISupportTicket } from './supportTicketSlice'; 

interface AgentTicketState {
  tickets: ISupportTicket[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

const initialState: AgentTicketState = {
  tickets: [],
  status: 'idle',
  error: null,
  total: 0,
  totalPages: 0,
  currentPage: 1,
  limit: 10,
};

export const fetchAgentTickets = createAsyncThunk<
  { tickets: ISupportTicket[]; pagination: { page: number; limit: number; total: number; pages: number } },
  { page?: number; limit?: number; status?: string; priority?: string; searchQuery?: string },
  { rejectValue: string }
>(
  'agentTickets/fetchAgentTickets',
  async (params, thunkAPI) => {
    try {
      const response = await api.get('/api/v1/tickets/agent', { params });
      return response.data.data; 
    } catch (error: any) {
      console.error('Error in fetchAgentTickets thunk:', error.response?.data || error.message);
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to fetch your tickets');
    }
  }
);

const agentTicketSlice = createSlice({
  name: 'agentTickets',
  initialState,
  reducers: {
    resetAgentTickets: (state) => {
      state.tickets = [];
      state.status = 'idle';
      state.currentPage = 1;
      state.totalPages = 0;
      state.total = 0;
      state.error = null;
    },
    // --- FIX: THIS ACTION IS NEEDED FOR CORRECT PAGINATION ---
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAgentTickets.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAgentTickets.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.tickets = action.payload.tickets;
        state.total = action.payload.pagination.total;
        state.totalPages = action.payload.pagination.pages;
        state.currentPage = action.payload.pagination.page;
        state.limit = action.payload.pagination.limit;
      })
      .addCase(fetchAgentTickets.rejected, (state, action) => {
        state.status = 'failed';
        state.tickets = []; 
        state.error = action.payload as string;
      });
  },
});

export const { resetAgentTickets, setCurrentPage } = agentTicketSlice.actions;

export default agentTicketSlice.reducer;