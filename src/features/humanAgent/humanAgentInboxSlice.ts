// src/features/humanAgent/humanAgentInboxSlice.ts

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/api/axios";
import { ConversationInList } from "../chatInbox/chatInboxSlice";
import { mergeConversationWithSocketHints, normalizeConversationPlatformFields } from "@/utils/conversationUiPlatform";

export type AgentInboxQueueCounts = { mine: number; team: number; unassigned: number; all: number };

// --- STATE INTERFACE ---
interface AgentInboxState {
    conversations: ConversationInList[];
    status: "idle" | "loading" | "succeeded" | "failed";
    error: string | null;
    currentPage: number;
    totalPages: number;
    /** Open counts for All / Mine / Team / Unassigned (API). */
    inboxQueueCounts: AgentInboxQueueCounts | null;
}

// --- INITIAL STATE ---
const initialState: AgentInboxState = {
    conversations: [],
    status: "idle",
    error: null,
    currentPage: 1,
    totalPages: 1,
    inboxQueueCounts: null,
};

// --- ASYNC THUNKS ---
export const fetchAgentConversations = createAsyncThunk<
    {
        page: number;
        conversations: ConversationInList[];
        totalPages: number;
        counts?: AgentInboxQueueCounts;
    },
    {
        page: number;
        searchQuery?: string;
        status: 'open' | 'closed';
        platform?: 'all' | 'whatsapp' | 'instagram' | 'telegram' | 'website';
        inboxView?: 'all' | 'mine' | 'team' | 'unassigned';
        includeCounts?: boolean;
    },
    { rejectValue: string }
>(
    "agentInbox/fetchAgentConversations",
    async ({ page, searchQuery, status, platform, inboxView = 'all', includeCounts = true }, thunkAPI) => {
        try {
            const params: Record<string, string | number | boolean> = {
                page,
                limit: 15,
                search: searchQuery || "",
                status,
                inboxView,
            };
            if (includeCounts) {
                params.includeCounts = true;
            }
            if (platform && platform !== 'all') {
                params.platform = platform;
            }

            const response = await api.get("/api/v1/agents/my-conversations", { params });

            const responsePayload = response.data.data;
            const rawList = responsePayload.data || [];
            const normWaProv = (p: unknown): 'whapi' | 'unipile' | 'meta' | undefined => {
                const s = String(p ?? '').toLowerCase();
                if (s === 'whapi' || s === 'unipile' || s === 'meta') return s;
                return undefined;
            };
            const conversations: ConversationInList[] = rawList.map((c: any) => ({
                ...c,
                id: c.id != null ? String(c.id) : c._id != null ? String(c._id) : '',
                customer: c.customer
                    ? {
                          id:
                              c.customer.id != null
                                  ? String(c.customer.id)
                                  : c.customer._id != null
                                    ? String(c.customer._id)
                                    : '',
                          name: c.customer.name ?? '',
                          ...(c.customer.phone != null && String(c.customer.phone).trim() !== ''
                              ? { phone: String(c.customer.phone).trim() }
                              : {}),
                      }
                    : { id: '', name: '' },
                ...(c.whatsappConnection
                    ? {
                          whatsappConnection: {
                              id: String(c.whatsappConnection.id ?? '').trim(),
                              displayName: c.whatsappConnection.displayName ?? null,
                              ...(normWaProv(c.whatsappConnection.provider)
                                  ? { provider: normWaProv(c.whatsappConnection.provider)! }
                                  : {}),
                          },
                      }
                    : {}),
            }));
            const totalPages = responsePayload.pagination?.totalPages || 1;
            const rawCounts = responsePayload.counts;
            const counts: AgentInboxQueueCounts | undefined =
                rawCounts &&
                typeof rawCounts.mine === 'number' &&
                typeof rawCounts.all === 'number' &&
                typeof rawCounts.unassigned === 'number'
                    ? {
                          mine: rawCounts.mine,
                          team: typeof rawCounts.team === 'number' ? rawCounts.team : 0,
                          unassigned: rawCounts.unassigned,
                          all: rawCounts.all,
                      }
                    : undefined;

            return { page, conversations, totalPages, ...(counts ? { counts } : {}) };
        } catch (error: any) {
            return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to fetch agent conversations");
        }
    }
);

export type CloseAllOpenAgentPayload = {
    closed: number;
    alreadyClosed: number;
    failed: number;
    totalCandidates: number;
};

/** Same scope as GET /agents/my-conversations (open). */
export const closeAllOpenAgentConversations = createAsyncThunk<
    CloseAllOpenAgentPayload,
    void,
    { rejectValue: string }
