import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/api/axios";

// --- INTERFACES ---

// For the chat list (with message previews)
interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    preview: string;
    latestMessageTimestamp?: string;
}

// NEW: For the customer table/directory
interface CustomerTableRow {
    id: string;
    name: string;
    email: string;
    phone: string;
    createdAt: string;
}

interface Message {
    from: string;
    time: string;
    text: string;
    sentBy: "user" | "bot" | "human";
}

// --- STATE INTERFACE ---

interface ChatInboxState {
    customers: Customer[]; // For the main chat list
    chatData: {
        [customerId: string]: Message[];
    };
    // State for the paginated customer directory/table
    customerTable: {
        list: CustomerTableRow[],
        totalPages: number,
        currentPage: number,
        status: "idle" | "loading" | "succeeded" | "failed"; // Status specific to the table
        error: string | null;
    },
    // General status for other operations like fetching messages
    status: "idle" | "loading" | "succeeded" | "failed";
    error: string | null;
    currentPage: number; // For the chat list pagination
    totalPages: number;  // For the chat list pagination
    hasMore: boolean;    // For the chat list pagination
}

// --- INITIAL STATE ---

const initialState: ChatInboxState = {
    customers: [],
    chatData: {},
    customerTable: {
        list: [],
        totalPages: 1,
        currentPage: 1,
        status: "idle",
        error: null,
    },
    status: "idle",
    error: null,
    currentPage: 1,
    totalPages: 1,
    hasMore: true,
};

// --- ASYNC THUNKS ---

// This thunk is for the chat list on the left side
export const fetchCustomersByBusiness = createAsyncThunk<
    { page: number; customers: Customer[]; totalPages: number },
    { businessId: string; page: number; searchQuery?: string },
    { rejectValue: string }
>(
    "chatInbox/fetchCustomersByBusiness",
    async ({ businessId, page, searchQuery }, thunkAPI) => {
        try {
            const res = await api.get("/api/v1/customer/by-business", {
                params: { businessId, page, limit: 10, search: searchQuery || "" },
            });
            const rawData = res.data.data;
            const customers = rawData.data.map((c: any) => ({
                id: c._id,
                name: c.name || "Unknown",
                email: c.email || "",
                phone: c.phone || "",
                preview: c.latestMessage || "",
                latestMessageTimestamp: c.latestMessageTimestamp || null,
            }));
            const totalPages = rawData.pagination?.totalPages || 1;
            return { page, customers, totalPages };
        } catch (error: any) {
            return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to fetch customers");
        }
    }
);

/// =========================================================================
// --- CORRECTED ASYNC THUNK TO FETCH PAGINATED CUSTOMER DATA FOR THE TABLE ---
// =========================================================================
export const fetchCustomersForTable = createAsyncThunk<
    // This is the shape of the successful return value
    { customers: CustomerTableRow[], totalPages: number, currentPage: number },
    // These are the arguments passed to the thunk
    { businessId: string; page: number; limit?: number, searchQuery?: string },
    { rejectValue: string }
>(
    "chatInbox/fetchCustomersForTable",
    async ({ businessId, page, limit = 10, searchQuery }, thunkAPI) => {
        try {
            // This API call is correct
            const res = await api.get('/api/v1/customer/all-customers', {
                params: { businessId, page, limit, search: searchQuery },
            });

            // FIX: Access the nested 'data' object from the sendSuccess response
            const responsePayload = res.data.data;

            // FIX: Map over the correct array: responsePayload.data
            const customers: CustomerTableRow[] = responsePayload.data.map((c: any) => ({
                id: c._id,
                name: c.name,
                email: c.email,
                phone: c.phone,
                createdAt: c.createdAt,
            }));

            return {
                customers,
                // FIX: Access pagination from the correct object: responsePayload.pagination
                totalPages: responsePayload.pagination.totalPages,
                currentPage: responsePayload.pagination.currentPage
            };

        } catch (error: any) {
            // A good practice for debugging this in the future:
            console.error("API Error in fetchCustomersForTable:", error.response?.data || error.message);
            return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to fetch customer table data");
        }
    }
);


// Other thunks (fetchMessagesByCustomer, sendHumanMessage) remain the same...
export const fetchMessagesByCustomer = createAsyncThunk<
    { customerId: string; messages: Message[]; page: number },
    { customerId: string; page: number },
    { rejectValue: string }
