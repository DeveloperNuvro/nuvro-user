// src/pages/AgentInbox.tsx

import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageSquareText, Loader2, User, Ticket, Bot, MoreVertical, ChevronsRight, XCircle, Globe, MessageCircle, Sparkles, ZapOff, Circle, Tag, FileText, Clock, AlertCircle, CheckCircle2, Image as ImageIcon, X } from "lucide-react";
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
import { fetchAgentConversations, resetAgentConversations, updateConversationEnhanced, addAssignedConversation, removeConversation } from "../features/humanAgent/humanAgentInboxSlice";
import { ConversationInList } from "../features/chatInbox/chatInboxSlice";
import { fetchMessagesByCustomer, sendHumanMessage, closeConversation, updateConversationStatus } from "../features/chatInbox/chatInboxSlice";
import { uploadImage as uploadImageApi } from "@/api/chatApi";
import { fetchAgentsWithStatus } from "@/features/humanAgent/humanAgentSlice";
import { fetchChannels } from "@/features/channel/channelSlice";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getSocket } from "../lib/useSocket"; 
import ChatInboxSkeleton from "@/components/skeleton/ChatInboxSkeleton";
import PlatformBadge from "@/components/custom/unipile/PlatformBadge";
import CountryBadge from "@/components/custom/unipile/CountryBadge";
import FormattedText from "@/components/custom/FormattedText";

dayjs.extend(isToday);
dayjs.extend(isYesterday);
dayjs.extend(relativeTime);