>("agentInbox/closeAllOpenAgentConversations", async (_, thunkAPI) => {
    try {
        const res = await api.post("/api/v1/agents/close-all-open-conversations", {});
        const d = res.data?.data ?? res.data;
        return {
            closed: Number(d?.closed) || 0,
            alreadyClosed: Number(d?.alreadyClosed) || 0,
            failed: Number(d?.failed) || 0,
            totalCandidates: Number(d?.totalCandidates) || 0,
        };
    } catch (error: any) {
        return thunkAPI.rejectWithValue(
            error.response?.data?.message || "Failed to close all open conversations"
        );
    }
});

const agentInboxSlice = createSlice({
    name: "agentInbox",
    initialState,
    reducers: {
        resetAgentConversations: (state) => {
            state.conversations = [];
            state.currentPage = 1;
            state.totalPages = 1;
            state.status = 'idle';
            state.inboxQueueCounts = null;
        },
        addAssignedConversation: (state, action: PayloadAction<ConversationInList>) => {
            const normalized = normalizeConversationPlatformFields(action.payload);
            const exists = state.conversations.some((c) => c.id === normalized.id);
            if (!exists) {
                state.conversations.unshift(normalized);
            }
        },
        removeConversation: (state, action: PayloadAction<{ conversationId: string }>) => {
            state.conversations = state.conversations.filter(c => c.id !== action.payload.conversationId);
        },
  
        updateConversationPreview: (
            state,
            action: PayloadAction<{
                conversationId: string;
                preview: string;
                latestMessageTimestamp: string;
                conversationSource?: string;
                messageMetadata?: Record<string, unknown> | null;
            }>
        ) => {
            const {
                conversationId,
                preview,
                latestMessageTimestamp,
                conversationSource,
                messageMetadata,
            } = action.payload;
            const conversationIndex = state.conversations.findIndex((c) => c.id === conversationId);

            if (conversationIndex !== -1) {
                const merged = mergeConversationWithSocketHints(state.conversations[conversationIndex], {
                    topLevelSource: conversationSource,
                    metadata: messageMetadata,
                });
                const conversationToUpdate = {
                    ...merged,
                    preview,
                    latestMessageTimestamp,
                };

                const filteredConversations = state.conversations.filter((c) => c.id !== conversationId);

                state.conversations = [conversationToUpdate, ...filteredConversations];
            }
        },
        // 🔧 NEW: Update conversation with enhanced features (unreadCount, priority, tags, notes, etc.)
        updateConversationEnhanced: (state, action: PayloadAction<{ conversationId: string; [key: string]: any }>) => {
            const { conversationId, ...updates } = action.payload;
            const convoIndex = state.conversations.findIndex((c) => c.id === conversationId);
            if (convoIndex !== -1) {
                state.conversations[convoIndex] = normalizeConversationPlatformFields({
                    ...state.conversations[convoIndex],
                    ...updates,
                });
            }
        },
        /** Real-time tab badges (Mine / Team / Unassigned / All) from socket `agentInboxCountsUpdated`. */
        setInboxQueueCountsFromSocket: (state, action: PayloadAction<AgentInboxQueueCounts>) => {
            const c = action.payload;
            if (
                c &&
                typeof c.mine === 'number' &&
                typeof c.team === 'number' &&
                typeof c.unassigned === 'number' &&
                typeof c.all === 'number'
            ) {
                state.inboxQueueCounts = {
                    mine: c.mine,
                    team: c.team,
                    unassigned: c.unassigned,
                    all: c.all,
                };
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAgentConversations.pending, (state) => {
                state.status = "loading";
            })
            .addCase(fetchAgentConversations.fulfilled, (state, action) => {
                const { conversations, page, totalPages, counts } = action.payload;
                state.conversations = conversations.map(normalizeConversationPlatformFields);
                state.currentPage = page;
                state.totalPages = totalPages;
                if (counts) {
                    state.inboxQueueCounts = counts;
                }
                state.status = "succeeded";
            })
            .addCase(fetchAgentConversations.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload || "An error occurred";
            });
    },
});

// --- EXPORT THE NEW ACTION ---
export const {
    addAssignedConversation,
    removeConversation,
    resetAgentConversations,
    updateConversationPreview, // <-- Exported
    updateConversationEnhanced, // 🔧 NEW: Exported
    setInboxQueueCountsFromSocket,
} = agentInboxSlice.actions;

export default agentInboxSlice.reducer;