// src/features/chatInbox/chatInboxSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/api/axios";

interface Message {
    from: string;
    time: string;
    text: string;
    sentBy: "user" | "bot" | "human";
}

interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    preview: string;
    latestMessageTimestamp?: string;
}

interface ChatInboxState {
    customers: Customer[];
    chatData: {
        [customerId: string]: Message[];
    };
    customerTable: {
        list: Customer[],
        totalPages: number,
        currentPage: number,
    },
    totalPages: number;
    status: "idle" | "loading" | "succeeded" | "failed";
    error: string | null;
}

const initialState: ChatInboxState = {
    customers: [],
    chatData: {},
    customerTable: {
        list: [],
        totalPages: 1,
        currentPage: 1,
    },
    totalPages: 1,
    status: "idle",
    error: null,
};

// ⏬ Fetch all customers for a business
export const fetchCustomersByBusiness = createAsyncThunk<
  { page: number; customers: Customer[]; totalPages: number },
  { businessId: string; page: number; searchQuery?: string; context?: "chat" | "table" },
  { rejectValue: string }
>(
  "chatInbox/fetchCustomersByBusiness",
  async ({ businessId, page, searchQuery }, thunkAPI) => {
    try {
      const res = await api.get("/api/v1/customer/by-business", {
        params: { businessId, page, limit: 10, phoneNumber: searchQuery || "" },
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




// ⏬ Fetch all messages by customer

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
        console.log(error)
        return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to fetch messages");
    }
});


const chatInboxSlice = createSlice({
    name: "chatInbox",
    initialState,
    reducers: {
        addRealtimeMessage: (state, action) => {
            const { customerId, message } = action.payload;

            // Append message
            if (!state.chatData[customerId]) {
                state.chatData[customerId] = [];
            }
            state.chatData[customerId].push(message);

            // ✅ Immutably update preview and timestamp
            state.customers = state.customers
                .map((c) =>
                    c.id === customerId
                        ? { ...c, preview: message.text, latestMessageTimestamp: message.time }
                        : c
                )
                .sort(
                    (a, b) =>
                        new Date(b.latestMessageTimestamp || 0).getTime() -
                        new Date(a.latestMessageTimestamp || 0).getTime()
                );


        },

        addNewCustomer: (state, action) => {
            const customer: Customer = action.payload;
            const exists = state.customers.some((c) => c.id === customer.id);
            if (!exists) {
                state.customers.unshift({
                    ...customer,
                    preview: "", // we'll always update this via addRealtimeMessage
                    latestMessageTimestamp: "",
                });
            }
        }



    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCustomersByBusiness.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchCustomersByBusiness.fulfilled, (state, action) => {
                const { customers, page, totalPages } = action.payload;

                // Used by chatInbox (scrollable)
                if (action.meta.arg.context !== "table") {
                    state.customers = page === 1 ? customers : [...state.customers, ...customers];
                }

                // Used by customer table (pagination)
                if (action.meta.arg.context === "table") {
                    state.customerTable = {
                        list: customers,
                        totalPages,
                        currentPage: page,
                    };
                }

                state.status = "succeeded";
            })

            .addCase(fetchCustomersByBusiness.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload || "An unknown error occurred";
            })
            .addCase(fetchMessagesByCustomer.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchMessagesByCustomer.fulfilled, (state, action) => {
                const { customerId, messages, page } = action.payload;
                state.status = "succeeded";
                state.chatData[customerId] = page === 1
                    ? messages.reverse() // First page, reverse so oldest first
                    : [...(state.chatData[customerId] || []), ...messages.reverse()]; // Append older messages at end
            })


            .addCase(fetchMessagesByCustomer.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload || "An unknown error occurred";
            });
    },
});

export const { addRealtimeMessage, addNewCustomer } = chatInboxSlice.actions;
export default chatInboxSlice.reducer;
