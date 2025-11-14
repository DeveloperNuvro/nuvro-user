// src/pages/AgentInbox.tsx

import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageSquareText, Loader2, User, Ticket, Bot, MoreVertical, ChevronsRight, XCircle, Globe, MessageCircle, Sparkles, ZapOff } from "lucide-react";
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
import { fetchAgentConversations, resetAgentConversations } from "../features/humanAgent/humanAgentInboxSlice";
import { fetchMessagesByCustomer, sendHumanMessage, closeConversation, updateConversationStatus } from "../features/chatInbox/chatInboxSlice";
import { fetchAgentsWithStatus } from "@/features/humanAgent/humanAgentSlice";
import { fetchChannels } from "@/features/channel/channelSlice";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getSocket } from "../lib/useSocket"; 
import ChatInboxSkeleton from "@/components/skeleton/ChatInboxSkeleton";
import PlatformBadge from "@/components/custom/unipile/PlatformBadge";
import { useTheme } from "@/components/theme-provider";
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
  const { theme } = useTheme();

  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeFilter, setActiveFilter] = useState<'open' | 'closed'>('open');
  const [activePlatform, setActivePlatform] = useState<'all' | 'whatsapp' | 'instagram' | 'telegram' | 'website'>('all');
  const [isTyping] = useState<{ [key: string]: boolean }>({});

  const messageListRef = useRef<HTMLDivElement | null>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const [isInitialMessageLoad, setIsInitialMessageLoad] = useState(true);
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null);

  const { user }: any = useSelector((state: RootState) => state.auth);
  const { channels } = useSelector((state: RootState) => state.channel);
  const { agents } = useSelector((state: RootState) => state.humanAgent);
  const { conversations, status: agentInboxStatus, currentPage, totalPages } = useSelector((state: RootState) => state.agentInbox);
  const messagesData = useSelector((state: RootState) => selectedCustomer ? state.chatInbox.chatData[selectedCustomer] : null);

  const businessId = user?.businessId;
  const agentId = user?._id;
  const debouncedSearchQuery = useDebounce(searchInput, 500);

  // Detect if dark mode is active
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return theme === 'dark';
  });
  
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
      setIsDarkMode(mediaQuery.matches);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      setIsDarkMode(theme === 'dark');
    }
  }, [theme]);

  const currentConversation = useMemo(() => { if (!Array.isArray(conversations)) return null; return conversations.find((c) => c.customer?.id === selectedCustomer); }, [conversations, selectedCustomer]);
  const onlineAgents = useMemo(() => Array.isArray(agents) ? agents.filter(agent => agent.status === 'online' && agent._id !== agentId) : [], [agents, agentId]);
  const offlineAgents = useMemo(() => Array.isArray(agents) ? agents.filter(agent => agent.status === 'offline' && agent._id !== agentId) : [], [agents, agentId]);
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
  
  useEffect(() => { if (agentId) { dispatch(resetAgentConversations()); dispatch(fetchAgentConversations({ page: 1, searchQuery: debouncedSearchQuery, status: activeFilter, platform: activePlatform })); } }, [dispatch, agentId, debouncedSearchQuery, activeFilter, activePlatform]);
  useEffect(() => { if (selectedCustomer) { setIsInitialMessageLoad(true); dispatch(fetchMessagesByCustomer({ customerId: selectedCustomer, page: 1 })); } }, [selectedCustomer, dispatch]);
  
  useLayoutEffect(() => { 
    if (!messageListRef.current) return; 
    if (isInitialMessageLoad) { 
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight; 
        setIsInitialMessageLoad(false); 
    } else if (messagesData?.list && messagesData.list.length > 0) {
        const lastMessage = messagesData.list[messagesData.list.length - 1];
        if (lastMessage.sentBy === 'human' || lastMessage.sentBy === 'agent' || lastMessage.status === 'sending') {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
    }
  }, [messagesData?.list, isInitialMessageLoad]);

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedCustomer || !businessId || !currentConversation) return;
    
    const platform = currentConversation.platformInfo?.platform || 'website';
    const messageText = newMessage.trim();
    setNewMessage("");

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
        await api.post('/api/v1/unipile/messages/send-via-conversation', {
          conversationId: currentConversation.id,
          message: messageText,
          businessId: businessId
        });
        
        // The message will be updated via socket when it arrives
        toast.success('Message sent!');
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
  }, [newMessage, selectedCustomer, businessId, currentConversation, dispatch, t]);

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
  const handleNextPage = () => { if (currentPage < totalPages && agentId) dispatch(fetchAgentConversations({ page: currentPage + 1, searchQuery: debouncedSearchQuery, status: activeFilter, platform: activePlatform })); };
  const handlePrevPage = () => { if (currentPage > 1 && agentId) dispatch(fetchAgentConversations({ page: currentPage - 1, searchQuery: debouncedSearchQuery, status: activeFilter, platform: activePlatform })); };
  const handleLoadMoreMessages = () => { if (selectedCustomer && messagesData?.hasMore && messagesData.status !== 'loading' && messageListRef.current) { prevScrollHeightRef.current = messageListRef.current.scrollHeight; dispatch(fetchMessagesByCustomer({ customerId: selectedCustomer, page: messagesData.currentPage + 1 })); } };

  // 2. Render the skeleton on initial load
  if (agentInboxStatus === 'loading' && conversations.length === 0) {
    return <ChatInboxSkeleton />;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] h-screen w-full gap-4 lg:gap-6 p-4 lg:p-6">
        <aside className={cn(
          "flex flex-col border p-4 rounded-xl max-h-screen transition-colors",
          activePlatform === 'whatsapp' ? "bg-[#e5ddd5] dark:bg-[#111b21]" :
          activePlatform === 'instagram' ? "bg-gradient-to-br from-[#faf0f8] to-[#f5e8f1] dark:from-[#1a1a1a] dark:to-[#2d1a2e]" :
          activePlatform === 'telegram' ? "bg-[#e5e7e8] dark:bg-[#0e1621]" :
          activePlatform === 'website' ? "bg-card" :
          "bg-card"
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
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-full flex items-center justify-center font-bold text-primary shrink-0 text-xs sm:text-sm">{convo.customer.name?.charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                        <p className="font-semibold truncate text-sm sm:text-base">{convo.customer.name}</p>
                        {convo.platformInfo?.platform && (
                          <PlatformBadge platform={convo.platformInfo.platform} />
                        )}
                      </div>
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
            "flex flex-col border rounded-xl max-h-screen transition-colors overflow-hidden",
            // Platform-specific main container backgrounds
            currentConversation?.platformInfo?.platform === 'whatsapp' 
              ? "bg-[#ece5dd] dark:bg-[#0b141a]" 
              : currentConversation?.platformInfo?.platform === 'instagram' 
              ? "bg-gradient-to-br from-[#faf0f8] to-[#f5e8f1] dark:from-[#1a1a1a] dark:to-[#2d1a2e]" 
              : currentConversation?.platformInfo?.platform === 'telegram' 
              ? "bg-[#e5e7e8] dark:bg-[#0e1621]" 
              : "bg-card"
          )}
          style={
            currentConversation?.platformInfo?.platform === 'whatsapp'
              ? { backgroundColor: isDarkMode ? '#0b141a' : '#ece5dd' }
              : currentConversation?.platformInfo?.platform === 'instagram'
              ? { background: isDarkMode 
                  ? 'linear-gradient(to bottom right, #1a1a1a, #2d1a2e)' 
                  : 'linear-gradient(to bottom right, #faf0f8, #f5e8f1)' }
              : currentConversation?.platformInfo?.platform === 'telegram'
              ? { backgroundColor: isDarkMode ? '#0e1621' : '#e5e7e8' }
              : undefined
          }
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
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{t('agentInbox.transfer.title')}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
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
                <Tooltip><TooltipTrigger asChild><Button className="cursor-pointer" variant="ghost" size="icon" onClick={handleCloseConversation}><XCircle className="h-5 w-5 text-red-500" /></Button></TooltipTrigger><TooltipContent><p>{t('agentInbox.transfer.closeConversation')}</p></TooltipContent></Tooltip>
              </div>
            </div>
              <div 
                ref={messageListRef} 
                className={cn(
                  "flex-1 p-3 sm:p-6 space-y-2 overflow-y-auto scrollbar-hide relative",
                  // Platform-specific backgrounds with authentic patterns
                  currentConversation?.platformInfo?.platform === 'whatsapp' 
                    ? "bg-[#ece5dd] dark:bg-[#0b141a]"
                    : currentConversation?.platformInfo?.platform === 'instagram'
                    ? "bg-gradient-to-br from-[#faf0f8] via-[#f5e8f1] to-[#f0e0ea] dark:from-[#1a1a1a] dark:via-[#2d1a2e] dark:to-[#1a1a1a]"
                    : currentConversation?.platformInfo?.platform === 'telegram'
                    ? "bg-[#e5e7e8] dark:bg-[#0e1621]"
                    : "bg-background"
                )}
                style={
                  currentConversation?.platformInfo?.platform === 'whatsapp'
                    ? {
                        backgroundColor: isDarkMode ? '#0b141a' : '#ece5dd',
                        backgroundImage: isDarkMode
                          ? 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px)'
                          : 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.08) 10px, rgba(0,0,0,0.08) 20px)',
                        backgroundSize: '40px 40px',
                        backgroundAttachment: 'fixed'
                      }
                    : currentConversation?.platformInfo?.platform === 'instagram'
                    ? {
                        background: isDarkMode
                          ? 'linear-gradient(to bottom right, #1a1a1a, #2d1a2e, #1a1a1a)'
                          : 'linear-gradient(to bottom right, #faf0f8, #f5e8f1, #f0e0ea)',
                        backgroundImage: isDarkMode
                          ? 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom right, #1a1a1a, #2d1a2e, #1a1a1a)'
                          : 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom right, #faf0f8, #f5e8f1, #f0e0ea)',
                        backgroundSize: '20px 20px, 100% 100%',
                        backgroundAttachment: 'fixed, fixed'
                      }
                    : currentConversation?.platformInfo?.platform === 'telegram'
                    ? {
                        backgroundColor: isDarkMode ? '#0e1621' : '#e5e7e8',
                        backgroundImage: isDarkMode
                          ? 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)'
                          : 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)',
                        backgroundSize: '100% 4px',
                        backgroundAttachment: 'fixed'
                      }
                    : undefined
                }
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
                      const isAgentSide = ["agent", "human"].includes(msg.sentBy);
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
                      
                      return (
                        <div key={i} className={cn("flex flex-col my-4", isAgentSide ? "items-end" : "items-start", msg.status === 'failed' && 'opacity-50')}>
                          <div className={cn(
                            "max-w-[65%] rounded-2xl text-sm leading-snug overflow-hidden",
                            isAgentSide 
                              ? platform === 'whatsapp' 
                                ? "bg-[#dcf8c6] text-[#111b21] dark:bg-[#005c4b] dark:text-white rounded-br-none shadow-sm" 
                                : platform === 'instagram'
                                ? "bg-white text-[#262626] dark:bg-[#262626] dark:text-white rounded-br-none shadow-sm"
                                : platform === 'telegram'
                                ? "bg-[#3390ec] text-white rounded-br-none shadow-sm"
                                : "bg-primary text-primary-foreground rounded-br-none"
                              : platform === 'whatsapp'
                              ? "bg-white text-[#111b21] dark:bg-[#202c33] dark:text-white rounded-bl-none shadow-sm"
                              : platform === 'instagram'
                              ? "bg-white text-[#262626] dark:bg-[#262626] dark:text-white rounded-bl-none shadow-sm"
                              : platform === 'telegram'
                              ? "bg-white text-[#000000] dark:bg-[#18222d] dark:text-white rounded-bl-none shadow-sm"
                              : "bg-muted text-muted-foreground rounded-bl-none",
                            isMediaMessage && displayUrl ? "p-0" : "p-3"
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
                          <p className="text-xs text-muted-foreground mt-1.5 px-1 whitespace-nowrap">
                            {msg.time ? dayjs(msg.time).format("h:mm A") : dayjs().format("h:mm A")}
                          </p>
                        </div>
                      ); 
                    })}
            </div>
                  );
                })}
              </div>
              <div className="p-3 sm:p-6 border-t">
                <div className="relative">
                  <Textarea 
                    placeholder={t('agentInbox.messagePlaceholder')} 
                    value={newMessage} 
                    onChange={e => setNewMessage(e.target.value)} 
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} 
                    className="w-full resize-none p-3 sm:p-4 pr-12 sm:pr-14 rounded-lg bg-muted border-none focus-visible:ring-2 focus-visible:ring-primary text-sm sm:text-base" 
                    rows={1} 
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    size="icon" 
                    className="absolute right-2 sm:right-3 bottom-2 sm:bottom-2.5 h-8 w-8 sm:h-9 sm:w-9 bg-primary cursor-pointer hover:bg-primary/90"
                  >
                    <Send className="h-3 w-3 sm:h-4 sm:w-4" />
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
