import { createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import { api } from '@/api/axios';
import { ISupportTicket } from './supportTicketSlice'; 


interface AgentTicketState {
  tickets: ISupportTicket[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  totalPages: number;
  currentPage: number;
}


const initialState: AgentTicketState = {
  tickets: [],
  status: 'idle',
  error: null,
  totalPages: 1,
  currentPage: 1,
};


export const fetchAgentTickets = createAsyncThunk<
  { data: ISupportTicket[]; pagination: { totalPages: number; currentPage: number } },
  { page?: number; limit?: number; status?: string; priority?: string; searchQuery?: string },
  { rejectValue: string }
>(
  'agentTickets/fetchAgentTickets',
  async (params, thunkAPI) => {
    try {
      
      const response = await api.get('/api/v1/tickets/my-tickets', { params });
      return response.data.data; 
    } catch (error: any) {
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
      state.totalPages = 1;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAgentTickets.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAgentTickets.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.tickets = action.payload.data;
        state.totalPages = action.payload.pagination.totalPages;
        state.currentPage = action.payload.pagination.currentPage;
      })
      .addCase(fetchAgentTickets.rejected, (state, action) => {
        state.status = 'failed';
        state.tickets = []; 
        state.error = action.payload as string;
      });
  },
});

export const { resetAgentTickets } = agentTicketSlice.actions;

export default agentTicketSlice.reducer;