const SystemMessage = ({ text }: { text: string }) => ( 
  <div className="flex items-center justify-center my-4">
    <div className="text-center text-xs px-4 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 break-words">
      <FormattedText text={text} />
    </div>
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

export default function AgentInbox() {
  const dispatch = useDispatch<AppDispatch>();
  const { t, i18n } = useTranslation();

  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeFilter, setActiveFilter] = useState<'open' | 'closed'>('open');
  const [activePlatform, setActivePlatform] = useState<'all' | 'whatsapp' | 'instagram' | 'telegram' | 'website'>('all');
  const [isTyping] = useState<{ [key: string]: boolean }>({});
  // 🔧 NEW: Dialog states for enhanced features
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);

  const messageListRef = useRef<HTMLDivElement | null>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const [isInitialMessageLoad, setIsInitialMessageLoad] = useState(true);
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null);
  
  // 🔧 NEW: State for image upload
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user }: any = useSelector((state: RootState) => state.auth);
  const { channels } = useSelector((state: RootState) => state.channel);
  const { agents } = useSelector((state: RootState) => state.humanAgent);
  const { conversations, status: agentInboxStatus, currentPage, totalPages } = useSelector((state: RootState) => state.agentInbox);
  const messagesData = useSelector((state: RootState) => selectedCustomer ? state.chatInbox.chatData[selectedCustomer] : null);

  const businessId = user?.businessId;
  const agentId = user?._id;
  const debouncedSearchQuery = useDebounce(searchInput, 500);


  // 🔧 OPTIMIZED: Memoize conversation lookup to avoid repeated finds
  const currentConversation = useMemo(() => { 
    if (!Array.isArray(conversations)) return null; 
    return conversations.find((c) => c.customer?.id === selectedCustomer); 
  }, [conversations, selectedCustomer]);
  
  const onlineAgents = useMemo(() => Array.isArray(agents) ? agents.filter(agent => agent.status === 'online' && agent._id !== agentId) : [], [agents, agentId]);
  const offlineAgents = useMemo(() => Array.isArray(agents) ? agents.filter(agent => agent.status === 'offline' && agent._id !== agentId) : [], [agents, agentId]);
  const groupedMessages = useMemo(() => { 
    const allMessages = messagesData?.list || []; 
    return allMessages.reduce((acc: { [key: string]: any[] }, msg: any) => { 
      const dateLabel = dayjs(msg.time).isToday() ? t('chatInbox.dateToday') : dayjs(msg.time).isYesterday() ? t('chatInbox.dateYesterday') : dayjs(msg.time).format("MMMM D, YYYY"); 
      if (!acc[dateLabel]) acc[dateLabel] = []; 
      acc[dateLabel].push(msg); 
      return acc; 
    }, {}); 
  }, [messagesData?.list, t]);

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
  
  useEffect(() => { if (agentId) { dispatch(resetAgentConversations()); dispatch(fetchAgentConversations({ page: 1, searchQuery: debouncedSearchQuery, status: activeFilter, platform: activePlatform })); } }, [dispatch, agentId, debouncedSearchQuery, activeFilter, activePlatform]);
  useEffect(() => { if (selectedCustomer) { setIsInitialMessageLoad(true); dispatch(fetchMessagesByCustomer({ customerId: selectedCustomer, page: 1 })); } }, [selectedCustomer, dispatch]);
  
  // 🔧 NEW: Helper function for priority colors
  const getPriorityColor = (priority: string = 'normal') => {
    switch (priority) {
      case 'urgent': return 'text-red-500 fill-red-500';
      case 'high': return 'text-orange-500 fill-orange-500';
      case 'low': return 'text-gray-500 fill-gray-500';
      default: return 'text-blue-500 fill-blue-500';
    }
  };
  
  // 🔧 NEW: Mark conversation as read
  const handleMarkAsRead = useCallback(async (conversationId: string) => {
    try {
      await api.post(`/api/v1/customer/conversations/${conversationId}/mark-read`);
    } catch (error: any) {
      console.error('Failed to mark as read:', error);
    }
  }, []);
  
  // 🔧 OPTIMIZED: Update priority (using memoized currentConversation)
  const handleUpdatePriority = useCallback(async (priority: 'low' | 'normal' | 'high' | 'urgent') => {
    if (!currentConversation?.id) return;
    try {
      await api.patch(`/api/v1/customer/conversations/${currentConversation.id}/priority`, { priority });
      dispatch(updateConversationEnhanced({ conversationId: currentConversation.id, priority }));
      toast.success(`Priority set to ${priority}`);
      setPriorityDialogOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update priority');
    }
  }, [currentConversation, dispatch]);
  
  // 🔧 OPTIMIZED: Update tags (using memoized currentConversation)
  const handleUpdateTags = useCallback(async (tags: string[]) => {
    if (!currentConversation?.id) return;
    try {
      await api.patch(`/api/v1/customer/conversations/${currentConversation.id}/tags`, { tags });
      dispatch(updateConversationEnhanced({ conversationId: currentConversation.id, tags }));
      toast.success('Tags updated');
      setTagsDialogOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update tags');
    }
  }, [currentConversation, dispatch]);
  
  // 🔧 OPTIMIZED: Update notes (using memoized currentConversation)
  const handleUpdateNotes = useCallback(async (notes: string) => {
    if (!currentConversation?.id) return;
    try {
      await api.patch(`/api/v1/customer/conversations/${currentConversation.id}/notes`, { notes });
      dispatch(updateConversationEnhanced({ conversationId: currentConversation.id, notes }));
      toast.success('Notes updated');
      setNotesDialogOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update notes');
    }
  }, [currentConversation, dispatch]);
  
  // 🔧 OPTIMIZED: Assign conversation (using memoized currentConversation)
  const handleAssignConversation = useCallback(async (agentId: string) => {
    if (!currentConversation?.id) return;
    try {
      await api.post(`/api/v1/customer/conversations/${currentConversation.id}/assign`, { agentId });
      dispatch(updateConversationEnhanced({ 
        conversationId: currentConversation.id, 
        assignedAgentId: agentId,
        status: 'live',
        unreadCount: 0
      }));
      toast.success('Conversation assigned');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign conversation');
    }
  }, [currentConversation, dispatch]);
  
  // 🔧 NEW: Mark conversation as read when opened
  useEffect(() => {
    if (selectedCustomer) {
      const conversation = conversations.find((c) => c.customer.id === selectedCustomer);
      if (conversation?.id && (conversation?.unreadCount || 0) > 0) {
        handleMarkAsRead(conversation.id);
      }
    }
  }, [selectedCustomer, conversations, handleMarkAsRead]);
  
  // 🔧 OPTIMIZED: Memoize socket event handlers with useCallback (moved outside useEffect)
  const handleNewChatAssigned = useCallback((data: ConversationInList) => {
    console.log('🔔 AgentInbox: Received newChatAssigned event:', data);
    
    // Only add if this conversation is assigned to this agent
    if (data.assignedAgentId === agentId) {
      console.log('✅ AgentInbox: Conversation assigned to this agent, adding to list');
      
      // Check if conversation already exists to avoid duplicate toasts
      const existingConversation = conversations.find(c => c.id === data.id);
      if (!existingConversation) {
        dispatch(addAssignedConversation(data));
        toast.success(`New conversation assigned: ${data.customer.name}`);
      } else {
        // Conversation already exists, just update it silently
        dispatch(addAssignedConversation(data));
      }
    } else {
      console.log('⚠️ AgentInbox: Conversation not assigned to this agent, ignoring');
    }
  }, [agentId, conversations, dispatch]);

  // 🔧 OPTIMIZED: Handle conversation updates
  const handleConversationUpdated = useCallback((data: any) => {
    const { conversationId, unreadCount, priority, tags, notes, assignedAgentId, status } = data;
    console.log('🔔 AgentInbox: Received conversationUpdated event:', data);
    console.log('Current agentId:', agentId);
    console.log('Event assignedAgentId:', assignedAgentId);
    
    // Check if this conversation is in the agent's list OR if it's assigned to this agent
    const conversation = conversations.find(c => c.id === conversationId);
    
    // Update if conversation is in list OR if it's assigned to this agent (might not be in list yet)
    if (conversation || assignedAgentId === agentId) {
      console.log('✅ AgentInbox: Conversation found or assigned to this agent, updating...');
      dispatch(updateConversationEnhanced({
        conversationId,
        unreadCount,
        priority,
        tags,
        notes,
        assignedAgentId,
        status,
      }));
    } else {
      console.log('⚠️ AgentInbox: Conversation not found in list and not assigned to this agent');
      console.log('Conversation ID:', conversationId);
      console.log('Current conversations:', conversations.map(c => ({ id: c.id, assignedAgentId: c.assignedAgentId })));
    }
  }, [agentId, conversations, dispatch]);

  // 🔧 OPTIMIZED: Handle conversation assignment
  const handleConversationAssigned = useCallback((data: any) => {
    const { conversationId, assignedAgentId, previousAgentId } = data;
    console.log('🔔 AgentInbox: Received conversationAssigned event:', data);
    console.log('Current agentId:', agentId);
    
    // If this conversation was transferred away from this agent, remove it
    if (previousAgentId === agentId && assignedAgentId !== agentId) {
      console.log('❌ AgentInbox: Conversation transferred away, removing from list');
      dispatch(removeConversation({ conversationId }));
    }
    // If this conversation was assigned to this agent, update it or add it
    if (assignedAgentId === agentId) {
      console.log('✅ AgentInbox: Conversation assigned to this agent');
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        // Update existing conversation silently (no toast, newChatAssigned will handle it)
        dispatch(updateConversationEnhanced({
          conversationId,
          assignedAgentId,
          status: 'live',
          unreadCount: 0
        }));
      } else {
        // Conversation not in list yet, newChatAssigned event should handle adding it
        // Don't show toast here to avoid duplicate - newChatAssigned will show it
        console.log('⚠️ AgentInbox: Conversation assigned but not in list, waiting for newChatAssigned event');
      }
    }
  }, [agentId, conversations, dispatch]);

  // 🔧 OPTIMIZED: Handle conversation removal
  const handleConversationRemoved = useCallback((data: { conversationId: string }) => {
    dispatch(removeConversation(data));
  }, [dispatch]);

  // 🔧 OPTIMIZED: Real-time event listeners for conversation updates and transfers
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !agentId) return;

    socket.on('newChatAssigned', handleNewChatAssigned);
    socket.on('conversationUpdated', handleConversationUpdated);
    socket.on('conversationAssigned', handleConversationAssigned);
    socket.on('conversationRemoved', handleConversationRemoved);

    return () => {
      socket.off('newChatAssigned', handleNewChatAssigned);
      socket.off('conversationUpdated', handleConversationUpdated);
      socket.off('conversationAssigned', handleConversationAssigned);
      socket.off('conversationRemoved', handleConversationRemoved);
    };
  }, [agentId, handleNewChatAssigned, handleConversationUpdated, handleConversationAssigned, handleConversationRemoved]);
  
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

  // 🔧 NEW: Remove selected image
  const handleRemoveImage = useCallback(() => {
    setSelectedImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

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
    if ((!newMessage.trim() && !selectedImageFile) || !selectedCustomer || !businessId || !currentConversation) return;
    
    const platform = currentConversation.platformInfo?.platform || 'website';
    const messageText = newMessage.trim();
    let imageUrl: string | null = null;
    
    // 🔧 NEW: Upload image if selected
    if (selectedImageFile) {
      setIsUploadingImage(true);
      try {
        imageUrl = await uploadImage(selectedImageFile);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to upload image');
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
    }
    
    setNewMessage("");
    handleRemoveImage();

    // For website conversations, use internal messaging
    if (platform === 'website' || !platform) {
      const socket = getSocket();
      if (!socket) {
        toast.error('Connection error. Please refresh the page.');
        return;
      }
      dispatch(sendHumanMessage({ businessId, customerId: selectedCustomer, message: messageText, senderSocketId: socket.id ?? "" }))
        .unwrap()
        .catch(error => toast.error(error.message || t('chatInbox.toastMessageFailed')));
      return;
    }

    // For Instagram, WhatsApp, Telegram - use Unipile API
    if (platform === 'instagram' || platform === 'whatsapp' || platform === 'telegram') {
      try {
        const payload: any = {
          conversationId: currentConversation.id,
          message: messageText || (imageUrl ? '📷 Image' : ''),
          businessId: businessId,
        };
        
        // 🔧 NEW: Add image URL if available
        if (imageUrl) {
          payload.imageUrl = imageUrl;
          payload.messageType = 'image';
        }
        
        await api.post('/api/v1/unipile/messages/send-via-conversation', payload);
        
        // The message will be updated via socket when it arrives
        toast.success(imageUrl ? 'Image sent!' : 'Message sent!');
      } catch (error: any) {
        const errorData = error.response?.data;
        
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
          toast.error(error.response?.data?.message || error.message || 'Failed to send message');
        }
        setNewMessage(messageText); // Restore message on error
      }
      return;
    }

    // Fallback to internal messaging for unknown platforms
    const socket = getSocket();
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
  
  const handleToggleAiReply = async () => {
    if (!currentConversation?.id || !businessId) return;
    
    const platform = currentConversation.platformInfo?.platform;
    const allowedPlatforms = ['whatsapp', 'instagram', 'telegram'];
    
    if (!platform || !allowedPlatforms.includes(platform)) {
      toast.error('AI reply toggle is only available for WhatsApp, Instagram, and Telegram conversations.');
      return;
    }

    try {
      const response = await api.patch(`/api/v1/customer/conversations/${currentConversation.id}/toggle-ai-reply`, {
        businessId,
        aiReplyDisabled: !currentConversation.aiReplyDisabled
      });
      
      // Backend returns { status: 'success', message: '...', data: { aiReplyDisabled: boolean, ... } }
      const responseData = response.data;
      
      if (responseData && responseData.data && typeof responseData.data.aiReplyDisabled === 'boolean') {
        const newStatus = responseData.data.aiReplyDisabled;
        
        // Update local state
        dispatch(updateConversationStatus({
          customerId: currentConversation.customer.id,
          status: currentConversation.status,
          assignedAgentId: currentConversation.assignedAgentId,
          aiReplyDisabled: newStatus
        }));
        
        // Show single success message
        toast.success(`AI replies ${newStatus ? 'disabled' : 'enabled'} for this conversation.`);
      } else {
        console.error('Invalid response structure:', responseData);
        toast.error('Failed to toggle AI replies - invalid response');
      }
    } catch (error: any) {
      console.error('Toggle AI reply error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to toggle AI replies';
      toast.error(errorMessage);
    }
  };
  // 🔧 OPTIMIZED: Memoize pagination handlers
  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages && agentId) {
      dispatch(fetchAgentConversations({ page: currentPage + 1, searchQuery: debouncedSearchQuery, status: activeFilter, platform: activePlatform }));
    }
  }, [currentPage, totalPages, agentId, dispatch, debouncedSearchQuery, activeFilter, activePlatform]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1 && agentId) {
      dispatch(fetchAgentConversations({ page: currentPage - 1, searchQuery: debouncedSearchQuery, status: activeFilter, platform: activePlatform }));
    }
  }, [currentPage, agentId, dispatch, debouncedSearchQuery, activeFilter, activePlatform]);

  const handleLoadMoreMessages = useCallback(() => {
    if (selectedCustomer && messagesData?.hasMore && messagesData.status !== 'loading' && messageListRef.current) {
      prevScrollHeightRef.current = messageListRef.current.scrollHeight;
      dispatch(fetchMessagesByCustomer({ customerId: selectedCustomer, page: messagesData.currentPage + 1 }));
    }
  }, [selectedCustomer, messagesData, dispatch]);

  // 2. Render the skeleton on initial load
  if (agentInboxStatus === 'loading' && conversations.length === 0) {
    return <ChatInboxSkeleton />;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] h-screen w-full gap-4 lg:gap-6 p-4 lg:p-6">
        <aside className={cn(
          "flex flex-col border p-4 rounded-xl max-h-screen transition-colors shadow-lg",
          activePlatform === 'whatsapp' ? "chat-bg-whatsapp border-[#d4c5b7] dark:border-[#1e2a32]" :
          activePlatform === 'instagram' ? "chat-bg-instagram border-[#e8d4e0] dark:border-[#3d2a42]" :
          activePlatform === 'telegram' ? "chat-bg-telegram border-[#d1d5db] dark:border-[#1a2332]" :
          activePlatform === 'website' ? "chat-bg-website border-border" :
          "bg-card border-border"
        )}>
          <h1 className="text-2xl font-bold mb-4 px-2">{t('agentInbox.title')}</h1>
          
          {/* Platform Tabs */}
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
              All
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
              <span className="hidden sm:inline">Website</span>
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
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              onClick={() => setActivePlatform('instagram')}
              className={cn(
                "flex-shrink-0 px-2 sm:px-3 py-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1 bg-gradient-to-r from-[#f09433] via-[#e6683c] to-[#dc2743] text-white whitespace-nowrap",
                activePlatform === 'instagram' 
                  ? "opacity-100 shadow-sm" 
                  : "opacity-70 hover:opacity-90"
              )}
            >
              <MessageCircle className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline">Instagram</span>
            </button>
            <button
              onClick={() => setActivePlatform('telegram')}
              className={cn(
                "flex-shrink-0 px-2 sm:px-3 py-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1 whitespace-nowrap",
                activePlatform === 'telegram' 
                  ? "bg-[#0088cc] text-white shadow-sm" 
                  : "hover:bg-[#0088cc]/10 text-[#0088cc]"
              )}
            >
              <MessageCircle className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline">Telegram</span>
            </button>
        </div>

          <div className="flex items-center gap-2 p-2 border-b">
          <Button variant={activeFilter === 'open' ? 'default' : 'ghost'} className="flex-1 h-8" onClick={() => setActiveFilter('open')}>{t('agentInbox.filters.open')}</Button>
          <Button variant={activeFilter === 'closed' ? 'default' : 'ghost'} className="flex-1 h-8" onClick={() => setActiveFilter('closed')}>{t('agentInbox.filters.closed')}</Button>
        </div>
        <div className="px-2 my-4">
          <Input placeholder={t('agentInbox.searchPlaceholder')} className="bg-muted border-none" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide pr-2">
            {agentInboxStatus === 'loading' && conversations.length > 0 ? ( // This handles subsequent loads
              <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : conversations.length > 0 ? (
              conversations.map((convo) => {
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
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-full flex items-center justify-center font-bold text-primary text-xs sm:text-sm">{convo.customer.name?.charAt(0).toUpperCase()}</div>
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
                        {convo.platformInfo?.platform && (
                          <PlatformBadge platform={convo.platformInfo.platform} />
                        )}
                        {/* 🔧 NEW: Country badge in conversation list */}
                        {convo.country && (
                          <CountryBadge country={convo.country} />
                        )}
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
                    <div className="flex justify-between items-center mt-0.5 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground truncate min-w-0">
                          {isTyping[convo.customer.id] ? (
                            <span className="text-primary italic">{t('chatInbox.typing')}</span>
                          ) : (
                            convo.preview || t('chatInbox.noMessages')
                          )}
                        </p>
                        {/* 🔧 NEW: Tags display */}
                        {convo.tags && convo.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {convo.tags.slice(0, 2).map((tag, i) => (
                              <span key={i} className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                                {tag}
                              </span>
                            ))}
                            {convo.tags.length > 2 && (
                              <span className="text-xs text-muted-foreground">+{convo.tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
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
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center"><MessageSquareText className="h-12 w-12 mb-2" /><p>{t('agentInbox.noConversations', { filter: activeFilter })}</p></div>
          )}
        </div>
        {totalPages > 0 && (
          <div className="flex items-center justify-center gap-2 pt-4 border-t">
            <Button size="sm" variant="outline" onClick={handlePrevPage} disabled={currentPage <= 1 || agentInboxStatus === 'loading'}>{t('agentInbox.pagination.previous')}</Button>
            <span className="text-sm font-medium">{t('agentInbox.pagination.page', { currentPage, totalPages })}</span>
            <Button size="sm" variant="outline" onClick={handleNextPage} disabled={currentPage >= totalPages || agentInboxStatus === 'loading'}>{t('agentInbox.pagination.next')}</Button>
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
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center"><MessageSquareText className="h-12 w-12 sm:h-16 sm:w-16 mb-4" /><h2 className="text-lg sm:text-xl font-medium">{t('agentInbox.empty.title')}</h2><p className="text-sm sm:text-base">{t('agentInbox.empty.subtitle')}</p></div>
        ) : (
          <>
              <div className="flex items-center justify-between p-3 sm:p-4 border-b gap-2 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <h2 className="font-semibold text-sm sm:text-base truncate">{currentConversation?.customer?.name}</h2>
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
                  {/* 🔧 NEW: Show overdue indicator if no response and time > 5 minutes */}
                  {!currentConversation?.firstResponseAt && currentConversation?.createdAt && dayjs().diff(dayjs(currentConversation.createdAt), 'minute') > 5 && (
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center gap-1 text-xs text-orange-500">
                          <AlertCircle className="h-3 w-3" />
                          <span>Overdue {dayjs().from(dayjs(currentConversation.createdAt), true)}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>No response yet. Created {dayjs(currentConversation.createdAt).fromNow()}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {/* 🔧 NEW: Tags in header */}
                  {currentConversation?.tags && currentConversation.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      {currentConversation.tags.slice(0, 2).map((tag, i) => (
                        <span key={i} className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                          {tag}
                        </span>
                      ))}
                      {currentConversation.tags.length > 2 && (
                        <span className="text-xs text-muted-foreground">+{currentConversation.tags.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* AI Reply Toggle - Only for Instagram, WhatsApp, Telegram */}
                  {currentConversation?.platformInfo?.platform && 
                   ['whatsapp', 'instagram', 'telegram'].includes(currentConversation.platformInfo.platform) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={currentConversation.aiReplyDisabled ? "outline" : "default"}
                          size="icon"
                          onClick={handleToggleAiReply}
                          className={cn(
                            "cursor-pointer",
                            currentConversation.aiReplyDisabled 
                              ? "border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950" 
                              : "bg-primary text-primary-foreground"
                          )}
                        >
                          {currentConversation.aiReplyDisabled ? (
                            <ZapOff className="h-4 w-4" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {currentConversation.aiReplyDisabled 
                            ? "AI replies are OFF - Click to enable" 
                            : "AI replies are ON - Click to disable"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
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
                    <DropdownMenuLabel>{t('agentInbox.transfer.title')}</DropdownMenuLabel>
                    {Array.isArray(channels) && channels.length > 0 && channels.map((channel) => (<DropdownMenuItem key={channel._id} onSelect={() => handleTransfer({ type: 'channel', id: channel._id })}><ChevronsRight className="mr-2 h-4 w-4" /> {t('agentInbox.transfer.toChannel', { channelName: channel.name })}</DropdownMenuItem>))}
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
                
                <Tooltip><TooltipTrigger asChild><Button className="cursor-pointer" variant="ghost" size="icon" onClick={handleCloseConversation}><XCircle className="h-5 w-5 text-red-500" /></Button></TooltipTrigger><TooltipContent><p>{t('agentInbox.transfer.closeConversation')}</p></TooltipContent></Tooltip>
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
                {messagesData?.hasMore && messagesData.status !== 'loading' && (<Button variant="link" onClick={handleLoadMoreMessages}>{t('agentInbox.loadMoreMessages')}</Button>)}
              </div>
              {Object.entries(groupedMessages).map(([date, group]) => {
                const platform = currentConversation?.platformInfo?.platform || 'website';
                const connectionIdFromConversation = currentConversation?.platformInfo?.connectionId;
                return (
                  <div key={date}>
                    <div className="text-center text-xs text-muted-foreground my-4">{date}</div>
                    {group?.map((msg: any, i) => { 
                      if (msg.sentBy === 'system') return <SystemMessage key={i} text={msg.text} />; 
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
                      const displayUrl = (mediaUrl && typeof mediaUrl === 'string' && !mediaUrl.startsWith('att://')) ? mediaUrl : (proxyUrl || null);
                      
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
                                      className="max-w-[280px] sm:max-w-[320px] md:max-w-[360px] w-full h-auto rounded-2xl cursor-pointer object-cover shadow-lg border-2 border-white/30 dark:border-white/10 hover:shadow-2xl hover:scale-[1.02] hover:border-white/50 dark:hover:border-white/30 transition-all duration-300 ease-out"
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
                                  <div className="p-3">
                                    <audio 
                                      src={displayUrl} 
                                      controls 
                                      className="w-full"
                                      onError={(e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
                                        if (proxyUrl && e.currentTarget.src !== proxyUrl) {
                                          e.currentTarget.src = proxyUrl;
                                        }
                                      }}
                                    >
                                      Your browser does not support the audio tag.
                                    </audio>
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
                            {/* 🔧 NEW: Message status indicators (delivered/read) */}
                            {isAgentSide && (
                              <div className="flex items-center">
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
                                ) : null}
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
                {/* 🔧 NEW: Image preview */}
                {imagePreview && (
                  <div className="mb-3 relative inline-block">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="max-w-[200px] max-h-[200px] rounded-lg object-cover border border-border"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload-agent"
                  />
                  <Textarea 
                    placeholder={t('agentInbox.messagePlaceholder')} 
                    value={newMessage} 
                    onChange={e => setNewMessage(e.target.value)} 
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} 
                    className="w-full resize-none p-3 sm:p-4 pr-24 sm:pr-28 rounded-lg bg-muted border-none focus-visible:ring-2 focus-visible:ring-primary text-sm sm:text-base" 
                    rows={1} 
                  />
                  {/* 🔧 NEW: Image upload button */}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={isUploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute right-12 sm:right-14 bottom-2 sm:bottom-2.5 h-8 w-8 sm:h-9 sm:w-9"
                  >
                    {isUploadingImage ? (
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                  <Button 
                    onClick={handleSendMessage} 
                    size="icon" 
                    disabled={isUploadingImage || (!newMessage.trim() && !selectedImageFile)}
                    className="absolute right-2 sm:right-3 bottom-2 sm:bottom-2.5 h-8 w-8 sm:h-9 sm:w-9 bg-primary cursor-pointer hover:bg-primary/90 disabled:opacity-50"
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