>("chatInbox/fetchMessagesByCustomer", async ({ customerId, page }, thunkAPI) => {
    try {
        const res = await api.get(`/api/v1/customer/messages/${customerId}`, {
            params: { page, limit: 20 },
        });
        const formatted = res?.data.data.data.map((msg: any) => ({
            from: msg.sender === "agent" ? "You" : msg.sender === "human" ? "Human" : "Customer",
            time: msg.timestamp,
            text: msg.message,
            sentBy: msg.sender === "agent" ? "bot" : msg.sender,
        }));
        return { customerId, messages: formatted, page };
    } catch (error: any) {
        return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to fetch messages");
    }
});
export const sendHumanMessage = createAsyncThunk<void, { businessId: string; customerId: string; message: string; senderSocketId: string; }, { rejectValue: string }>("chatInbox/sendHumanMessage", async (payload, thunkAPI) => { try { await api.post('/api/v1/messages/send-human', payload); } catch (error: any) { return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to send message"); } });


// --- SLICE DEFINITION ---

const chatInboxSlice = createSlice({
    name: "chatInbox",
    initialState,
    reducers: {
        // Your existing reducers are correct
        addRealtimeMessage: (state, action) => {
            const { customerId, message } = action.payload;
            const existingMessages = state.chatData[customerId] || [];
            state.chatData[customerId] = [...existingMessages, message];

            const customerIndex = state.customers.findIndex(c => c.id === customerId);
            if (customerIndex !== -1) {
                const updatedCustomer = {
                    ...state.customers[customerIndex],
                    preview: message.text,
                    latestMessageTimestamp: message.time,
                };
                state.customers = [
                    updatedCustomer,
                    ...state.customers.slice(0, customerIndex),
                    ...state.customers.slice(customerIndex + 1),
                ];
            }
        },
        addNewCustomer: (state, action) => {
            const customer: Customer = action.payload;
            const exists = state.customers.some((c) => c.id === customer.id);
            if (!exists) {
                state.customers.unshift(customer);
            }
        }
    },
    extraReducers: (builder) => {
        builder
            // Cases for fetchCustomersByBusiness (for chat list)
            .addCase(fetchCustomersByBusiness.pending, (state) => {
                state.status = "loading";
            })
            .addCase(fetchCustomersByBusiness.fulfilled, (state, action) => {
                const { customers, page, totalPages } = action.payload;
                if (page === 1) {
                    state.customers = customers;
                } else {
                    const existingIds = new Set(state.customers.map(c => c.id));
                    const newCustomers = customers.filter(c => !existingIds.has(c.id));
                    state.customers.push(...newCustomers);
                }
                state.currentPage = page;
                state.totalPages = totalPages;
                state.hasMore = page < totalPages;
                state.status = "succeeded";
            })
            .addCase(fetchCustomersByBusiness.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload || "An unknown error occurred";
            })

            // ================================================================
            // --- NEW REDUCER CASES FOR THE CUSTOMER TABLE ---
            // ================================================================
            .addCase(fetchCustomersForTable.pending, (state) => {
                state.customerTable.status = "loading";
                state.customerTable.error = null;
            })
            .addCase(fetchCustomersForTable.fulfilled, (state, action) => {
                state.customerTable.status = "succeeded";
                state.customerTable.list = action.payload.customers; // Replace the list with the new page's data
                state.customerTable.currentPage = action.payload.currentPage;
                state.customerTable.totalPages = action.payload.totalPages;
            })
            .addCase(fetchCustomersForTable.rejected, (state, action) => {
                state.customerTable.status = "failed";
                state.customerTable.error = action.payload || "Failed to load customers";
            })


            // Other reducer cases (fetchMessagesByCustomer, sendHumanMessage) remain the same...
            .addCase(fetchMessagesByCustomer.pending, (state) => { state.status = "loading"; })
            .addCase(fetchMessagesByCustomer.fulfilled, (state, action) => { state.status = "succeeded"; state.chatData[action.payload.customerId] = action.payload.page === 1 ? action.payload.messages.reverse() : [...action.payload.messages.reverse(), ...state.chatData[action.payload.customerId] || []]; })
            .addCase(fetchMessagesByCustomer.rejected, (state, action) => { state.status = "failed"; state.error = action.payload || "An unknown error occurred"; })
            .addCase(sendHumanMessage.pending, (state) => { state.status = "loading"; })
            .addCase(sendHumanMessage.fulfilled, (state) => { state.status = "succeeded"; })
            .addCase(sendHumanMessage.rejected, (state, action) => { state.status = "failed"; state.error = action.payload || "Message could not be sent."; });
    },
});

export const { addRealtimeMessage, addNewCustomer } = chatInboxSlice.actions;
export default chatInboxSlice.reducer;