// src/pages/ChatInbox.tsx

import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageSquareText, Loader2, User, Ticket, Bot, MoreVertical, ChevronsRight, XCircle, Globe, MessageCircle, Circle, Tag, FileText, Clock, AlertCircle, CheckCircle2, Image as ImageIcon, X, Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";
import relativeTime from "dayjs/plugin/relativeTime";
import 'dayjs/locale/en';
import 'dayjs/locale/es';
import toast from 'react-hot-toast';

import { AppDispatch, RootState } from "@/app/store";
import { api } from "@/api/axios";
import { uploadImage as uploadImageApi, uploadAudio as uploadAudioApi } from "@/api/chatApi";
import {
  fetchCustomersByBusiness,
  fetchMessagesByCustomer,
  sendHumanMessage,
  resetConversations,
  closeConversation,
  updateConversationStatus,
  updateConversationEnhanced,
  addNewCustomer,
  ConversationInList,
} from "@/features/chatInbox/chatInboxSlice";
import { fetchAgentsWithStatus } from "@/features/humanAgent/humanAgentSlice";
import { fetchChannels } from "@/features/channel/channelSlice";
// META WhatsApp Business features – commented out; using Unipile for WhatsApp. Re-enable when Meta API is needed.
// import { 
//   check24HourSession, 
//   fetchWhatsAppTemplates,
//   SessionCheckResult 
// } from "@/features/whatsappBusiness/whatsappBusinessSlice";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getSocket } from "../lib/useSocket"; 
import ChatInboxSkeleton from "@/components/skeleton/ChatInboxSkeleton"; // 1. Import the skeleton
import PlatformBadge from "@/components/custom/unipile/PlatformBadge";
import CountryBadge from "@/components/custom/unipile/CountryBadge";
import FormattedText from "@/components/custom/FormattedText";

dayjs.extend(isToday);
dayjs.extend(isYesterday);
dayjs.extend(relativeTime);

