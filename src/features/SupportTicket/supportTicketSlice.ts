import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/api/axios';


export enum TicketStatus {
  Open = 'open',
  InProgress = 'in-progress',
  Closed = 'closed',
  OnHold = 'on-hold'
}

export enum TicketType {
  Billing = 'billing',
  Account = 'account',
  Technical = 'technical',
  General = 'general',
  Feedback = 'feedback',
}

export enum TicketPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Urgent = 'urgent'
}



interface PopulatedUser {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface PopulatedBusiness {
  _id: string;
  name: string;
}


export interface ISupportTicket {
  _id: string;
  businessId: string;
  customerId: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type?: TicketType;
  assignedAgent?: string;
  createdAt: string;
  updatedAt: string;

  customerDetails?: PopulatedUser;
  business?: PopulatedBusiness;
  assignedAgentDetails?: PopulatedUser;
}

interface TicketState {
  tickets: ISupportTicket[];
  selectedTicket: ISupportTicket | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

const initialState: TicketState = {
  tickets: [],
  selectedTicket: null,
  status: 'idle',
  error: null,
  total: 0,
  totalPages: 0,
  currentPage: 1,
  limit: 10,
};


export const createTicket = createAsyncThunk<ISupportTicket, {
  businessId: string;
  customerId: string;
  subject: string;
  description: string;
  priority?: string;
  comment?: string;
  role?: string;
  type?: string;
}>(
  'tickets/createTicket',
  async (payload, thunkAPI) => {
    try {
      const response = await api.post('/api/v1/tickets/create', payload);
      return response.data.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to create ticket');
    }
  }
);


export const editTicket = createAsyncThunk<ISupportTicket, {
  id: string;
  subject?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignedAgent?: string;
  resolution?: string;
  comment?: string;
  role?: string;
  type?: string;
}>(
  'tickets/editTicket',
  async (payload, thunkAPI) => {
    try {
      const { id, ...updateData } = payload;
      const response = await api.put(`/api/v1/tickets/edit/${id}`, updateData);
      return response.data.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to update ticket');
    }
  }
);


export const deleteTicket = createAsyncThunk<string, string>(
  'tickets/deleteTicket',
  async (id, thunkAPI) => {
    try {
      await api.delete(`/api/v1/tickets/delete/${id}`);
      return id;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to delete ticket');
    }
  }
);


export const getAllTickets = createAsyncThunk<{
  tickets: ISupportTicket[];
  pagination: { page: number; limit: number; total: number; pages: number };
}, {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  businessId?: string;
  customerId?: string;
  searchQuery?: string;
}>(
  'tickets/getAllTickets',
  async (params, thunkAPI) => {
    try {
      const response = await api.get('/api/v1/tickets', { params });
      console.log('Fetched tickets:', response.data);
      return response.data.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to fetch tickets');
    }
  }
);



export const getTicketById = createAsyncThunk<ISupportTicket, string>(
  'tickets/getTicketById',
  async (id, thunkAPI) => {
    try {
      const response = await api.get(`/api/v1/tickets/${id}`);
      return response.data.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to fetch ticket');
    }
  }
);

const ticketSlice = createSlice({
  name: 'tickets',
  initialState,
  reducers: {
    clearSelectedTicket(state) {
      state.selectedTicket = null;
    },
    setCurrentPage(state, action: PayloadAction<number>) {
      state.currentPage = action.payload;
    },
    setPagination(state, action: PayloadAction<{ page: number; limit: number }>) {
      state.currentPage = action.payload.page;
      state.limit = action.payload.limit;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Ticket
      .addCase(createTicket.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createTicket.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.tickets.push(action.payload);
      })
      .addCase(createTicket.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })

      // Edit Ticket
      .addCase(editTicket.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(editTicket.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.tickets.findIndex(t => t._id === action.payload._id);
        if (index !== -1) state.tickets[index] = action.payload;
        if (state.selectedTicket?._id === action.payload._id) state.selectedTicket = action.payload;
      })
      .addCase(editTicket.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })

      // Delete Ticket
      .addCase(deleteTicket.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteTicket.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.tickets = state.tickets.filter(t => t._id !== action.payload);
        if (state.selectedTicket?._id === action.payload) state.selectedTicket = null;
        // Refetch tickets to ensure consistency
        state.status = 'idle'; // Reset to idle to trigger refetch
      })
      .addCase(deleteTicket.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })

      // Get All Tickets
      .addCase(getAllTickets.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getAllTickets.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.tickets = action.payload.tickets;
        state.total = action.payload.pagination.total;
        state.totalPages = action.payload.pagination.pages;
        state.currentPage = action.payload.pagination.page;
        state.limit = action.payload.pagination.limit;
      })
      .addCase(getAllTickets.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })

      .addCase(getTicketById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getTicketById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.selectedTicket = action.payload;
      })
      .addCase(getTicketById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { clearSelectedTicket, setCurrentPage, setPagination } = ticketSlice.actions;
export default ticketSlice.reducer;