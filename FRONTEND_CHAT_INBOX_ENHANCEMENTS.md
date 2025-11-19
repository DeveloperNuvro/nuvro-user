# Frontend Chat Inbox Enhancements

## Implementation Guide

This document outlines the changes needed to implement the new chat inbox features on the frontend.

## 1. Update ConversationInList Interface ✅
- Added: `unreadCount`, `priority`, `tags`, `notes`, `firstResponseAt`, `lastAgentResponseAt`, `customerLastSeenAt`
- Location: `/src/features/chatInbox/chatInboxSlice.ts`

## 2. Update ChatInbox Component

### A. Add New Imports
```typescript
import { 
  AlertCircle, // For priority indicators
  Tag, // For tags
  FileText, // For notes
  Clock, // For response time
  CheckCircle2, // For read receipts
  Circle, // For priority dots
} from "lucide-react";
```

### B. Add State for Quick Actions
```typescript
const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
const [notesDialogOpen, setNotesDialogOpen] = useState(false);
const [assignDialogOpen, setAssignDialogOpen] = useState(false);
```

### C. Add Helper Functions

#### Priority Color Helper
```typescript
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'bg-red-500';
    case 'high': return 'bg-orange-500';
    case 'normal': return 'bg-blue-500';
    case 'low': return 'bg-gray-400';
    default: return 'bg-blue-500';
  }
};
```

#### Mark as Read Function
```typescript
const handleMarkAsRead = async (conversationId: string) => {
  try {
    await api.post(`/api/v1/customer/conversations/${conversationId}/mark-read`);
    // Update local state
    dispatch(updateConversationStatus({
      customerId: currentConversation?.customer.id || '',
      status: currentConversation?.status || 'ai_only',
      assignedAgentId: currentConversation?.assignedAgentId,
    }));
  } catch (error) {
    console.error('Failed to mark as read:', error);
  }
};
```

### D. Update Conversation List Item

Add to the conversation item (around line 525-572):

1. **Unread Count Badge** - After customer name
2. **Priority Indicator** - Color-coded dot
3. **Tags Display** - Below customer name
4. **Notes Icon** - If notes exist

### E. Add Real-time Event Listeners

In `useEffect` hook, add Socket.IO listeners:

```typescript
useEffect(() => {
  const socket = getSocket();
  if (!socket || !businessId) return;

  // Listen for conversation updates
  socket.on('conversationUpdated', (data: any) => {
    const { conversationId, unreadCount, priority, tags, notes, assignedAgentId, status } = data;
    
    // Update conversation in Redux store
    dispatch(updateConversationStatus({
      customerId: conversations.find(c => c.id === conversationId)?.customer.id || '',
      status: status || conversations.find(c => c.id === conversationId)?.status || 'ai_only',
      assignedAgentId: assignedAgentId,
    }));
    
    // Update local conversation list
    // You may need to add a new Redux action for this
  });

  socket.on('conversationAssigned', (data: any) => {
    // Handle assignment update
  });

  socket.on('conversationClosed', (data: any) => {
    // Handle conversation closed
  });

  return () => {
    socket.off('conversationUpdated');
    socket.off('conversationAssigned');
    socket.off('conversationClosed');
  };
}, [businessId, conversations, dispatch]);
```

### F. Mark as Read When Conversation Opens

```typescript
useEffect(() => {
  if (selectedCustomer && currentConversation?.id && currentConversation?.unreadCount > 0) {
    handleMarkAsRead(currentConversation.id);
  }
}, [selectedCustomer, currentConversation?.id]);
```

### G. Add Quick Actions Menu

Add new menu items to the existing DropdownMenu (around line 656):

- Set Priority
- Add/Edit Tags
- Add/Edit Notes
- Assign to Agent (if not already assigned)

### H. Add Priority/Tags/Notes Dialogs

Create dialog components for:
- Priority selector (urgent, high, normal, low)
- Tags editor (add/remove tags)
- Notes editor (textarea)

## 3. API Integration

### Endpoints to Use:
- `POST /api/v1/customer/conversations/:id/mark-read` - Mark as read
- `PATCH /api/v1/customer/conversations/:id/priority` - Update priority
- `PATCH /api/v1/customer/conversations/:id/tags` - Update tags
- `PATCH /api/v1/customer/conversations/:id/notes` - Update notes
- `POST /api/v1/customer/conversations/:id/assign` - Assign to agent

## 4. Redux Actions

Add new actions to `chatInboxSlice.ts`:

```typescript
updateConversationEnhanced: (state, action: PayloadAction<{
  conversationId: string;
  unreadCount?: number;
  priority?: string;
  tags?: string[];
  notes?: string;
}>) => {
  const { conversationId, unreadCount, priority, tags, notes } = action.payload;
  const convoIndex = state.conversations.findIndex(c => c.id === conversationId);
  if (convoIndex !== -1) {
    if (unreadCount !== undefined) state.conversations[convoIndex].unreadCount = unreadCount;
    if (priority) state.conversations[convoIndex].priority = priority;
    if (tags) state.conversations[convoIndex].tags = tags;
    if (notes !== undefined) state.conversations[convoIndex].notes = notes;
  }
}
```

## 5. UI Components to Add

### Priority Badge Component
```tsx
const PriorityBadge = ({ priority }: { priority: string }) => {
  const color = getPriorityColor(priority);
  return (
    <Tooltip>
      <TooltipTrigger>
        <Circle className={cn("h-2 w-2", color)} fill="currentColor" />
      </TooltipTrigger>
      <TooltipContent>
        <p>Priority: {priority}</p>
      </TooltipContent>
    </Tooltip>
  );
};
```

### Tags Display Component
```tsx
const TagsDisplay = ({ tags }: { tags: string[] }) => {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {tags.map((tag, i) => (
        <span key={i} className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
          {tag}
        </span>
      ))}
    </div>
  );
};
```

## 6. Visual Design

### Unread Count Badge
- Red circular badge with white text
- Position: Top-right of conversation item
- Show only if `unreadCount > 0`

### Priority Indicator
- Color-coded dot (red=urgent, orange=high, blue=normal, gray=low)
- Position: Left of customer name or as a border accent

### Tags
- Small colored pills below customer name
- Max 3 visible, "+X more" if more exist

### Notes Icon
- FileText icon if notes exist
- Position: Right side of conversation item
- Tooltip shows note preview

## 7. Response Time Display

Show response time in conversation header:
- "Responded in 2m" if `firstResponseAt` exists
- "Overdue 5m" if no response and time > SLA threshold

## Next Steps

1. ✅ Update interface
2. ⏳ Add imports and state
3. ⏳ Update conversation list item UI
4. ⏳ Add real-time event listeners
5. ⏳ Add mark as read functionality
6. ⏳ Add quick actions dialogs
7. ⏳ Add Redux actions for updates
8. ⏳ Test all features