/** Workflow option for system/ask_question messages */
interface WorkflowOption {
  value: string;
  label: string;
}
const SystemMessage = ({ text, workflowOptions, onOptionSelect }: { text: string; workflowOptions?: WorkflowOption[]; onOptionSelect?: (value: string) => void }) => ( 
  <div className="flex flex-col items-center my-4 gap-2">
    <div className="text-center text-xs px-4 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 break-words">
      <FormattedText text={text} />
    </div>
    {Array.isArray(workflowOptions) && workflowOptions.length > 0 && (
      <div className="flex flex-wrap gap-2 justify-center">
        {workflowOptions.map((opt, idx) => (
          <Button
            key={idx}
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl text-xs"
            onClick={() => onOptionSelect?.(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    )}
  </div> 
);
const useDebounce = (value: string, delay: number) => { const [debouncedValue, setDebouncedValue] = useState(value); useEffect(() => { const handler = setTimeout(() => { setDebouncedValue(value); }, delay); return () => { clearTimeout(handler); }; }, [value, delay]); return debouncedValue; };

// 🔧 Helper function to optimize Cloudinary URLs with transformations
const optimizeImageUrl = (url: string | null, maxWidth: number = 800, quality: string = 'auto'): string | null => {
  if (!url) return null;
  
  // If it's a Cloudinary URL, add optimization transformations
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    // Check if transformations already exist
    const uploadIndex = url.indexOf('/upload/');
    const afterUpload = url.substring(uploadIndex + 8); // +8 for '/upload/'
    
    // If transformations don't exist, add them
    if (!afterUpload.includes('q_') && !afterUpload.includes('w_')) {
      // Add transformations: auto quality, auto format, max width, progressive loading, limit crop
      const transformations = `q_${quality},f_auto,w_${maxWidth},c_limit,fl_progressive/`;
      return url.substring(0, uploadIndex + 8) + transformations + afterUpload;
    } else if (afterUpload.includes('q_') && maxWidth !== 800) {
      // Replace width if different maxWidth is requested
      const widthMatch = afterUpload.match(/w_(\d+)/);
      if (widthMatch) {
        return url.replace(/w_\d+/, `w_${maxWidth}`);
      }
    }
  }
  
  return url;
};

// 🔧 NEW: Component to handle authenticated image loading with optimizations
const MediaImage = ({ src, alt, proxyUrl, className, onClick }: { src: string | null; alt: string; proxyUrl: string | null; className: string; onClick: () => void }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null); // Low-quality placeholder
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    // If src is a proxy URL (requires auth), fetch it with authentication using axios
    if (src && (src.includes('/api/v1/unipile/attachments/') || src.includes('/unipile/attachments/'))) {
      setIsLoading(true);
      setHasError(false);
      
      // Use axios to fetch with authentication (it has interceptors that add auth headers)
      // axios already has baseURL configured, so use relative URL
      const urlPath = src.startsWith('http') 
        ? src.replace(import.meta.env.VITE_API_BASE_URL || window.location.origin, '')
        : src;
      
      api.get(urlPath, {
        responseType: 'blob', // Important: get as blob
      })
        .then(response => {
          const blob = new Blob([response.data], { type: response.headers['content-type'] || 'image/jpeg' });
          const blobUrl = URL.createObjectURL(blob);
          setImageSrc(blobUrl);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Failed to load authenticated image:', error.response?.status || error.message);
          setHasError(true);
          setIsLoading(false);
          
          // Try fallback proxyUrl if available
          if (proxyUrl && proxyUrl !== src) {
            const fallbackPath = proxyUrl.startsWith('http') 
              ? proxyUrl.replace(import.meta.env.VITE_API_BASE_URL || window.location.origin, '')
              : proxyUrl;
            api.get(fallbackPath, { responseType: 'blob' })
              .then(r => {
                const blob = new Blob([r.data], { type: r.headers['content-type'] || 'image/jpeg' });
                setImageSrc(URL.createObjectURL(blob));
                setIsLoading(false);
                setHasError(false);
              })
              .catch(() => {
                // Both failed
              });
          }
        });
    } else if (src) {
      // Regular HTTP URL (Cloudinary, etc.), optimize it
      const optimizedUrl = optimizeImageUrl(src, 800); // Max width 800px for chat messages
      const thumbnailUrl = optimizeImageUrl(src, 200); // Small thumbnail for progressive loading
      
      setThumbnailSrc(thumbnailUrl);
      setImageSrc(optimizedUrl);
      
      // Preload the full image
      if (optimizedUrl) {
        const img = new Image();
        img.onload = () => {
          setIsLoading(false);
        };
        img.onerror = () => {
          setHasError(true);
          setIsLoading(false);
        };
        img.src = optimizedUrl;
      } else {
        setIsLoading(false);
      }
    }
    
    // Cleanup blob URL on unmount
    return () => {
      if (imageSrc && imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [src, proxyUrl]);
  
  if (hasError) {
    return (
      <div className={cn("flex items-center justify-center bg-muted p-4 rounded-xl min-h-[120px] max-w-[280px] sm:max-w-[320px] md:max-w-[360px] w-full border border-dashed border-muted-foreground/30")}>
        <span className="text-sm text-muted-foreground">Failed to load image</span>
      </div>
    );
  }
  
  if (isLoading || !imageSrc) {
    return (
      <div className={cn("flex items-center justify-center bg-muted p-4 rounded-xl min-h-[120px] max-w-[280px] sm:max-w-[320px] md:max-w-[360px] w-full border border-dashed border-muted-foreground/30")}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <img 
      src={imageSrc || thumbnailSrc || undefined} 
      alt={alt} 
      className={className}
      onClick={onClick}
      loading="lazy" // Lazy load images
      decoding="async" // Async decoding for better performance
      onError={() => {
        setHasError(true);
        setIsLoading(false);
      }}
      onLoad={() => {
        setIsLoading(false);
      }}
      style={{
        transition: 'opacity 0.3s ease-in-out',
        opacity: isLoading ? 0.5 : 1
      }}
    />
  );
};

export default function ChatInbox() {
  const dispatch = useDispatch<AppDispatch>();
  const { t, i18n } = useTranslation();
  
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeFilter, setActiveFilter] = useState<'open' | 'closed'>('open');
  const [activePlatform, setActivePlatform] = useState<'all' | 'website' | 'whatsapp'>('all');
  const [isTyping] = useState<{ [key: string]: boolean }>({});

  const messageListRef = useRef<HTMLDivElement | null>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const [isInitialMessageLoad, setIsInitialMessageLoad] = useState(true);
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null);
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  
  // META: 24h session + template + opt-in (WhatsApp Business policy)
  const [whatsappSession, setWhatsappSession] = useState<{
    withinWindow: boolean;
    hoursRemaining: number;
    lastMessageTimestamp: string | null;
    requiresTemplate: boolean;
    optIn?: { status: 'opted_in' | 'opted_out' | 'pending'; optedInAt?: string | null; optedOutAt?: string | null; optInSource?: string | null };
  } | null>(null);
  const [whatsappTemplates, setWhatsappTemplates] = useState<{ id?: string; name: string; status?: string; language?: string }[]>([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('');
  const [templateBodyParam, setTemplateBodyParam] = useState('');
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const [optInUpdating, setOptInUpdating] = useState(false);
  const [showOptInSource, setShowOptInSource] = useState(false);
  const [optInSourceValue, setOptInSourceValue] = useState('');
  
  // 🔧 NEW: Helper function to get priority color
  const getPriorityColor = (priority: string = 'normal') => {
    switch (priority) {
      case 'urgent': return 'text-red-500 fill-red-500';
      case 'high': return 'text-orange-500 fill-orange-500';
      case 'normal': return 'text-blue-500 fill-blue-500';
      case 'low': return 'text-gray-400 fill-gray-400';
      default: return 'text-blue-500 fill-blue-500';
    }
  };

  const { user }: any = useSelector((state: RootState) => state.auth);
  const { channels } = useSelector((state: RootState) => state.channel);
  const { agents } = useSelector((state: RootState) => state.humanAgent);
  const { conversations, status: chatListStatus, currentPage, totalPages } = useSelector((state: RootState) => state.chatInbox);
  // const { templates } = useSelector((state: RootState) => state.whatsappBusiness); // META: commented out
  
  // 🔧 NEW: Mark conversation as read
  const handleMarkAsRead = useCallback(async (conversationId: string) => {
    try {
      await api.post(`/api/v1/customer/conversations/${conversationId}/mark-read`);
      // Update local state - unread count will be updated via socket
    } catch (error: any) {
      console.error('Failed to mark as read:', error);
    }
  }, []);
  
  // 🔧 NEW: Update priority
  const handleUpdatePriority = useCallback(async (priority: 'low' | 'normal' | 'high' | 'urgent') => {
    if (!selectedCustomer) return;
    const conversation = conversations.find((c) => c.customer.id === selectedCustomer);
    if (!conversation?.id) return;
    try {
      const { updateConversationPriority } = await import('@/api/chatApi');
      await updateConversationPriority(conversation.id, priority);
      dispatch(updateConversationEnhanced({ conversationId: conversation.id, priority }));
      toast.success(`Priority set to ${priority}`);
      setPriorityDialogOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update priority');
    }
  }, [selectedCustomer, conversations, dispatch]);
  
  // 🔧 NEW: Update tags
  const handleUpdateTags = useCallback(async (tags: string[]) => {
    if (!selectedCustomer) return;
    const conversation = conversations.find((c) => c.customer.id === selectedCustomer);
    if (!conversation?.id) return;
    try {
      const { updateConversationTags } = await import('@/api/chatApi');
      await updateConversationTags(conversation.id, tags);
      dispatch(updateConversationEnhanced({ conversationId: conversation.id, tags }));
      toast.success('Tags updated');
      setTagsDialogOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update tags');
    }
  }, [selectedCustomer, conversations, dispatch]);
  
  // 🔧 NEW: Update notes
  const handleUpdateNotes = useCallback(async (notes: string) => {
    if (!selectedCustomer) return;
    const conversation = conversations.find((c) => c.customer.id === selectedCustomer);
    if (!conversation?.id) return;
    try {
      const { updateConversationNotes } = await import('@/api/chatApi');
      await updateConversationNotes(conversation.id, notes);
      dispatch(updateConversationEnhanced({ conversationId: conversation.id, notes }));
      toast.success('Notes updated');
      setNotesDialogOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update notes');
    }
  }, [selectedCustomer, conversations, dispatch]);
  
  // 🔧 NEW: Assign conversation
  const handleAssignConversation = useCallback(async (agentId: string) => {
    if (!selectedCustomer) return;
    const conversation = conversations.find((c) => c.customer.id === selectedCustomer);
    if (!conversation?.id) return;
    try {
      const { assignConversation } = await import('@/api/chatApi');
      await assignConversation(conversation.id, agentId);
      dispatch(updateConversationEnhanced({ 
        conversationId: conversation.id, 
        assignedAgentId: agentId,
        status: 'live',
        unreadCount: 0
      }));
      toast.success('Conversation assigned');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign conversation');
    }
  }, [selectedCustomer, conversations, dispatch]);
  const messagesData = useSelector((state: RootState) => selectedCustomer ? state.chatInbox.chatData[selectedCustomer] : null);

  const businessId = user?.businessId;
  const debouncedSearchQuery = useDebounce(searchInput, 500);
  
  
  // 🔧 FIX: Filter conversations by platform on frontend for real-time updates. "All" shows every conversation.
  const filteredConversations = useMemo(() => {
    if (activePlatform === 'all') return conversations;
    const targetPlatform = activePlatform.toLowerCase().trim();
    return conversations.filter(convo => {
      const platform = (
        convo.platformInfo?.platform ||
        convo.source ||
        'website'
      ).toLowerCase().trim();
      return platform === targetPlatform;
    });
  }, [conversations, activePlatform]);

  const currentConversation = useMemo(() => filteredConversations.find((c) => c.customer.id === selectedCustomer), [filteredConversations, selectedCustomer]);
  const onlineAgents = useMemo(() => Array.isArray(agents) ? agents.filter(agent => agent.status === 'online' && agent._id !== user?._id) : [], [agents, user?._id]);
  const offlineAgents = useMemo(() => Array.isArray(agents) ? agents.filter(agent => agent.status === 'offline' && agent._id !== user?._id) : [], [agents, user?._id]);
  const groupedMessages = useMemo(() => { const allMessages = messagesData?.list || []; return allMessages.reduce((acc: { [key: string]: any[] }, msg: any) => { const dateLabel = dayjs(msg.time).isToday() ? t('chatInbox.dateToday') : dayjs(msg.time).isYesterday() ? t('chatInbox.dateYesterday') : dayjs(msg.time).format("MMMM D, YYYY"); if (!acc[dateLabel]) acc[dateLabel] = []; acc[dateLabel].push(msg); return acc; }, {}); }, [messagesData?.list, t]);

  useEffect(() => { dayjs.locale(i18n.language); }, [i18n.language]);
  
  useEffect(() => { 
    if (businessId) { 
      dispatch(fetchChannels()); 
    } 
  }, [businessId, dispatch]);

  useEffect(() => {
    if (businessId) {
      dispatch(fetchAgentsWithStatus());
    }
  }, [agents, businessId, dispatch]);

  // 🔧 FIX: Reset and fetch conversations when filters change
  // Reset is needed to clear old platform's conversations before fetching new ones
  useEffect(() => { 
    if (businessId) { 
      dispatch(resetConversations());
      dispatch(fetchCustomersByBusiness({ businessId, page: 1, searchQuery: debouncedSearchQuery, status: activeFilter, platform: activePlatform })); 
    } 
  }, [businessId, dispatch, debouncedSearchQuery, activeFilter, activePlatform]);

  // META WhatsApp Business: 24h session + template selector – commented out. Using Unipile for WhatsApp.
  // META: Fetch WhatsApp 24h session + templates when a WhatsApp conversation is selected
  useEffect(() => {
    const conv = filteredConversations.find((c) => c.customer.id === selectedCustomer);
    const platform = conv?.platformInfo?.platform;
    const connectionId = conv?.platformInfo?.connectionId;
    if (!conv?.id || platform !== 'whatsapp') {
      setWhatsappSession(null);
      setWhatsappTemplates([]);
      setSelectedTemplateName('');
      return;
    }
    let cancelled = false;
    setIsCheckingSession(true);
    setWhatsappSession(null);
    (async () => {
      try {
        const { getWhatsAppSessionByConversation } = await import('@/api/chatApi');
        const session = await getWhatsAppSessionByConversation(conv.id);
        if (!cancelled) {
          setWhatsappSession({
            withinWindow: session.withinWindow,
            hoursRemaining: session.hoursRemaining,
            lastMessageTimestamp: session.lastMessageTimestamp ?? null,
            requiresTemplate: session.requiresTemplate,
            optIn: session.optIn ?? undefined,
          });
        }
        if (connectionId && !cancelled) {
          const res = await api.get(`/api/v1/whatsapp-business/templates?connectionId=${connectionId}`);
          const list = res.data?.data?.templates || [];
          const approved = list.filter((t: any) => (t.status || t.message_template_status || '').toLowerCase() === 'approved');
          if (!cancelled) setWhatsappTemplates(approved.length ? approved : list);
        }
      } catch (e) {
        if (!cancelled) {
          setWhatsappSession(null);
          setWhatsappTemplates([]);
        }
      } finally {
        if (!cancelled) setIsCheckingSession(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedCustomer, filteredConversations]);

  useEffect(() => { if (selectedCustomer) { setIsInitialMessageLoad(true); dispatch(fetchMessagesByCustomer({ customerId: selectedCustomer, page: 1 })); } }, [selectedCustomer, dispatch]);

  // 🔧 OPTIMIZED: Memoize conversation lookup to avoid repeated finds
  const selectedConversation = useMemo(() => {
    return conversations.find((c) => c.customer.id === selectedCustomer);
  }, [conversations, selectedCustomer]);

  // 🔧 NEW: Mark conversation as read when opened
  useEffect(() => {
    if (selectedCustomer && selectedConversation?.id && (selectedConversation?.unreadCount || 0) > 0) {
      handleMarkAsRead(selectedConversation.id);
    }
  }, [selectedCustomer, selectedConversation, handleMarkAsRead]);
  
  // 🔧 OPTIMIZED: Memoize socket event handlers with useCallback (moved outside useEffect)
  const handleNewConversation = useCallback((data: ConversationInList) => {
    // 🔧 FIX: Ensure platformInfo is properly structured for website conversations
    if (!data.platformInfo) {
      // If source exists, use it; otherwise default to 'website'
      const platform = data.source || 'website';
      data.platformInfo = {
        platform: platform as any,
        connectionId: '',
        platformUserId: '',
        platformUserAvatar: undefined,
      };
    }
    
    // 🔧 DEBUG: Log new conversation data
    console.log('[ChatInbox] New conversation received:', {
      id: data.id,
      platformInfo: data.platformInfo,
      source: data.source,
      platform: data.platformInfo?.platform
    });
    
    // Check if conversation already exists
    const exists = conversations.some(c => c.id === data.id);
    if (!exists) {
      dispatch(addNewCustomer(data));
    }
  }, [conversations, dispatch]);

  // 🔧 OPTIMIZED: Handle new chat assigned event (for transfers)
  const handleNewChatAssigned = useCallback((data: ConversationInList) => {
    // Check if conversation already exists
    const exists = conversations.some(c => c.id === data.id);
    if (!exists) {
      dispatch(addNewCustomer(data));
    } else {
      // Update existing conversation
      dispatch(updateConversationEnhanced({
        conversationId: data.id,
        assignedAgentId: data.assignedAgentId,
        status: data.status,
      }));
    }
  }, [conversations, dispatch]);

  // 🔧 OPTIMIZED: Handle conversation updates
  const handleConversationUpdated = useCallback((data: any) => {
    const { conversationId, unreadCount, priority, tags, notes, assignedAgentId, status } = data;
    dispatch(updateConversationEnhanced({
      conversationId,
      unreadCount,
      priority,
      tags,
      notes,
      assignedAgentId,
      status,
    }));
  }, [dispatch]);

  // 🔧 OPTIMIZED: Handle conversation assignment
  const handleConversationAssigned = useCallback((data: any) => {
    const { conversationId, assignedAgentId } = data;
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      dispatch(updateConversationStatus({
        customerId: conversation.customer.id,
        status: 'live',
        assignedAgentId: assignedAgentId,
      }));
    }
  }, [conversations, dispatch]);

  // 🔧 NEW: Handle message status updates (for WhatsApp read receipts, delivery confirmations)
  const handleMessageStatusUpdate = useCallback((data: {
    messageId: string;
    conversationId: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    timestamp?: string;
    errorCode?: number;
    errorMessage?: string;
  }) => {
    // Update message in local state if it exists
    if (messagesData?.list) {
      const messageIndex = messagesData.list.findIndex(
        (m: any) => m.id === data.messageId || m.messageId === data.messageId
      );
      
      if (messageIndex !== -1) {
        // Update message status via dispatch if there's an action for it
        // For now, we'll rely on socket events to trigger a refresh
        // In a full implementation, you'd update the Redux store directly
        console.log('Message status updated:', data);
      }
    }
  }, [messagesData]);

  // 🔧 OPTIMIZED: Real-time event listeners for conversation updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !businessId) return;

    // 🔧 OPTIMIZED: Listen to all relevant events
    socket.on('newConversation', handleNewConversation);
    socket.on('newChatAssigned', handleNewChatAssigned);
    socket.on('conversationUpdated', handleConversationUpdated);
    socket.on('conversationAssigned', handleConversationAssigned);
    // 🔧 NEW: Listen for message status updates (WhatsApp read receipts, delivery confirmations)
    socket.on('messageStatusUpdate', handleMessageStatusUpdate);

    return () => {
      socket.off('newConversation', handleNewConversation);
      socket.off('newChatAssigned', handleNewChatAssigned);
      socket.off('conversationUpdated', handleConversationUpdated);
      socket.off('conversationAssigned', handleConversationAssigned);
      socket.off('messageStatusUpdate', handleMessageStatusUpdate);
    };
  }, [businessId, handleNewConversation, handleNewChatAssigned, handleConversationUpdated, handleConversationAssigned, handleMessageStatusUpdate]);

  useLayoutEffect(() => { 
    if (!messageListRef.current) return; 
    if (isInitialMessageLoad) { 
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight; 
        setIsInitialMessageLoad(false); 
    } else if (messagesData?.list && messagesData.list.length > 0) {
        const lastMessage = messagesData.list[messagesData.list.length - 1];
        // Treat AI messages as agent-side for correct alignment/scroll behavior
        if (lastMessage.sentBy === 'human' || lastMessage.sentBy === 'agent' || lastMessage.sentBy === 'ai' || lastMessage.status === 'sending') {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
    }
  }, [messagesData?.list, isInitialMessageLoad]);

  // 🔧 NEW: State for image upload
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 🔧 META OFFICIAL: State for audio upload and recording
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 🔧 NEW: Handle image file selection
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    setSelectedImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // 🔧 META OFFICIAL: Handle audio file selection
  const handleAudioSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (Meta supports: AAC, MP4, MPEG, AMR, OGG)
    const validAudioTypes = ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg', 'audio/ogg; codecs=opus', 'audio/mp3', 'audio/wav'];
    if (!file.type.startsWith('audio/') && !validAudioTypes.includes(file.type)) {
      toast.error('Please select an audio file (AAC, MP4, MPEG, AMR, OGG)');
      return;
    }

    // Validate file size (max 16MB - Meta's limit)
    if (file.size > 16 * 1024 * 1024) {
      toast.error('Audio size must be less than 16MB');
      return;
    }

    setSelectedAudioFile(file);
    setSelectedImageFile(null); // Clear image if audio is selected
    setImagePreview(null);
    
    // Create preview URL
    const audioUrl = URL.createObjectURL(file);
    setAudioPreview(audioUrl);
  }, []);

  // 🔧 NEW: Remove selected image
  const handleRemoveImage = useCallback(() => {
    setSelectedImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // 🔧 META OFFICIAL: Handle audio recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const audioFile = new File([audioBlob], `recording-${Date.now()}.${mediaRecorder.mimeType.includes('webm') ? 'webm' : 'mp4'}`, {
          type: mediaRecorder.mimeType
        });
        
        setSelectedAudioFile(audioFile);
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioPreview(audioUrl);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error: any) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please allow microphone access.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  // 🔧 META OFFICIAL: Handle audio removal
  const handleRemoveAudio = useCallback(() => {
    if (audioPreview) {
      URL.revokeObjectURL(audioPreview);
    }
    setSelectedAudioFile(null);
    setAudioPreview(null);
    if (audioInputRef.current) {
      audioInputRef.current.value = '';
    }
    if (isRecording) {
      stopRecording();
    }
  }, [audioPreview, isRecording, stopRecording]);

  // 🔧 NEW: Upload image to get URL
  const uploadImage = useCallback(async (file: File): Promise<string> => {
    try {
      const result = await uploadImageApi(file);
      return result.url;
    } catch (error: any) {
      console.error('Failed to upload image:', error);
      throw error;
    }
  }, []);

  const handleSendMessage = useCallback(async () => {
    if ((!newMessage.trim() && !selectedImageFile && !selectedAudioFile) || !selectedCustomer || !businessId || !currentConversation) return;

    const socket = getSocket();
    if (socket?.connected && selectedCustomer) socket.emit('agentStoppedTyping', { customerId: selectedCustomer });

    const platform = currentConversation.platformInfo?.platform || 'website';
    const messageText = newMessage.trim();
    let imageUrl: string | null = null;
    let audioUrl: string | null = null;
    
    // 🔧 NEW: Upload image if selected
    if (selectedImageFile) {
      setIsUploadingImage(true);
      try {
        const result = await uploadImageApi(selectedImageFile);
        imageUrl = result.url;
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to upload image');
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
    }
    
    // 🔧 META OFFICIAL: Upload audio if selected
    if (selectedAudioFile) {
      setIsUploadingAudio(true);
      try {
        const result = await uploadAudioApi(selectedAudioFile);
        audioUrl = result.url;
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to upload audio');
        setIsUploadingAudio(false);
        return;
      }
      setIsUploadingAudio(false);
    }
    
    setNewMessage("");
    handleRemoveImage();
    handleRemoveAudio();

    // For website conversations, use internal messaging
    if (platform === 'website' || !platform) {
      if (!socket) {
        toast.error('Connection error. Please refresh the page.');
        return;
      }
      dispatch(sendHumanMessage({ businessId, customerId: selectedCustomer, message: messageText, senderSocketId: socket.id ?? "" }))
        .unwrap()
        .catch(error => toast.error(error.message || t('chatInbox.toastMessageFailed')));
      return;
    }

    // For Instagram, WhatsApp, Telegram - use Unipile API (send via conversation)
    if (platform === 'instagram' || platform === 'whatsapp' || platform === 'telegram') {
      try {
        // META WhatsApp Business: 24h session check + template send – commented out. Using Unipile only.

        const payload: any = {
          conversationId: currentConversation.id,
          message: messageText || (imageUrl ? '📷 Image' : audioUrl ? '🎵 Audio' : ''),
          businessId: businessId,
        };
        
        // 🔧 NEW: Add media URL if available
        if (imageUrl) {
          payload.imageUrl = imageUrl;
          payload.messageType = 'image';
        } else if (audioUrl) {
          payload.audioUrl = audioUrl;
          payload.messageType = 'audio';
        }
        
        const { sendMessageViaConversation } = await import('@/api/chatApi');
        await sendMessageViaConversation(payload);
        
        // The message will be updated via socket when it arrives
        toast.success(imageUrl ? 'Image sent!' : audioUrl ? 'Audio sent!' : 'Message sent!');
      } catch (error: any) {
        const errorData = error.response?.data;
        
        // META: Template-required error handling – commented out.

        // Check if it's a disconnected account error
        if (error.response?.status === 401 && (errorData?.type === 'disconnected_account' || errorData?.data?.type === 'disconnected_account')) {
          const connectionId = errorData?.connectionId || errorData?.data?.connectionId;
          const reconnectUrl = errorData?.reconnectUrl || errorData?.data?.reconnectUrl;
          
          if (connectionId && reconnectUrl) {
            // Show error with reconnect option
            toast.error(
              (t) => (
                <div className="flex flex-col gap-2">
                  <span>{errorData?.message || errorData?.data?.message || 'The account appears to be disconnected. Please reconnect your account.'}</span>
                  <button
                    onClick={async () => {
                      toast.dismiss(t.id);
                      try {
                        const reconnectResponse = await api.post(reconnectUrl);
                        const authUrl = reconnectResponse.data?.data?.checkpoint?.authUrl || reconnectResponse.data?.data?.authUrl || reconnectResponse.data?.checkpoint?.authUrl;
                        if (authUrl) {
                          window.open(authUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
                          toast.success('Please complete the authentication in the popup window.');
                        } else {
                          toast.error('Failed to get reconnection URL');
                        }
                      } catch (reconnectError: any) {
                        toast.error(reconnectError.response?.data?.message || 'Failed to reconnect account');
                      }
                    }}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium"
                  >
                    Reconnect Account
                  </button>
                </div>
              ),
              { duration: 10000 }
            );
          } else {
            toast.error(errorData?.message || errorData?.data?.message || 'The account appears to be disconnected. Please reconnect in settings.');
          }
        } else {
          const errPayload = error.response?.data?.error;
          if (errPayload?.code === 'REQUIRES_TEMPLATE' || errPayload?.requiresTemplate) {
            setWhatsappSession((prev) => (prev ? { ...prev, requiresTemplate: true } : { withinWindow: false, hoursRemaining: 0, lastMessageTimestamp: null, requiresTemplate: true }));
            toast.error('24-hour window expired. Use a template to message this customer.');
          } else {
            toast.error(error.response?.data?.message || error.message || 'Failed to send message');
          }
        }
        setNewMessage(messageText); // Restore message on error
      }
      return;
    }

    // Fallback to internal messaging for unknown platforms
    if (!socket) {
      toast.error('Connection error. Please refresh the page.');
      return;
    }
    dispatch(sendHumanMessage({ businessId, customerId: selectedCustomer, message: messageText, senderSocketId: socket.id ?? "" }))
      .unwrap()
      .catch(error => toast.error(error.message || t('chatInbox.toastMessageFailed')));
  }, [newMessage, selectedCustomer, businessId, currentConversation, dispatch, t, selectedImageFile, uploadImage, handleRemoveImage]);

  const handleTransfer = async (target: { type: 'agent' | 'channel', id: string }) => {
    if (!currentConversation?.id) { toast.error(t('chatInbox.toastTransferNoId')); return; }
    const payload = target.type === 'agent' ? { targetAgentId: target.id } : { targetChannelId: target.id };
    const promise = api.post(`/api/v1/conversations/${currentConversation.id}/transfer`, payload);
    toast.promise(promise, { loading: t('chatInbox.toastTransferLoading'), success: t('chatInbox.toastTransferSuccess'), error: (err: any) => err.response?.data?.message || t('chatInbox.toastTransferFailed') });
  };

  const handleCloseConversation = () => { if (currentConversation?.id && businessId) { dispatch(closeConversation({ conversationId: currentConversation.id, businessId })).unwrap().then(() => { toast.success(t('chatInbox.toastCloseSuccess')); setSelectedCustomer(null); }).catch(err => toast.error(err || t('chatInbox.toastCloseFailed'))); } };

  // 🔧 OPTIMIZED: Memoize pagination handlers
  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages && businessId) {
      dispatch(fetchCustomersByBusiness({ businessId, page: currentPage + 1, searchQuery: debouncedSearchQuery, status: activeFilter, platform: activePlatform }));
    }
  }, [currentPage, totalPages, businessId, dispatch, debouncedSearchQuery, activeFilter, activePlatform]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1 && businessId) {
      dispatch(fetchCustomersByBusiness({ businessId, page: currentPage - 1, searchQuery: debouncedSearchQuery, status: activeFilter, platform: activePlatform }));
    }
  }, [currentPage, businessId, dispatch, debouncedSearchQuery, activeFilter, activePlatform]);

  const handleLoadMoreMessages = useCallback(() => {
    if (selectedCustomer && messagesData?.hasMore && messagesData.status !== 'loading' && messageListRef.current) {
      prevScrollHeightRef.current = messageListRef.current.scrollHeight;
      dispatch(fetchMessagesByCustomer({ customerId: selectedCustomer, page: messagesData.currentPage + 1 }));
    }
  }, [selectedCustomer, messagesData, dispatch]);

  // 2. Render the skeleton on initial load
  if (chatListStatus === 'loading' && filteredConversations.length === 0) {
    return <ChatInboxSkeleton />;
  }
  
  return (
    <TooltipProvider delayDuration={0}>
      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] h-screen w-full gap-4 lg:gap-6 p-4 lg:p-6">
        <aside className={cn(
          "flex flex-col border p-4 rounded-xl max-h-screen transition-colors shadow-lg",
          activePlatform === 'whatsapp' ? "chat-bg-whatsapp border-[#d4c5b7] dark:border-[#1e2a32]" :
          activePlatform === 'website' ? "chat-bg-website border-border" :
          "bg-card border-border"
        )}>
          <h1 className="text-2xl font-bold mb-4 px-2">{t('chatInbox.title')}</h1>
          
          {/* Platform Tabs: All, Website Chat, WhatsApp Chat (same as Agent Inbox) */}
          <div className="flex items-center gap-1 mb-3 p-1 bg-muted rounded-lg overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActivePlatform('all')}
              className={cn(
                "flex-shrink-0 px-2 sm:px-3 py-2 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                activePlatform === 'all'
                  ? "bg-background shadow-sm"
                  : "hover:bg-background/50"
              )}
            >
              {t('chatInbox.tabs.all') || 'All'}
            </button>
            <button
              onClick={() => setActivePlatform('website')}
              className={cn(
                "flex-shrink-0 px-2 sm:px-3 py-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1 whitespace-nowrap",
                activePlatform === 'website'
                  ? "bg-background shadow-sm"
                  : "hover:bg-background/50"
              )}
            >
              <Globe className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline">{t('chatInbox.tabs.websiteChat') || 'Website Chat'}</span>
            </button>
            <button
              onClick={() => setActivePlatform('whatsapp')}
              className={cn(
                "flex-shrink-0 px-2 sm:px-3 py-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1 whitespace-nowrap",
                activePlatform === 'whatsapp'
                  ? "bg-[#25d366] text-white shadow-sm"
                  : "hover:bg-[#25d366]/10 text-[#25d366]"
              )}
            >
              <MessageCircle className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline">{t('chatInbox.tabs.whatsappChat') || 'WhatsApp Chat'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 p-2 border-b">
            <Button variant={activeFilter === 'open' ? 'default' : 'ghost'} className="flex-1 h-8" onClick={() => setActiveFilter('open')}>{t('chatInbox.filterOpen')}</Button>
            <Button variant={activeFilter === 'closed' ? 'default' : 'ghost'} className="flex-1 h-8" onClick={() => setActiveFilter('closed')}>{t('chatInbox.filterClosed')}</Button>
          </div>
          <div className="px-2 my-4">
            <Input placeholder={t('chatInbox.searchPlaceholder')} className="bg-muted border-none" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide pr-2">
            {chatListStatus === 'loading' && filteredConversations.length > 0 ? ( // This handles subsequent loads
              <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((convo) => {
                const platform = convo.platformInfo?.platform || 'website';
                const isSelected = selectedCustomer === convo.customer.id;
                return (
                <div 
                  key={convo.id} 
                  onClick={() => setSelectedCustomer(convo.customer.id)} 
                  className={cn(
                    "flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg cursor-pointer transition-colors min-w-0",
                    platform === 'whatsapp' && (isSelected ? "bg-[#dcf8c6] dark:bg-[#1f2c33]" : "hover:bg-[#dcf8c6]/50 dark:hover:bg-[#1f2c33]/50"),
                    platform === 'instagram' && (isSelected ? "bg-gradient-to-r from-[#faf0f8] to-[#f5e8f1] dark:from-[#2d1a2e] dark:to-[#1a1a1a]" : "hover:bg-gradient-to-r hover:from-[#faf0f8]/50 hover:to-[#f5e8f1]/50"),
                    platform === 'telegram' && (isSelected ? "bg-[#e8f5e9] dark:bg-[#1a2b2e]" : "hover:bg-[#e8f5e9]/50 dark:hover:bg-[#1a2b2e]/50"),
                    platform === 'website' && (isSelected ? "bg-primary/10" : "hover:bg-muted/50"),
                    !platform && (isSelected ? "bg-primary/10" : "hover:bg-muted/50")
                  )}
                >
                  <div className="relative shrink-0">
                    {/* 🔧 NEW: Profile picture with fallback to initial */}
                    {/* Debug: Check if platformUserAvatar exists */}
                    {(() => {
                      const avatarUrl = convo.platformInfo?.platformUserAvatar;
                      if (avatarUrl) {
                        return (
                          <img
                            src={avatarUrl}
                            alt={convo.customer.name}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-background"
                            onError={(e) => {
                              console.warn('Avatar image failed to load:', avatarUrl);
                              // Fallback to initial letter if image fails to load
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                            onLoad={(e) => {
                              // Hide fallback when image loads successfully
                              const fallback = (e.currentTarget.nextElementSibling as HTMLElement);
                              if (fallback) fallback.style.display = 'none';
                            }}
                          />
                        );
                      }
                      return null;
                    })()}
                    <div 
                      className={`w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-full flex items-center justify-center font-bold text-primary text-xs sm:text-sm ${convo.platformInfo?.platformUserAvatar ? 'hidden' : ''}`}
                    >
                      {(convo.customer?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    {/* 🔧 REMOVED: Platform badge on avatar - badge already shown next to name */}
                    {/* 🔧 NEW: Unread count badge - positioned on avatar */}
                    {(convo.unreadCount || 0) > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center z-10 border-2 border-background shadow-sm">
                        {(convo.unreadCount || 0) > 99 ? '99+' : (convo.unreadCount || 0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                        {/* 🔧 NEW: Priority indicator */}
                        {convo.priority && convo.priority !== 'normal' && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Circle className={cn("h-2.5 w-2.5 shrink-0", getPriorityColor(convo.priority))} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Priority: {convo.priority}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <p className="font-semibold truncate text-sm sm:text-base">{convo.customer.name}</p>
                        {/* 🔧 FIX: Always show platform badge if platformInfo exists */}
                        {convo.platformInfo?.platform ? (
                          <PlatformBadge platform={convo.platformInfo.platform} />
                        ) : convo.source ? (
                          // Fallback: use source if platformInfo is missing
                          <PlatformBadge platform={convo.source} />
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* 🔧 NEW: Notes icon if notes exist */}
                        {convo.notes && (
                          <Tooltip>
                            <TooltipTrigger>
                              <FileText className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs break-words">{convo.notes}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {convo.latestMessageTimestamp && (
                          <p className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                            {dayjs(convo.latestMessageTimestamp).isToday() 
                              ? dayjs(convo.latestMessageTimestamp).format("h:mm A")
                              : dayjs(convo.latestMessageTimestamp).isYesterday()
                              ? "Yesterday"
                              : dayjs(convo.latestMessageTimestamp).format("MMM D")
                            }
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* 🔧 NEW: Tags display (exclude platform tag to avoid duplicate with PlatformBadge) */}
                    {(() => {
                      const platformKey = (convo.platformInfo?.platform || convo.source || '').toLowerCase();
                      const filteredTags = (convo.tags || []).filter(t => t.toLowerCase() !== platformKey);
                      if (filteredTags.length === 0) return null;
                      return (
                        <div className="flex flex-wrap gap-1 mt-1 mb-0.5">
                          {filteredTags.slice(0, 2).map((tag, i) => (
                            <span key={i} className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                              {tag}
                            </span>
                          ))}
                          {filteredTags.length > 2 && (
                            <span className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded">
                              +{filteredTags.length - 2}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    
                    <div className="flex justify-between items-center mt-0.5 gap-2">
                      <p className="text-xs sm:text-sm text-muted-foreground truncate min-w-0 flex-1">
                        {isTyping[convo.customer.id] ? (
                          <span className="text-primary italic">{t('chatInbox.typing')}</span>
                        ) : (
                          convo.preview || t('chatInbox.noMessages')
                        )}
                      </p>
                      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                        {convo.status === 'live' && <Tooltip><TooltipTrigger><User className="h-3 w-3 text-green-500" /></TooltipTrigger><TooltipContent><p>{t('chatInbox.tooltipAssignedTo', { agentName: agents.find(a => a._id === convo.assignedAgentId)?.name || t('chatInbox.anAgent') })}</p></TooltipContent></Tooltip>}
                        {convo.status === 'ticket' && <Tooltip><TooltipTrigger><Ticket className="h-3 w-3 text-orange-500" /></TooltipTrigger><TooltipContent><p>{t('chatInbox.tooltipTicketCreated')}</p></TooltipContent></Tooltip>}
                        {convo.status === 'ai_only' && <Tooltip><TooltipTrigger><Bot className="h-3 w-3 text-blue-500" /></TooltipTrigger><TooltipContent><p>{t('chatInbox.tooltipHandledByAI')}</p></TooltipContent></Tooltip>}
                      </div>
                    </div>
                  </div>
                </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center"><MessageSquareText className="h-12 w-12 mb-2" /><p>{t('chatInbox.noConversationsFound', { filter: t(`chatInbox.filter${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}`) })}</p></div>
            )}
          </div>
          {totalPages > 0 && (
            <div className="flex items-center justify-center gap-2 pt-4 border-t">
              <Button size="sm" variant="outline" onClick={handlePrevPage} disabled={currentPage <= 1 || chatListStatus === 'loading'}>{t('chatInbox.previousPage')}</Button>
              <span className="text-sm font-medium">{t('chatInbox.pagination', { currentPage, totalPages })}</span>
              <Button size="sm" variant="outline" onClick={handleNextPage} disabled={currentPage >= totalPages || chatListStatus === 'loading'}>{t('chatInbox.nextPage')}</Button>
            </div>
          )}
        </aside>

        <main 
          className={cn(
            "flex flex-col border rounded-xl max-h-screen transition-colors overflow-hidden shadow-lg",
            // Platform-specific main container backgrounds using CSS classes
            currentConversation?.platformInfo?.platform === 'whatsapp' 
              ? "chat-bg-whatsapp border-[#d4c5b7] dark:border-[#1e2a32]" 
              : currentConversation?.platformInfo?.platform === 'instagram' 
              ? "chat-bg-instagram border-[#e8d4e0] dark:border-[#3d2a42]" 
              : currentConversation?.platformInfo?.platform === 'telegram' 
              ? "chat-bg-telegram border-[#d1d5db] dark:border-[#1a2332]" 
              : "chat-bg-website border-border"
          )}
        >
          {!selectedCustomer ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center"><MessageSquareText className="h-12 w-12 sm:h-16 sm:w-16 mb-4" /><h2 className="text-lg sm:text-xl font-medium">{t('chatInbox.mainEmptyTitle')}</h2><p className="text-sm sm:text-base">{t('chatInbox.mainEmptySubtitle')}</p></div>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 sm:p-4 border-b gap-2 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-sm sm:text-base truncate">{currentConversation?.customer?.name}</h2>
                    {/* META: 24h session countdown – commented out. Using Unipile for WhatsApp.
                    {currentConversation?.platformInfo?.platform === 'whatsapp' && (
                      <SessionCountdownTimer sessionInfo={whatsappSessionInfo} ... />
                    )}
                    */}
                  </div>
                  {currentConversation?.platformInfo?.platform && (
                    <PlatformBadge platform={currentConversation.platformInfo.platform} />
                  )}
                  {/* 🔧 NEW: Country badge in header */}
                  {currentConversation?.country && (
                    <CountryBadge country={currentConversation.country} />
                  )}
                  {/* 🔧 NEW: Priority indicator in header */}
                  {currentConversation?.priority && currentConversation.priority !== 'normal' && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Circle className={cn("h-3 w-3", getPriorityColor(currentConversation.priority))} />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Priority: {currentConversation.priority}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {/* 🔧 NEW: Response time display */}
                  {currentConversation?.firstResponseAt && currentConversation?.createdAt && (
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Responded in {dayjs(currentConversation.firstResponseAt).from(dayjs(currentConversation.createdAt), true)}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>First response: {dayjs(currentConversation.firstResponseAt).format('MMM D, YYYY h:mm A')}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {/* 🔧 NEW: Tags in header (exclude platform to avoid duplicate with PlatformBadge) */}
                  {(() => {
                    const platformKey = (currentConversation?.platformInfo?.platform || currentConversation?.source || '').toLowerCase();
                    const headerTags = (currentConversation?.tags || []).filter(t => t.toLowerCase() !== platformKey);
                    if (!headerTags.length) return null;
                    return (
                      <div className="flex items-center gap-1">
                        {headerTags.slice(0, 2).map((tag, i) => (
                          <span key={i} className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                            {tag}
                          </span>
                        ))}
                        {headerTags.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{headerTags.length - 2}</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {/* 🔧 NEW: Quick Actions */}
                      <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                      <DropdownMenuItem onSelect={() => setPriorityDialogOpen(true)}>
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Set Priority
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setTagsDialogOpen(true)}>
                        <Tag className="mr-2 h-4 w-4" />
                        Manage Tags
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setNotesDialogOpen(true)}>
                        <FileText className="mr-2 h-4 w-4" />
                        {currentConversation?.notes ? 'Edit Notes' : 'Add Notes'}
                      </DropdownMenuItem>
                      {!currentConversation?.assignedAgentId && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Assign To</DropdownMenuLabel>
                          {onlineAgents.length > 0 ? (
                            onlineAgents.map(agent => (
                              <DropdownMenuItem key={agent._id} onSelect={() => handleAssignConversation(agent._id)}>
                                <div className="flex items-center">
                                  <span className="relative flex h-2 w-2 mr-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                  </span>
                                  {agent.name}
                                </div>
                              </DropdownMenuItem>
                            ))
                          ) : (
                            <DropdownMenuItem disabled>No agents online</DropdownMenuItem>
                          )}
                        </>
                      )}
                      
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>{t('chatInbox.transferTitle')}</DropdownMenuLabel>
                      {Array.isArray(channels) && channels.length > 0 && channels.map((channel) => (<DropdownMenuItem key={channel._id} onSelect={() => handleTransfer({ type: 'channel', id: channel._id })}><ChevronsRight className="mr-2 h-4 w-4" /> {t('chatInbox.transferToChannel', { channelName: channel.name })}</DropdownMenuItem>))}
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuLabel className="text-xs text-muted-foreground px-2">{t('chatInbox.onlineAgents')}</DropdownMenuLabel>
                      {onlineAgents.length > 0 ? (
                        onlineAgents.map(agent => (
                          <DropdownMenuItem key={agent._id} onSelect={() => handleTransfer({ type: 'agent', id: agent._id })}>
                            <div className="flex items-center"><span className="relative flex h-2 w-2 mr-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>{agent.name}</div>
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem disabled>{t('chatInbox.noAgentsOnline')}</DropdownMenuItem>
                      )}

                      {offlineAgents.length > 0 && (
                        <Fragment>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs text-muted-foreground px-2">{t('chatInbox.offlineAgents')}</DropdownMenuLabel>
                          {offlineAgents.map(agent => (
                            <DropdownMenuItem key={agent._id} onSelect={() => handleTransfer({ type: 'agent', id: agent._id })}>
                              <div className="flex items-center text-muted-foreground"><User className="mr-2 h-4 w-4" /><div className="flex flex-col"><span>{agent.name}</span>{agent.lastSeen && (<span className="text-xs -mt-1">{dayjs(agent.lastSeen).fromNow()}</span>)}</div></div>
                            </DropdownMenuItem>
                          ))}
                        </Fragment>
                      )}

                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* 🔧 NEW: Priority Dialog */}
                  <Dialog open={priorityDialogOpen} onOpenChange={setPriorityDialogOpen}>
                    <DialogContent>
                      <h3 className="text-lg font-semibold mb-4">Set Priority</h3>
                      <div className="space-y-2">
                        {(['low', 'normal', 'high', 'urgent'] as const).map((priority) => (
                          <Button
                            key={priority}
                            variant={currentConversation?.priority === priority ? 'default' : 'outline'}
                            className="w-full justify-start"
                            onClick={() => handleUpdatePriority(priority)}
                          >
                            <Circle className={cn("mr-2 h-4 w-4", getPriorityColor(priority))} />
                            {priority.charAt(0).toUpperCase() + priority.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  {/* 🔧 NEW: Tags Dialog */}
                  <Dialog open={tagsDialogOpen} onOpenChange={setTagsDialogOpen}>
                    <DialogContent>
                      <h3 className="text-lg font-semibold mb-4">Manage Tags</h3>
                      <TagsEditor 
                        currentTags={currentConversation?.tags || []} 
                        onSave={handleUpdateTags}
                      />
                    </DialogContent>
                  </Dialog>
                  
                  {/* 🔧 NEW: Notes Dialog */}
                  <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
                    <DialogContent>
                      <h3 className="text-lg font-semibold mb-4">Conversation Notes</h3>
                      <NotesEditor 
                        currentNotes={currentConversation?.notes || ''} 
                        onSave={handleUpdateNotes}
                      />
                    </DialogContent>
                  </Dialog>
                  
                  <Tooltip><TooltipTrigger asChild><Button className="cursor-pointer" variant="ghost" size="icon" onClick={handleCloseConversation}><XCircle className="h-5 w-5 text-red-500" /></Button></TooltipTrigger><TooltipContent><p>{t('chatInbox.closeConversationTooltip')}</p></TooltipContent></Tooltip>
                </div>
              </div>
              <div 
                ref={messageListRef} 
                className={cn(
                  "flex-1 p-3 sm:p-6 space-y-2 overflow-y-auto scrollbar-hide relative",
                  // Platform-specific backgrounds with authentic patterns using CSS classes
                  currentConversation?.platformInfo?.platform === 'whatsapp' 
                    ? "chat-bg-whatsapp"
                    : currentConversation?.platformInfo?.platform === 'instagram'
                    ? "chat-bg-instagram"
                    : currentConversation?.platformInfo?.platform === 'telegram'
                    ? "chat-bg-telegram"
                    : "chat-bg-website"
                )}
              >
                <div className="text-center">
                  {messagesData?.status === 'loading' && <Loader2 className="h-5 w-5 animate-spin mx-auto my-4" />}
                  {messagesData?.hasMore && messagesData.status !== 'loading' && (<Button variant="link" onClick={handleLoadMoreMessages}>{t('chatInbox.loadMoreMessages')}</Button>)}
                </div>
                {Object.entries(groupedMessages).map(([date, group]) => {
                  const platform = currentConversation?.platformInfo?.platform || 'website';
                  const connectionIdFromConversation = currentConversation?.platformInfo?.connectionId;
                  return (
                  <div key={date}>
                    <div className="text-center text-xs text-muted-foreground my-4">{date}</div>
                    {group?.map((msg: any, i) => { 
                      if (msg.sentBy === 'system') {
                        const workflowOpts = msg.metadata?.workflowOptions as { value: string; label: string }[] | undefined;
                        return (
                          <SystemMessage
                            key={i}
                            text={msg.text}
                            workflowOptions={Array.isArray(workflowOpts) ? workflowOpts : undefined}
                          />
                        );
                      } 
                      // Treat AI as agent-side so customer & AI don't render on the same side
                      const isAgentSide = ["agent", "human", "ai"].includes(msg.sentBy);
                      const messageType = msg.messageType || msg.metadata?.messageType || 'text';
                      let mediaUrl = msg.cloudinaryUrl || msg.mediaUrl || msg.metadata?.cloudinaryUrl || msg.metadata?.mediaUrl || null;
                      let proxyUrl = msg.proxyUrl || msg.metadata?.proxyUrl || null;
                      
                      // 🔧 CRITICAL FIX: Never use att:// URLs directly - browsers can't load them
                      if (mediaUrl && typeof mediaUrl === 'string' && mediaUrl.startsWith('att://')) {
                        mediaUrl = null; // Don't use att:// URLs
                      }
                      
                      // 🔧 FIX: If message text contains "att://" URL, try to extract attachmentId and create proxy URL
                      // Only do this if we don't already have a proxyUrl to avoid unnecessary computation
                      if (!proxyUrl && msg.text && typeof msg.text === 'string' && msg.text.includes('att://')) {
                        try {
                          // Extract att:// URL from text (format: "Image: att://...")
                          const attUrlMatch = msg.text.match(/att:\/\/[^\s'"]+/);
                          if (attUrlMatch) {
                            const attUrl = attUrlMatch[0];
                            
                            // Try to extract attachmentId from metadata or from the URL itself
                            let attachmentId = msg.attachmentId || msg.metadata?.attachmentId;
                            let connectionId = msg.metadata?.connectionId || connectionIdFromConversation;
                            
                            // If we don't have attachmentId, try to extract it from the att:// URL
                            // Format: att://connectionId/path/attachmentId
                            if (!attachmentId && attUrl) {
                              // Remove 'att://' prefix
                              const urlWithoutPrefix = attUrl.replace('att://', '');
                              const parts = urlWithoutPrefix.split('/').filter((p: string) => p);
                              
                              if (parts.length > 0) {
                                // The first part is the connectionId
                                if (!connectionId && parts[0]) {
                                  connectionId = parts[0];
                                }
                                
                                // The last part is the attachmentId (base64 encoded)
                                if (parts.length > 1) {
                                  const lastPart = parts[parts.length - 1];
                                  // Remove any query parameters or fragments
                                  const cleanAttachmentId = lastPart.split('?')[0].split('#')[0];
                                  if (cleanAttachmentId && cleanAttachmentId.length > 5) {
                                    attachmentId = cleanAttachmentId;
                                  }
                                }
                              }
                            }
                            
                            // Try to create proxy URL if we have attachmentId and connectionId
                            if (attachmentId && connectionId) {
                              const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
                              proxyUrl = `${apiBaseUrl}/api/v1/unipile/attachments/${attachmentId}?connectionId=${connectionId}`;
                            }
                          }
                        } catch (error) {
                          // Silently fail - don't break rendering
                          console.error('Error extracting att:// URL:', error);
                        }
                      }
                      
                      // 🔧 FIX: If proxyUrl is relative, make it absolute using API base URL
                      if (proxyUrl && typeof proxyUrl === 'string' && proxyUrl.startsWith('/')) {
                        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
                        proxyUrl = `${apiBaseUrl}${proxyUrl}`;
                      }
                      
                      // 🔧 CRITICAL: Only use HTTP/HTTPS URLs, never att:// URLs
                      // For audio messages, prioritize cloudinaryUrl (most reliable for audio playback)
                      const displayUrl = messageType === 'audio'
                        ? (msg.cloudinaryUrl || (mediaUrl && typeof mediaUrl === 'string' && !mediaUrl.startsWith('att://') ? mediaUrl : null) || proxyUrl || null)
                        : ((mediaUrl && typeof mediaUrl === 'string' && !mediaUrl.startsWith('att://')) ? mediaUrl : (proxyUrl || null));
                      
                      // 🔧 FIX: Detect media message from messageType OR if message text contains "Image:" or "att://"
                      const isMediaMessage = ['image', 'video', 'audio', 'document'].includes(messageType) || 
                                            (msg.text && typeof msg.text === 'string' && (msg.text.includes('att://') || msg.text.match(/^(📷|🎥|🎵|📄|📎)/)));
                      
                      // 🔧 FIX: If message text is just a placeholder and we have media, hide the text
                      const isPlaceholderText = msg.text && typeof msg.text === 'string' && (
                        msg.text.match(/^(📷|🎥|🎵|📄|📎)/) || 
                        msg.text.includes('att://') ||
                        msg.text === '📷 Image' ||
                        msg.text === '🎥 Video' ||
                        msg.text === '🎵 Audio' ||
                        msg.text === '📄 Document'
                      );
                      
                      // 🔧 NEW: Get avatar URL from message metadata or conversation platformInfo
                      const messageAvatar = msg.metadata?.avatar || currentConversation?.platformInfo?.platformUserAvatar || null;
                      const senderName = msg.metadata?.name || msg.customerName || currentConversation?.customer?.name || 'User';
                      
                      return (
                        <div key={i} className={cn("flex items-start gap-2 my-2", isAgentSide ? "flex-row-reverse" : "flex-row", msg.status === 'failed' && 'opacity-50')}>
                          {/* 🔧 NEW: Avatar for customer messages */}
                          {!isAgentSide && (
                            <div className="flex-shrink-0 self-start">
                              {messageAvatar ? (
                                <img
                                  src={messageAvatar}
                                  alt={senderName}
                                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover border-2 border-background"
                                  onError={(e) => {
                                    // Fallback to initial letter if image fails
                                    const target = e.currentTarget;
                                    target.style.display = 'none';
                                    const fallback = target.nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                  onLoad={(e) => {
                                    // Hide fallback when image loads successfully
                                    const fallback = (e.currentTarget.nextElementSibling as HTMLElement);
                                    if (fallback) fallback.style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <div 
                                className={`w-6 h-6 sm:w-8 sm:h-8 bg-muted rounded-full flex items-center justify-center font-bold text-primary text-xs ${messageAvatar ? 'hidden' : ''}`}
                              >
                                {senderName.charAt(0).toUpperCase()}
                              </div>
                            </div>
                          )}
                          <div className={cn("flex flex-col min-w-0 flex-1", isAgentSide ? "items-end" : "items-start")}>
                          <div className={cn(
                            "max-w-[65%] rounded-2xl text-sm leading-snug overflow-hidden message-bubble-shadow",
                            isAgentSide 
                              ? platform === 'whatsapp' 
                                ? "message-bubble-whatsapp-sent text-[#111b21] dark:text-white rounded-br-none" 
                                : platform === 'instagram'
                                ? "message-bubble-instagram text-[#262626] dark:text-white rounded-br-none"
                                : platform === 'telegram'
                                ? "message-bubble-telegram-sent text-white rounded-br-none"
                                : "bg-primary text-primary-foreground rounded-br-none"
                              : platform === 'whatsapp'
                              ? "message-bubble-whatsapp-received text-[#111b21] dark:text-white rounded-bl-none"
                              : platform === 'instagram'
                              ? "message-bubble-instagram text-[#262626] dark:text-white rounded-bl-none"
                              : platform === 'telegram'
                              ? "message-bubble-telegram-received text-[#000000] dark:text-white rounded-bl-none"
                              : "bg-muted text-muted-foreground rounded-bl-none",
                            isMediaMessage && displayUrl ? "p-0" : "p-3 sm:p-4"
                          )}>
                            {/* 🔧 NEW: Render media based on messageType */}
                            {isMediaMessage && displayUrl ? (
                              <>
                                {messageType === 'image' && (
                                  <div className="relative group">
                                    <MediaImage 
                                      src={displayUrl}
                                      alt={msg.text || 'Image'}
                                      proxyUrl={proxyUrl}
                                      className="max-w-[280px] sm:max-w-[320px] md:max-w-[360px] w-full h-auto rounded-xl cursor-pointer object-cover shadow-lg border-2 border-white/30 dark:border-white/10 hover:shadow-2xl hover:scale-[1.02] hover:border-white/50 dark:hover:border-white/30 transition-all duration-300 ease-out"
                                      onClick={() => setSelectedImage({ src: displayUrl || '', alt: msg.text || 'Image' })}
                                    />
                                    <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                  </div>
                                )}
                                {messageType === 'video' && (
                                  <video 
                                    src={displayUrl} 
                                    controls 
                                    className="max-w-[280px] sm:max-w-[320px] md:max-w-[360px] w-full h-auto rounded-2xl"
                                    onError={(e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
                                      if (proxyUrl && e.currentTarget.src !== proxyUrl) {
                                        e.currentTarget.src = proxyUrl;
                                      }
                                    }}
                                  >
                                    Your browser does not support the video tag.
                                  </video>
                                )}
                                {messageType === 'audio' && (
                                  <div className="p-3 sm:p-4">
                                    <div className="flex items-center gap-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-purple-200/50 dark:border-purple-800/50">
                                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-3.617a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                                        </svg>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <audio 
                                          src={displayUrl || proxyUrl || msg.cloudinaryUrl || null} 
                                          controls 
                                          className="w-full h-10"
                                          preload="metadata"
                                          crossOrigin="anonymous"
                                          onError={(e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
                                            const audioElement = e.currentTarget;
                                            const currentSrc = audioElement.src;
                                            console.error('Audio playback error:', {
                                              currentSrc,
                                              displayUrl,
                                              proxyUrl,
                                              cloudinaryUrl: msg.cloudinaryUrl,
                                              mediaUrl: msg.mediaUrl,
                                              error: e
                                            });
                                            
                                            // Try fallback URLs in order
                                            if (proxyUrl && currentSrc !== proxyUrl) {
                                              console.log('Trying proxyUrl fallback:', proxyUrl);
                                              audioElement.src = proxyUrl;
                                            } else if (msg.cloudinaryUrl && currentSrc !== msg.cloudinaryUrl) {
                                              console.log('Trying cloudinaryUrl fallback:', msg.cloudinaryUrl);
                                              audioElement.src = msg.cloudinaryUrl;
                                            } else if (msg.mediaUrl && currentSrc !== msg.mediaUrl && !msg.mediaUrl.startsWith('att://')) {
                                              console.log('Trying mediaUrl fallback:', msg.mediaUrl);
                                              audioElement.src = msg.mediaUrl;
                                            } else {
                                              console.error('All audio URL fallbacks failed');
                                              toast.error('Failed to load audio file. Please check the URL.');
                                            }
                                          }}
                                          onLoadedMetadata={(e) => {
                                            const audio = e.currentTarget;
                                            const duration = audio.duration;
                                            if (duration && !isNaN(duration)) {
                                              const minutes = Math.floor(duration / 60);
                                              const seconds = Math.floor(duration % 60);
                                              console.log(`✅ Audio loaded successfully. Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`);
                                            }
                                          }}
                                          onCanPlay={(e) => {
                                            console.log('✅ Audio can play:', e.currentTarget.src);
                                          }}
                                        >
                                          Your browser does not support the audio tag.
                                        </audio>
                                        {msg.text && !isPlaceholderText && (
                                          <p className="text-xs text-muted-foreground mt-2 break-words">
                                            <FormattedText text={msg.text} />
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {messageType === 'document' && (
                                  <div className="p-3 flex items-center gap-2">
                                    <a 
                                      href={displayUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline flex items-center gap-2"
                                    >
                                      <span>📄 {msg.text || 'Document'}</span>
                                    </a>
                                  </div>
                                )}
                                {/* Show text caption if available and not just placeholder */}
                                {msg.text && !isPlaceholderText && (
                                  <div className="p-3 pt-2 text-sm break-words">
                                    <FormattedText text={msg.text} />
                                  </div>
                                )}
                              </>
                            ) : (
                              /* Regular text message - but hide if it's just a placeholder for media */
                              !isPlaceholderText && (
                                <div className="break-words">
                                  <FormattedText text={msg.text} />
                                </div>
                              )
                            )}
                          </div>
                          <div className={cn("flex items-center gap-1.5 mt-1 px-1", isAgentSide ? "flex-row-reverse" : "flex-row")}>
                            <p className="text-xs text-muted-foreground whitespace-nowrap">
                              {msg.time ? dayjs(msg.time).format("h:mm A") : dayjs().format("h:mm A")}
                            </p>
                            {/* 🔧 ENHANCED: Message status indicators with WhatsApp-specific statuses */}
                            {isAgentSide && (
                              <div className="flex items-center gap-1">
                                {/* WhatsApp-specific status from metadata */}
                                {msg.metadata?.whatsappStatus ? (
                                  <>
                                    {msg.metadata.whatsappStatus === 'sent' && (
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <CheckCircle2 className="h-3 w-3 text-gray-400" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Sent</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    {msg.metadata.whatsappStatus === 'delivered' && (
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <CheckCircle2 className="h-3 w-3 text-blue-500" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Delivered{msg.metadata.deliveredAt ? ` ${dayjs(msg.metadata.deliveredAt).fromNow()}` : ''}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    {msg.metadata.whatsappStatus === 'read' && (
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Read{msg.metadata.readAt ? ` ${dayjs(msg.metadata.readAt).fromNow()}` : ''}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    {msg.metadata.whatsappStatus === 'failed' && (
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <XCircle className="h-3 w-3 text-red-500" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Failed{msg.metadata.errorMessage ? `: ${msg.metadata.errorMessage}` : ''}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </>
                                ) : (
                                  /* Fallback to generic status */
                                  <>
                                    {msg.status === 'delivered' || msg.status === 'completed' ? (
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <CheckCircle2 className="h-3 w-3 text-blue-500" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Delivered</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : msg.readAt ? (
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Read {dayjs(msg.readAt).fromNow()}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : msg.status === 'sending' ? (
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Loader2 className="h-3 w-3 text-gray-400 animate-spin" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Sending...</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : null}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          </div>
                        </div>
                      ); 
                    })}
                  </div>
                  );
                })}
              </div>
              <div className="p-3 sm:p-6 border-t">
                {/* META: 24h session badge + template selector when outside window */}
                {currentConversation?.platformInfo?.platform === 'whatsapp' && (
                  <div className="mb-3 space-y-2">
                    {isCheckingSession ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Checking session...
                      </p>
                    ) : whatsappSession && (
                      <>
                        {whatsappSession.withinWindow ? (
                          <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Within 24h • {whatsappSession.hoursRemaining.toFixed(1)}h left to reply freely
                          </p>
                        ) : (
                          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20 p-2 space-y-2">
                            <p className="text-xs text-amber-800 dark:text-amber-200 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> Template required to message this customer
                            </p>
                            <div className="flex flex-wrap gap-2 items-end">
                              <select
                                value={selectedTemplateName}
                                onChange={(e) => setSelectedTemplateName(e.target.value)}
                                className="text-sm border rounded-md px-2 py-1.5 bg-background min-w-[160px]"
                              >
                                <option value="">Select template</option>
                                {whatsappTemplates.map((t) => (
                                  <option key={t.id || t.name} value={t.name}>{t.name}</option>
                                ))}
                              </select>
                              {selectedTemplateName && (
                                <input
                                  type="text"
                                  placeholder="Body text (if template has variable)"
                                  value={templateBodyParam}
                                  onChange={(e) => setTemplateBodyParam(e.target.value)}
                                  className="text-sm border rounded-md px-2 py-1.5 bg-background flex-1 min-w-[120px]"
                                />
                              )}
                              <Button
                                size="sm"
                                disabled={!selectedTemplateName || !currentConversation?.id || !businessId}
                                onClick={async () => {
                                  if (!selectedTemplateName || !currentConversation?.id || !businessId) return;
                                  try {
                                    const { sendMessageViaConversation } = await import('@/api/chatApi');
                                    const components = templateBodyParam.trim()
                                      ? [{ type: 'body' as const, parameters: [{ type: 'text' as const, text: templateBodyParam.trim() }] }]
                                      : undefined;
                                    await sendMessageViaConversation({
                                      conversationId: currentConversation.id,
                                      message: '',
                                      businessId,
                                      useTemplate: true,
                                      templateName: selectedTemplateName,
                                      templateLanguage: 'en',
                                      templateComponents: components,
                                    });
                                    toast.success('Template sent');
                                    setTemplateBodyParam('');
                                    setSelectedTemplateName('');
                                    const { getWhatsAppSessionByConversation } = await import('@/api/chatApi');
                                    const session = await getWhatsAppSessionByConversation(currentConversation.id);
                                    setWhatsappSession({
                                      withinWindow: session.withinWindow,
                                      hoursRemaining: session.hoursRemaining,
                                      lastMessageTimestamp: session.lastMessageTimestamp ?? null,
                                      requiresTemplate: session.requiresTemplate,
                                      optIn: session.optIn ?? undefined,
                                    });
                                  } catch (err: any) {
                                    toast.error(err.response?.data?.message || err.message || 'Failed to send template');
                                  }
                                }}
                              >
                                Send template
                              </Button>
                            </div>
                          </div>
                        )}
                        {/* META: Opt-in status + Mark opted in/out */}
                        <div className="rounded border border-gray-200 dark:border-gray-700 bg-muted/30 p-2 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground">Opt-in:</span>
                              <span className={cn(
                                "rounded px-2 py-0.5 text-xs font-medium",
                                (whatsappSession.optIn?.status ?? 'pending') === 'opted_in' && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                                (whatsappSession.optIn?.status ?? 'pending') === 'opted_out' && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
                                (whatsappSession.optIn?.status ?? 'pending') === 'pending' && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                              )}>
                                {(whatsappSession.optIn?.status ?? 'pending') === 'opted_in' ? 'Opted in' : (whatsappSession.optIn?.status ?? 'pending') === 'opted_out' ? 'Opted out' : 'Pending'}
                              </span>
                              {whatsappSession.optIn?.optInSource && <span className="text-xs text-muted-foreground">({whatsappSession.optIn.optInSource})</span>}
                              {!showOptInSource && (
                                <>
                                  {(whatsappSession.optIn?.status ?? 'pending') !== 'opted_in' && (
                                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowOptInSource(true)} disabled={optInUpdating}>Mark opted in</Button>
                                  )}
                                  {(whatsappSession.optIn?.status ?? 'pending') !== 'opted_out' && (
                                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={async () => {
                                      if (!currentConversation?.id) return;
                                      setOptInUpdating(true);
                                      try {
                                        const { setWhatsAppOptIn, getWhatsAppSessionByConversation } = await import('@/api/chatApi');
                                        await setWhatsAppOptIn(currentConversation.id, { status: 'opted_out' });
                                        const session = await getWhatsAppSessionByConversation(currentConversation.id);
                                        setWhatsappSession(prev => prev ? { ...prev, optIn: session.optIn } : null);
                                      } catch (e: any) { toast.error(e?.response?.data?.message || e?.message || 'Failed'); }
                                      finally { setOptInUpdating(false); }
                                    }} disabled={optInUpdating}>Mark opted out</Button>
                                  )}
                                </>
                              )}
                            </div>
                            {showOptInSource && (
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <select value={optInSourceValue} onChange={(e) => setOptInSourceValue(e.target.value)} className="text-xs border rounded px-2 py-1 bg-background min-w-[140px]">
                                  <option value="">Source (optional)</option>
                                  <option value="website_form">Website form</option>
                                  <option value="in_store">In store</option>
                                  <option value="campaign">Campaign</option>
                                  <option value="other">Other</option>
                                </select>
                                <Button type="button" size="sm" className="h-7 text-xs" onClick={async () => {
                                  if (!currentConversation?.id) return;
                                  setOptInUpdating(true);
                                  try {
                                    const { setWhatsAppOptIn, getWhatsAppSessionByConversation } = await import('@/api/chatApi');
                                    await setWhatsAppOptIn(currentConversation.id, { status: 'opted_in', optInSource: optInSourceValue || undefined });
                                    const session = await getWhatsAppSessionByConversation(currentConversation.id);
                                    setWhatsappSession(prev => prev ? { ...prev, optIn: session.optIn } : null);
                                    setShowOptInSource(false);
                                    setOptInSourceValue('');
                                    toast.success('Opt-in updated');
                                  } catch (e: any) { toast.error(e?.response?.data?.message || e?.message || 'Failed'); }
                                  finally { setOptInUpdating(false); }
                                }} disabled={optInUpdating}>Confirm opted in</Button>
                                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setShowOptInSource(false); setOptInSourceValue(''); }}>Cancel</Button>
                              </div>
                            )}
                          </div>
                      </>
                    )}
                  </div>
                )}

                {/* 🔧 NEW: Image preview */}
                {imagePreview && (
                  <div className="relative mb-3 inline-block">
                    <div className="relative rounded-lg overflow-hidden border-2 border-primary/20">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-w-[200px] max-h-[200px] object-cover"
                      />
                      <button
                        onClick={handleRemoveImage}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
                
                {/* 🔧 META OFFICIAL: Audio preview */}
                {audioPreview && (
                  <div className="relative mb-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                        <Mic className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <audio 
                          src={audioPreview} 
                          controls 
                          className="w-full h-8"
                          preload="metadata"
                        >
                          Your browser does not support the audio tag.
                        </audio>
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedAudioFile?.name || 'Audio recording'}
                          {selectedAudioFile && ` (${(selectedAudioFile.size / 1024 / 1024).toFixed(2)} MB)`}
                        </p>
                      </div>
                      <button
                        onClick={handleRemoveAudio}
                        className="flex-shrink-0 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
                
                {/* 🔧 META OFFICIAL: Recording indicator */}
                {isRecording && (
                  <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center animate-pulse">
                      <Mic className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-700 dark:text-red-300">
                        Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400">Click stop to finish recording</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={stopRecording}
                      className="shrink-0"
                    >
                      <Square className="h-4 w-4 mr-1" />
                      Stop
                    </Button>
                  </div>
                )}
                
                <div className="relative flex items-end gap-2">
                  {/* 🔧 NEW: Image upload button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload"
                  />
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*,.aac,.mp4,.mpeg,.amr,.ogg"
                    onChange={handleAudioSelect}
                    className="hidden"
                    id="audio-upload"
                  />
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="cursor-pointer h-9 w-9 shrink-0"
                      disabled={isUploadingImage || isUploadingAudio || isRecording}
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload image"
                    >
                      {isUploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                    </Button>
                    {/* 🔧 META OFFICIAL: Audio upload/record button */}
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className={cn(
                        "cursor-pointer h-9 w-9 shrink-0",
                        isRecording && "bg-red-500 text-white hover:bg-red-600"
                      )}
                      disabled={isUploadingImage || isUploadingAudio}
                      onClick={() => {
                        if (isRecording) {
                          stopRecording();
                        } else {
                          // Show menu: Upload or Record
                          const shouldRecord = window.confirm('Choose an option:\n\nOK = Record audio\nCancel = Upload audio file');
                          if (shouldRecord) {
                            startRecording();
                          } else {
                            audioInputRef.current?.click();
                          }
                        }
                      }}
                      title={isRecording ? "Stop recording" : "Upload or record audio"}
                    >
                      {isRecording ? (
                        <Square className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Textarea 
                    placeholder={t('chatInbox.messagePlaceholder')} 
                    value={newMessage} 
                    onChange={e => setNewMessage(e.target.value)} 
                    onFocus={() => { const s = getSocket(); if (s?.connected && selectedCustomer) s.emit('agentTyping', { customerId: selectedCustomer }); }}
                    onBlur={() => { const s = getSocket(); if (s?.connected && selectedCustomer) s.emit('agentStoppedTyping', { customerId: selectedCustomer }); }}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} 
                    className="w-full resize-none p-3 sm:p-4 pr-12 sm:pr-14 rounded-lg bg-muted border-none focus-visible:ring-2 focus-visible:ring-primary text-sm sm:text-base" 
                    rows={1} 
                    disabled={isUploadingImage || isUploadingAudio || isRecording || (currentConversation?.platformInfo?.platform === 'whatsapp' && whatsappSession?.requiresTemplate)}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    size="icon" 
                    className="h-9 w-9 bg-primary cursor-pointer hover:bg-primary/90 shrink-0"
                    disabled={isUploadingImage || isUploadingAudio || (whatsappSession?.requiresTemplate && currentConversation?.platformInfo?.platform === 'whatsapp') || (!newMessage.trim() && !selectedImageFile && !selectedAudioFile)}
                  >
                    {isUploadingImage ? (
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
      
      {/* Image Modal for Full-Screen Viewing */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 bg-black/95 border-none overflow-hidden">
          {selectedImage && (
            <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-4">
              {selectedImage.src && (selectedImage.src.includes('/api/v1/unipile/attachments/') || selectedImage.src.includes('/unipile/attachments/')) ? (
                <MediaImage
                  src={selectedImage.src}
                  alt={selectedImage.alt}
                  proxyUrl={null}
                  className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg"
                  onClick={() => {}}
                />
              ) : (
                <img
                  src={optimizeImageUrl(selectedImage.src, 1920, 'auto') || selectedImage.src} // Higher quality for modal (1920px max)
                  alt={selectedImage.alt}
                  className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                  loading="eager" // Eager load for modal (user already clicked to view)
                  decoding="async"
                  onError={(_e) => {
                    console.error('Failed to load image in modal:', selectedImage.src);
                  }}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

// 🔧 NEW: Tags Editor Component
const TagsEditor = ({ currentTags, onSave }: { currentTags: string[]; onSave: (tags: string[]) => void }) => {
  const [tags, setTags] = useState<string[]>(currentTags);
  const [newTag, setNewTag] = useState('');
  
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };
  
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };
  
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Add a tag"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
        />
        <Button onClick={addTag}>Add</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, i) => (
          <div key={i} className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded">
            <span>{tag}</span>
            <button onClick={() => removeTag(tag)} className="ml-1 hover:text-red-500">
              <XCircle className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setTags(currentTags)}>Cancel</Button>
        <Button onClick={() => onSave(tags)}>Save</Button>
      </div>
    </div>
  );
};

// 🔧 NEW: Notes Editor Component
const NotesEditor = ({ currentNotes, onSave }: { currentNotes: string; onSave: (notes: string) => void }) => {
  const [notes, setNotes] = useState(currentNotes);
  
  return (
    <div className="space-y-4">
      <Textarea
        placeholder="Add internal notes for this conversation..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={6}
        className="resize-none"
      />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setNotes(currentNotes)}>Cancel</Button>
        <Button onClick={() => onSave(notes)}>Save</Button>
      </div>
    </div>
  );
};