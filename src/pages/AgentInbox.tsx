// src/pages/AgentInbox.tsx
// 10-item fix: (2) realtime inbox no-refresh, (6) internal note in chat, (8) AI Summary, (9) Improve message button, (10) spellCheck on textarea

import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect, Fragment } from "react";
import { useVoiceRecorder, formatVoiceDuration, resolveVoiceAttachmentDurationSeconds } from "@/hooks/useVoiceRecorder";
import { VoiceRecordingBar } from "@/components/chat/VoiceRecordingBar";
import { OutboundVoicePreviewCard } from "@/components/chat/OutboundVoicePreviewCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageSquareText, Loader2, User, Ticket, Bot, MoreVertical, ChevronsRight, XCircle, Globe, MessageCircle, Circle, Tag, FileText, Clock, AlertCircle, CheckCircle2, Paperclip, X, Sparkles, Reply, UserMinus, Mic } from "lucide-react";
import { cn, toCloudinaryMp3Url } from "@/lib/utils";
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
import { normalizeApiMediaUrl } from "@/lib/audioUrlNormalize";
import {
  fetchAgentConversations,
  resetAgentConversations,
  updateConversationEnhanced,
  addAssignedConversation,
  removeConversation,
  updateConversationPreview,
  closeAllOpenAgentConversations,
  setInboxQueueCountsFromSocket,
  type AgentInboxQueueCounts,
} from "../features/humanAgent/humanAgentInboxSlice";
import { ConversationInList } from "../features/chatInbox/chatInboxSlice";
import {
  fetchMessagesByCustomer,
  sendHumanMessage,
  closeConversation,
  addRealtimeMessage,
  addOutboundPendingMessage,
  removeOutboundPendingMessage,
} from "../features/chatInbox/chatInboxSlice";
import {
  uploadChatAttachment as uploadChatAttachmentApi,
  getConversationSummary as getConversationSummaryApi,
  improveMessage as improveMessageApi,
  sendInternalNote as sendInternalNoteApi,
  getAudioPlayUrl as getAudioPlayUrlApi,
  sendMessageViaConversation,
  markConversationAsRead,
  updateConversationPriority as updateConversationPriorityApi,
  updateConversationTags as updateConversationTagsApi,
  assignConversation as assignConversationApi,
  releaseConversationToQueue,
} from "@/api/chatApi";
import { suggestQuickResponses, type SuggestItem } from "@/api/quickResponsesApi";
import { fetchAgentsWithStatus } from "@/features/humanAgent/humanAgentSlice";
import { fetchChannels } from "@/features/channel/channelSlice";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ZoomableImageLightbox } from "@/components/chat/ZoomableImageLightbox";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getSocket } from "../lib/useSocket"; 
import ChatInboxSkeleton from "@/components/skeleton/ChatInboxSkeleton";
import PlatformBadge from "@/components/custom/unipile/PlatformBadge";
import CountryBadge from "@/components/custom/unipile/CountryBadge";
import FormattedText from "@/components/custom/FormattedText";
import SecureDocumentPreview from "@/components/custom/SecureDocumentPreview";
import SimpleVoiceNote from "@/components/custom/SimpleVoiceNote";
import { isMetaWhatsAppCloudApiSession } from "@/utils/whatsappSession";
import { whatsappConnectionBadgeLabel, isWhapiLinkedWhatsApp, whapiQuoteMessageIdFromMessage } from "@/utils/whatsappInboxLabels";
import { getConversationUiPlatform } from "@/utils/conversationUiPlatform";
import WhapiInboxToolbar from "@/components/chatInbox/WhapiInboxToolbar";
import MessageQuotedPreview from "@/components/chatInbox/MessageQuotedPreview";
import { putWhapiMessageReaction } from "@/api/whapiInboxApi";

dayjs.extend(isToday);
dayjs.extend(isYesterday);
dayjs.extend(relativeTime);

function chatInboxUrlLooksLikeVideo(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const u = url.toLowerCase();
  if (/\.(mp3|wav|ogg|opus|m4a|aac)(\?|#|$)/i.test(u)) return false;
  if (/\.(mp4|webm|mov|m4v|3gp)(\?|#|$)/i.test(u)) return true;
  return u.includes('/video/upload/');
}

const SystemMessage = ({ text }: { text: string }) => ( 
  <div className="flex items-center justify-center my-4">
    <div className="text-center text-xs px-4 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 break-words">
      <FormattedText text={text} />
    </div>
  </div> 
);
const useDebounce = (value: string, delay: number) => { const [debouncedValue, setDebouncedValue] = useState(value); useEffect(() => { const handler = setTimeout(() => { setDebouncedValue(value); }, delay); return () => { clearTimeout(handler); }; }, [value, delay]); return debouncedValue; };

// 🔧 Detect language from text so AI suggestion keeps the same language (no conversion to English)
function detectLanguageFromText(text: string): string | undefined {
  if (!text?.trim()) return undefined;
  const t = text.trim();
  if (/[\u0980-\u09FF]/.test(t)) return 'bn';
  if (/[áéíóúñü¿¡]|(\b(el|la|los|las|de|que|es|en|un|una|por|con|no|una|su|al|lo|como|más|pero|sus|le|ya|o|fue|porque|esta|entre|cuando|muy|sin|sobre|también|me|hasta|hay|donde|han|quien|desde|todo|nos|durante|estados|otros|ese|eso|ante|ellos|e|esto|mí|antes|algunos|qué|unos|yo|otro|otras|otra|él|tanto|esa|estos|mucho|quienes|nada|ser|esos|tres|ni|él|esa|estas|algunas|del|contra|nosotros|está|bien|puede|sólo|tan|así|mismo|después|año|dos|aún|uno|bajo|cuatro|nueva|nuevo|sí|sido|parte|tiempo|ella|sí|día|uno|bien|poco|debe|entonces|están|cinco|nuestro|vida|quiere|sabe|gran|nuestra|hacer|nuestros|forma|caso|manera|otro|muchos|después|otros|aunque|esa|eso|años|contra|estado|desde|todo|nos|durante|primero|desde|esa|estos|ni|nosotros|él|ella|eso|sí|también|cuando|muy|sin|sobre|también|me|hasta|hay|donde)\b)/i.test(t)) return 'es';
  return undefined;
}

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
      draggable={false}
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
  const [activePlatform, setActivePlatform] = useState<'all' | 'website' | 'whatsapp'>('all');
  const [activeInboxView, setActiveInboxView] = useState<'all' | 'mine' | 'team' | 'unassigned'>('all');
  const [isTyping] = useState<{ [key: string]: boolean }>({});
  // 🔧 NEW: Dialog states for enhanced features
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [closeAllOpenDialogOpen, setCloseAllOpenDialogOpen] = useState(false);
  const [closeAllOpenLoading, setCloseAllOpenLoading] = useState(false);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [improveLoading, setImproveLoading] = useState(false);
  const [snippetSuggestions, setSnippetSuggestions] = useState<SuggestItem[]>([]);
  const [snippetSuggestLoading, setSnippetSuggestLoading] = useState(false);
  const snippetQueryRef = useRef<string | null>(null);
  const [whapiReplyTo, setWhapiReplyTo] = useState<{ id: string; preview: string } | null>(null);

  // META: 24h session + template + opt-in (Meta WhatsApp Business only; hidden for Unipile WhatsApp – same as ChatInbox)
  const [whatsappSession, setWhatsappSession] = useState<{
    withinWindow: boolean;
    hoursRemaining: number;
    lastMessageTimestamp: string | null;
    requiresTemplate: boolean;
    optIn?: { status: 'opted_in' | 'opted_out' | 'pending'; optedInAt?: string | null; optedOutAt?: string | null; optInSource?: string | null };
    source?: 'meta' | 'unipile' | 'whapi';
  } | null>(null);
  const [whatsappTemplates, setWhatsappTemplates] = useState<{ id?: string; name: string; status?: string; language?: string }[]>([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('');
  const [templateBodyParam, setTemplateBodyParam] = useState('');
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const [optInUpdating, setOptInUpdating] = useState(false);
  const [showOptInSource, setShowOptInSource] = useState(false);
  const [optInSourceValue, setOptInSourceValue] = useState('');

  const messageListRef = useRef<HTMLDivElement | null>(null);
  const activeInboxViewRef = useRef(activeInboxView);
  useEffect(() => {
    activeInboxViewRef.current = activeInboxView;
  }, [activeInboxView]);
  const prevScrollHeightRef = useRef<number>(0);
  const [isInitialMessageLoad, setIsInitialMessageLoad] = useState(true);
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null);
  
  // 🔧 NEW: State for image upload
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const pdfObjectUrlRef = useRef<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const videoObjectUrlRef = useRef<string | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  /** Shown when native <audio> blob metadata is 0:00 (common for WebM). */
  const [outboundAudioDurationSec, setOutboundAudioDurationSec] = useState<number | null>(null);
  const audioObjectUrlRef = useRef<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const revokePdfPreviewUrl = useCallback(() => {
    if (pdfObjectUrlRef.current) {
      URL.revokeObjectURL(pdfObjectUrlRef.current);
      pdfObjectUrlRef.current = null;
    }
    setPdfPreviewUrl(null);
  }, []);

  const revokeVideoPreviewUrl = useCallback(() => {
    if (videoObjectUrlRef.current) {
      URL.revokeObjectURL(videoObjectUrlRef.current);
      videoObjectUrlRef.current = null;
    }
    setVideoPreviewUrl(null);
  }, []);

  const revokeAudioPreviewUrl = useCallback(() => {
    if (audioObjectUrlRef.current) {
      URL.revokeObjectURL(audioObjectUrlRef.current);
      audioObjectUrlRef.current = null;
    }
    setAudioPreviewUrl(null);
  }, []);

  useEffect(() => {
    return () => {
      if (pdfObjectUrlRef.current) {
        URL.revokeObjectURL(pdfObjectUrlRef.current);
        pdfObjectUrlRef.current = null;
      }
      if (videoObjectUrlRef.current) {
        URL.revokeObjectURL(videoObjectUrlRef.current);
        videoObjectUrlRef.current = null;
      }
      if (audioObjectUrlRef.current) {
        URL.revokeObjectURL(audioObjectUrlRef.current);
        audioObjectUrlRef.current = null;
      }
    };
  }, []);

  const { user }: any = useSelector((state: RootState) => state.auth);
  const { channels } = useSelector((state: RootState) => state.channel);
  const { agents } = useSelector((state: RootState) => state.humanAgent);
  const { conversations, status: agentInboxStatus, currentPage, totalPages, inboxQueueCounts } = useSelector(
    (state: RootState) => state.agentInbox
  );
  const messagesData = useSelector((state: RootState) => selectedCustomer ? state.chatInbox.chatData[selectedCustomer] : null);
  const socketReconnectCount = useSelector((state: RootState) => state.socket?.reconnectCount ?? 0);

  const businessId = user?.businessId;
  const agentId = user?._id;
  const debouncedSearchQuery = useDebounce(searchInput, 500);

  const listFetchParamsRef = useRef({
    debouncedSearchQuery: '',
    activeFilter: 'open' as 'open' | 'closed',
    activePlatform: 'all' as 'all' | 'website' | 'whatsapp',
    activeInboxView: 'all' as 'all' | 'mine' | 'team' | 'unassigned',
    /** Must match Redux list pagination so socket/reconnect refetch does not replace the list with page 1 only (drops open chat from page 2+ and unmounts the composer). */
    listCurrentPage: 1,
  });
  useEffect(() => {
    listFetchParamsRef.current = {
      debouncedSearchQuery,
      activeFilter,
      activePlatform,
      activeInboxView,
      listCurrentPage: currentPage,
    };
  }, [debouncedSearchQuery, activeFilter, activePlatform, activeInboxView, currentPage]);

  /** Coalesce socket-driven full list refetches so Whapi/history bursts do not N× hit GET /agents/my-conversations (each loads Unipile). */
  const socketOpenListRefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefetchOpenAgentListFromSocket = useCallback(() => {
    if (socketOpenListRefetchTimerRef.current) {
      clearTimeout(socketOpenListRefetchTimerRef.current);
    }
    socketOpenListRefetchTimerRef.current = setTimeout(() => {
      socketOpenListRefetchTimerRef.current = null;
      const p = listFetchParamsRef.current;
      dispatch(
        fetchAgentConversations({
          page: p.listCurrentPage,
          searchQuery: p.debouncedSearchQuery,
          status: p.activeFilter,
          platform: p.activePlatform,
          inboxView: p.activeInboxView,
          includeCounts: true,
        })
      );
    }, 650);
  }, [dispatch]);

  /** Backend emits after assign / release / transfer (see agentInboxCounts.ts). */
  const handleAgentInboxCountsUpdated = useCallback(
    (data: { businessId?: string; counts?: AgentInboxQueueCounts }) => {
      if (!businessId || !data?.counts) return;
      if (String(data.businessId) !== String(businessId)) return;
      dispatch(setInboxQueueCountsFromSocket(data.counts));
    },
    [businessId, dispatch]
  );

  /**
   * Full list refetch kicks the agent out of the open chat: after fetch, selectedCustomer is cleared if the
   * row is missing from the current page. Tab counts already update via `agentInboxCountsUpdated` — only
   * refetch the list when no chat is open; new rows also arrive via `newConversation` + `newMessage`.
   */
  const handleAgentInboxCountsRefresh = useCallback(
    (data: { businessId?: string }) => {
      if (!businessId || !data?.businessId) return;
      if (String(data.businessId) !== String(businessId)) return;
      if (selectedCustomer) return;
      scheduleRefetchOpenAgentListFromSocket();
    },
    [businessId, selectedCustomer, scheduleRefetchOpenAgentListFromSocket]
  );

  // 🔧 OPTIMIZED: Memoize conversation lookup to avoid repeated finds
  const currentConversation = useMemo(() => { 
    if (!Array.isArray(conversations)) return null; 
    return conversations.find((c) => c.customer?.id === selectedCustomer); 
  }, [conversations, selectedCustomer]);

  // Only drop selection after a successful list load. Avoid idle/empty during reset→fetch (that briefly clears rows and set status idle).
  useEffect(() => {
    if (!selectedCustomer) return;
    if (agentInboxStatus !== 'succeeded') return;
    const inList = Array.isArray(conversations) && conversations.some((c) => c.customer?.id === selectedCustomer);
    if (!inList) setSelectedCustomer(null);
  }, [conversations, selectedCustomer, agentInboxStatus]);
  
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

  const whapiChatJidFromMessages = useMemo(() => {
    const list = messagesData?.list || [];
    for (let i = list.length - 1; i >= 0; i--) {
      const cid = (list[i] as any)?.metadata?.chatId;
      if (typeof cid === 'string' && cid.trim()) return cid.trim();
    }
    return null as string | null;
  }, [messagesData?.list]);

  const isWaThread = useMemo(
    () =>
      String(currentConversation?.platformInfo?.platform || (currentConversation as any)?.source || '')
        .toLowerCase()
        .trim() === 'whatsapp',
    [currentConversation]
  );

  const chatSurfacePlatform = useMemo(
    () => getConversationUiPlatform(currentConversation ?? null),
    [currentConversation]
  );

  const isWhapiWaThread = useMemo(
    () => isWaThread && isWhapiLinkedWhatsApp(currentConversation?.whatsappConnection),
    [isWaThread, currentConversation?.whatsappConnection]
  );

  useEffect(() => {
    setWhapiReplyTo(null);
  }, [selectedCustomer]);

  useEffect(() => { dayjs.locale(i18n.language); }, [i18n.language]);
  
  useEffect(() => { 
    if (businessId) { 
        dispatch(fetchChannels()); 
    } 
  }, [businessId, dispatch]);

  // Fetch agent status once when businessId is set; do NOT depend on agents or it re-runs after every fetch → infinite loop
  useEffect(() => {
    if (businessId) {
      dispatch(fetchAgentsWithStatus());
    }
  }, [businessId, dispatch]);
  
  useEffect(() => {
    if (agentId) {
      dispatch(resetAgentConversations());
      dispatch(
        fetchAgentConversations({
          page: 1,
          searchQuery: debouncedSearchQuery,
          status: activeFilter,
          platform: activePlatform,
          inboxView: activeInboxView,
          includeCounts: true,
        })
      );
    }
  }, [dispatch, agentId, debouncedSearchQuery, activeFilter, activePlatform, activeInboxView]);

  // 🔧 Refetch agent chat list when socket reconnects so realtime updates resume (e.g. after 5+ min idle)
  useEffect(() => {
    if (socketReconnectCount > 0 && agentId) {
      const p = listFetchParamsRef.current;
      dispatch(
        fetchAgentConversations({
          page: p.listCurrentPage,
          searchQuery: p.debouncedSearchQuery,
          status: p.activeFilter,
          platform: p.activePlatform,
          inboxView: p.activeInboxView,
          includeCounts: true,
        })
      );
    }
  }, [socketReconnectCount, dispatch, agentId]);

  useEffect(() => { if (selectedCustomer) { setIsInitialMessageLoad(true); dispatch(fetchMessagesByCustomer({ customerId: selectedCustomer, page: 1 })); } }, [selectedCustomer, dispatch]);

  useEffect(
    () => () => {
      if (socketOpenListRefetchTimerRef.current) {
        clearTimeout(socketOpenListRefetchTimerRef.current);
      }
    },
    []
  );

  // 🔧 Audio: when API doesn't return audioSrc, fetch play URL on demand so playback works
  const [audioUrlByMessageId, setAudioUrlByMessageId] = useState<Record<string, string>>({});
  const audioFetchRequestedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!selectedCustomer) {
      setAudioUrlByMessageId({});
      audioFetchRequestedRef.current = new Set();
      return;
    }
    const list = messagesData?.list || [];
    const toFetch: string[] = [];
    for (const msg of list) {
      const isAudio = msg.messageType === 'audio' || msg.text === '🎵 Audio' || msg.metadata?.messageType === 'audio';
      if (!isAudio || !msg._id) continue;
      const hasUrlFromApi = !!(msg.audioSrc ?? msg.audioPlayUrl ?? msg.cloudinaryUrl ?? msg.mediaUrl ?? msg.proxyUrl);
      if (!hasUrlFromApi && !audioFetchRequestedRef.current.has(msg._id)) toFetch.push(msg._id);
    }
    if (toFetch.length === 0) return;
    toFetch.forEach((id) => audioFetchRequestedRef.current.add(id));
    let cancelled = false;
    toFetch.forEach((id) => {
      getAudioPlayUrlApi(id).then((url) => {
        if (!cancelled && url) setAudioUrlByMessageId((prev) => ({ ...prev, [id]: url }));
      }).catch(() => {});
    });
    return () => { cancelled = true; };
  }, [selectedCustomer, messagesData?.list]);

  // Quick responses: when user types "/", fetch snippet suggestions (debounced)
  useEffect(() => {
    const raw = (newMessage || '').trim();
    if (!raw.startsWith('/')) {
      setSnippetSuggestions([]);
      snippetQueryRef.current = null;
      return;
    }
    const query = raw.slice(1).replace(/\s.*$/, '').toLowerCase();
    snippetQueryRef.current = query;
    const timer = setTimeout(async () => {
      try {
        setSnippetSuggestLoading(true);
        const list = await suggestQuickResponses(query, 10);
        if (snippetQueryRef.current === query) setSnippetSuggestions(list);
      } catch {
        if (snippetQueryRef.current === query) setSnippetSuggestions([]);
      } finally {
        if (snippetQueryRef.current === query) setSnippetSuggestLoading(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [newMessage]);

  // META: Fetch WhatsApp 24h session (and templates for Meta only); hide 24h/opt-in UI for Unipile (same as ChatInbox)
  useEffect(() => {
    const conv = conversations.find((c) => c.customer?.id === selectedCustomer);
    const platform = getConversationUiPlatform(conv ?? null);
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
            source: session.source,
          });
        }
        if (connectionId && !cancelled && isMetaWhatsAppCloudApiSession(session.source)) {
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
  }, [selectedCustomer, conversations]);
  
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
      await markConversationAsRead(conversationId);
    } catch (error: any) {
      console.error('Failed to mark as read:', error);
    }
  }, []);
  
  // 🔧 OPTIMIZED: Update priority (using memoized currentConversation)
  const handleUpdatePriority = useCallback(async (priority: 'low' | 'normal' | 'high' | 'urgent') => {
    if (!currentConversation?.id) return;
    try {
      await updateConversationPriorityApi(currentConversation.id, priority);
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
      await updateConversationTagsApi(currentConversation.id, tags);
      dispatch(updateConversationEnhanced({ conversationId: currentConversation.id, tags }));
      toast.success('Tags updated');
      setTagsDialogOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update tags');
    }
  }, [currentConversation, dispatch]);
  
  // 🔧 Send internal note as a message so it appears in the chat flow (chronologically), not only at the top
  const handleSendInternalNote = useCallback(async (noteText: string) => {
    if (!currentConversation?.id || !noteText?.trim()) return;
    try {
      await sendInternalNoteApi(currentConversation.id, noteText.trim());
      toast.success(t('agentInbox.noteSent', 'Note sent'));
      setNotesDialogOpen(false);
      // Message will appear in the list via socket newMessage
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send note');
    }
  }, [currentConversation, t]);
  
  // 🔧 OPTIMIZED: Assign conversation (using memoized currentConversation)
  const handleAssignConversation = useCallback(
    async (targetAgentId: string) => {
      if (!currentConversation?.id) return;
      try {
        await assignConversationApi(currentConversation.id, targetAgentId);
        dispatch(
          updateConversationEnhanced({
            conversationId: currentConversation.id,
            assignedAgentId: targetAgentId,
            status: 'live',
            unreadCount: 0,
          })
        );
        toast.success(t('agentInbox.toastAssignSuccess', 'Conversation assigned'));
        scheduleRefetchOpenAgentListFromSocket();
      } catch (error: any) {
        toast.error(error.response?.data?.message || t('agentInbox.toastAssignFailed', 'Failed to assign conversation'));
      }
    },
    [currentConversation, dispatch, t, scheduleRefetchOpenAgentListFromSocket]
  );

  const handleReleaseToQueue = useCallback(async () => {
    if (!currentConversation?.id || !agentId) return;
    try {
      await releaseConversationToQueue(currentConversation.id);
      dispatch(
        updateConversationEnhanced({
          conversationId: currentConversation.id,
          assignedAgentId: undefined,
        })
      );
      toast.success(t('agentInbox.toastReleaseSuccess', 'Conversation released to the team queue'));
      setSelectedCustomer(null);
      scheduleRefetchOpenAgentListFromSocket();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('agentInbox.toastReleaseFailed', 'Failed to release conversation'));
    }
  }, [currentConversation, agentId, dispatch, t, scheduleRefetchOpenAgentListFromSocket]);
  
  // 🔧 NEW: Mark conversation as read when opened
  useEffect(() => {
    if (selectedCustomer) {
      const conversation = conversations.find((c) => c.customer?.id === selectedCustomer);
      if (conversation?.id && (conversation?.unreadCount || 0) > 0) {
        handleMarkAsRead(conversation.id);
      }
    }
  }, [selectedCustomer, conversations, handleMarkAsRead]);
  
  // 🔧 OPTIMIZED: Memoize socket event handlers with useCallback (moved outside useEffect)
  const handleNewChatAssigned = useCallback((data: ConversationInList & { channelId?: string }) => {
    console.log('🔔 AgentInbox: Received newChatAssigned event:', data);
    if (!data?.customer) return;

    // Add if assigned to this agent OR assigned to this agent's channel (workflow → channel; we're a channel member)
    const isAssignedToMe = data.assignedAgentId === agentId;
    const isAssignedToMyChannel = !!data.channelId; // backend only emits to channel members, so we're in the channel
    if (isAssignedToMe || isAssignedToMyChannel) {
      const existingConversation = conversations.find(c => c.id === data.id);
      if (!existingConversation) {
        dispatch(addAssignedConversation(data));
        // টোস্ট শুধু DashboardLayout থেকে একবার দেখানো হয় (এখানে আবার দেখালে দুবার আসে)
      } else {
        dispatch(addAssignedConversation(data));
      }
    }
  }, [agentId, conversations, dispatch]);

  // 🔧 OPTIMIZED: Handle conversation updates
  const handleConversationUpdated = useCallback(
    (data: any) => {
      const { conversationId, unreadCount, priority, tags, notes, assignedAgentId, status, channelId, queueState } = data;
      if (conversationId && (status === 'closed' || status === 'CLOSED')) {
        dispatch(removeConversation({ conversationId }));
        scheduleRefetchOpenAgentListFromSocket();
        return;
      }
      console.log('🔔 AgentInbox: Received conversationUpdated event:', data);
      console.log('Current agentId:', agentId);
      console.log('Event assignedAgentId:', assignedAgentId);

      const conversation = conversations.find((c) => c.id === conversationId);
      const view = activeInboxViewRef.current;
      const mine = String(agentId || '');
      const assignee = assignedAgentId != null ? String(assignedAgentId) : '';
      const channelSet =
        channelId != null &&
        String(channelId).trim() !== '' &&
        String(channelId).trim().toLowerCase() !== 'null' &&
        String(channelId).trim().toLowerCase() !== 'undefined';

      if (conversation || assignee === mine) {
        if (conversation) {
          if (view === 'mine' && assignee !== mine) {
            dispatch(removeConversation({ conversationId }));
            scheduleRefetchOpenAgentListFromSocket();
            return;
          }
          const qs = queueState != null ? String(queueState) : null;
          if (view === 'unassigned') {
            if (assignee !== '') {
              dispatch(removeConversation({ conversationId }));
              scheduleRefetchOpenAgentListFromSocket();
              return;
            }
            if (qs != null && qs !== 'pre_department') {
              dispatch(removeConversation({ conversationId }));
              scheduleRefetchOpenAgentListFromSocket();
              return;
            }
          }
          if (view === 'team') {
            if (assignee !== '') {
              dispatch(removeConversation({ conversationId }));
              scheduleRefetchOpenAgentListFromSocket();
              return;
            }
            if (qs != null && qs !== 'team_queue') {
              dispatch(removeConversation({ conversationId }));
              scheduleRefetchOpenAgentListFromSocket();
              return;
            }
          }
          console.log('✅ AgentInbox: Conversation found, updating...');
          dispatch(
            updateConversationEnhanced({
              conversationId,
              unreadCount,
              priority,
              tags,
              notes,
              assignedAgentId,
              status,
              ...(channelSet ? { channelId: String(channelId) } : {}),
              ...(qs != null
                ? { queueState: qs as ConversationInList['queueState'] }
                : {}),
            })
          );
          if (view === 'unassigned' && qs == null && channelSet) {
            scheduleRefetchOpenAgentListFromSocket();
          }
        } else {
          console.log('✅ AgentInbox: Conversation not in list (reopened?), refetching open list');
          scheduleRefetchOpenAgentListFromSocket();
        }
      } else {
        console.log('⚠️ AgentInbox: Conversation not found in list and not assigned to this agent');
        console.log('Conversation ID:', conversationId);
        console.log('Current conversations:', conversations.map((c) => ({ id: c.id, assignedAgentId: c.assignedAgentId })));
      }
    },
    [agentId, conversations, dispatch, scheduleRefetchOpenAgentListFromSocket]
  );

  // 🔧 OPTIMIZED: Handle conversation assignment — ensure inbox updates in real time without refresh
  const handleConversationAssigned = useCallback((data: any) => {
    const { conversationId, assignedAgentId, previousAgentId } = data;
    console.log('🔔 AgentInbox: Received conversationAssigned event:', data);
    
    // If this conversation was transferred away from this agent, remove it
    if (previousAgentId === agentId && assignedAgentId !== agentId) {
      dispatch(removeConversation({ conversationId }));
      return;
    }
    // If this conversation was assigned to this agent, update it or add it
    if (assignedAgentId === agentId) {
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        dispatch(updateConversationEnhanced({
          conversationId,
          assignedAgentId,
          status: 'live',
          unreadCount: 0
        }));
      } else {
        // Not in list yet: refetch agent conversations so the new assignment appears immediately (no manual refresh)
        scheduleRefetchOpenAgentListFromSocket();
      }
    }
  }, [agentId, conversations, dispatch, scheduleRefetchOpenAgentListFromSocket]);

  // 🔧 OPTIMIZED: Handle conversation removal
  const handleConversationRemoved = useCallback((data: { conversationId: string }) => {
    dispatch(removeConversation(data));
  }, [dispatch]);

  const handleConversationClosedByAgent = useCallback((data: { conversationId?: string }) => {
    if (data?.conversationId) dispatch(removeConversation({ conversationId: data.conversationId }));
  }, [dispatch]);

  // 🔧 PRODUCTION: Real-time newMessage handler so chat updates without refresh (redundant with layout but ensures agent inbox always receives)
  const handleNewMessage = useCallback((data: any) => {
    const customerId = data?.customerId ?? data?.customer_id;
    const sender = data?.sender ?? data.senderType;
    const messageText = data?.message ?? data?.text ?? '';
    const conversationId = data?.conversationId;
    if (!customerId || !sender) return;
    const socket = getSocket();
    if (data?.senderSocketId && data.senderSocketId === socket?.id) return; // skip own sends
    const formattedMessage = {
      _id: data._id ?? data.id,
      text: messageText,
      sentBy: sender,
      time: data.createdAt ?? data.timestamp ?? new Date().toISOString(),
      messageType: data.messageType ?? data.metadata?.messageType ?? 'text',
      mediaUrl: data.mediaUrl ?? data.metadata?.mediaUrl ?? data.metadata?.cloudinaryUrl ?? null,
      cloudinaryUrl: data.cloudinaryUrl ?? data.metadata?.cloudinaryUrl ?? null,
      originalMediaUrl: data.originalMediaUrl ?? data.metadata?.originalMediaUrl ?? null,
      proxyUrl: normalizeApiMediaUrl(data.proxyUrl ?? data.metadata?.proxyUrl) ?? data.proxyUrl ?? data.metadata?.proxyUrl ?? null,
      attachmentId: data.attachmentId ?? data.metadata?.attachmentId ?? null,
      audioUrl: data.audioUrl ?? data.metadata?.audioUrl ?? null,
      audioSrc: normalizeApiMediaUrl(data.audioSrc ?? data.metadata?.audioSrc) ?? data.audioSrc ?? data.metadata?.audioSrc ?? null,
      audioPlayUrl: normalizeApiMediaUrl(data.audioPlayUrl ?? data.metadata?.audioPlayUrl) ?? data.audioPlayUrl ?? data.metadata?.audioPlayUrl ?? null,
      metadata: data.metadata ?? {},
      status: data.status,
    };
    const conversationSource =
      typeof data.source === 'string' && data.source.trim()
        ? data.source.trim()
        : typeof data.metadata?.platform === 'string' && data.metadata.platform.trim()
          ? String(data.metadata.platform).trim()
          : undefined;
    dispatch(
      addRealtimeMessage({
        customerId: String(customerId),
        message: formattedMessage,
        ...(conversationSource ? { conversationSource } : {}),
      })
    );
    if (conversationId) {
      const inList = conversations.some(c => c.id === String(conversationId));
      if (inList) {
        dispatch(
          updateConversationPreview({
            conversationId: String(conversationId),
            preview: messageText,
            latestMessageTimestamp: data.createdAt ?? data.timestamp ?? new Date().toISOString(),
            ...(conversationSource ? { conversationSource } : {}),
            messageMetadata: formattedMessage.metadata ?? undefined,
          })
        );
      } else if (String(customerId) !== String(selectedCustomer ?? '')) {
        // Not in current page / view — refetch so it appears. Skip when this message is for the open thread:
        // refetch can replace the list and clear selection via the "customer not in list" effect.
        scheduleRefetchOpenAgentListFromSocket();
      }
    }
  }, [conversations, dispatch, scheduleRefetchOpenAgentListFromSocket, selectedCustomer]);

  // 🔧 OPTIMIZED: Real-time event listeners for conversation updates and transfers
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !agentId) return;

    socket.on('newMessage', handleNewMessage);
    socket.on('newChatAssigned', handleNewChatAssigned);
    socket.on('conversationUpdated', handleConversationUpdated);
    socket.on('conversationAssigned', handleConversationAssigned);
    socket.on('conversationRemoved', handleConversationRemoved);
    socket.on('conversationClosedByAgent', handleConversationClosedByAgent);
    socket.on('agentInboxCountsUpdated', handleAgentInboxCountsUpdated);
    socket.on('agentInboxCountsRefresh', handleAgentInboxCountsRefresh);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('newChatAssigned', handleNewChatAssigned);
      socket.off('conversationUpdated', handleConversationUpdated);
      socket.off('conversationAssigned', handleConversationAssigned);
      socket.off('conversationRemoved', handleConversationRemoved);
      socket.off('conversationClosedByAgent', handleConversationClosedByAgent);
      socket.off('agentInboxCountsUpdated', handleAgentInboxCountsUpdated);
      socket.off('agentInboxCountsRefresh', handleAgentInboxCountsRefresh);
    };
  }, [
    agentId,
    handleNewMessage,
    handleNewChatAssigned,
    handleConversationUpdated,
    handleConversationAssigned,
    handleConversationRemoved,
    handleConversationClosedByAgent,
    handleAgentInboxCountsUpdated,
    handleAgentInboxCountsRefresh,
  ]);
  
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

  const {
    isRecording,
    isPaused,
    recordingSeconds,
    supportsPause,
    startRecording,
    stopRecording,
    cancelRecording,
    pauseRecording,
    resumeRecording,
  } = useVoiceRecorder();
  const VOICE_MAX_SECONDS = 300;
  const hitVoiceMaxRef = useRef(false);

  const attachAudioFile = useCallback(
    (file: File, recordedDurationSec?: number) => {
      if (file.size > 16 * 1024 * 1024) {
        toast.error('File size must be less than 16MB');
        return;
      }
      setSelectedImageFile(file);
      setImagePreview(null);
      revokePdfPreviewUrl();
      revokeVideoPreviewUrl();
      revokeAudioPreviewUrl();
      const url = URL.createObjectURL(file);
      audioObjectUrlRef.current = url;
      setAudioPreviewUrl(url);
      if (typeof recordedDurationSec === 'number' && recordedDurationSec >= 0) {
        setOutboundAudioDurationSec(Math.round(recordedDurationSec));
      } else {
        setOutboundAudioDurationSec(null);
      }
    },
    [revokePdfPreviewUrl, revokeVideoPreviewUrl, revokeAudioPreviewUrl]
  );

  useEffect(() => {
    if (!isRecording) {
      hitVoiceMaxRef.current = false;
      return;
    }
    if (recordingSeconds < VOICE_MAX_SECONDS || hitVoiceMaxRef.current) return;
    hitVoiceMaxRef.current = true;
    void stopRecording().then(async ({ file, activeDurationSec }) => {
      if (file) {
        const d = await resolveVoiceAttachmentDurationSeconds(file, activeDurationSec);
        attachAudioFile(file, d);
        toast.success(t('chatInbox.voiceMaxLength', 'Maximum recording length — preview added'));
      }
    });
  }, [isRecording, recordingSeconds, stopRecording, attachAudioFile, t]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    if (!isImage && !isPdf && !isVideo && !isAudio) {
      toast.error('Please select an image, video, audio, or PDF file');
      return;
    }

    if (file.size > 16 * 1024 * 1024) {
      toast.error('File size must be less than 16MB');
      return;
    }

    setSelectedImageFile(file);

    if (isPdf) {
      setImagePreview(null);
      revokeVideoPreviewUrl();
      revokeAudioPreviewUrl();
      revokePdfPreviewUrl();
      const url = URL.createObjectURL(file);
      pdfObjectUrlRef.current = url;
      setPdfPreviewUrl(url);
      return;
    }
    if (isVideo) {
      setImagePreview(null);
      revokePdfPreviewUrl();
      revokeVideoPreviewUrl();
      revokeAudioPreviewUrl();
      const url = URL.createObjectURL(file);
      videoObjectUrlRef.current = url;
      setVideoPreviewUrl(url);
      return;
    }
    if (isAudio) {
      attachAudioFile(file);
      return;
    }
    revokePdfPreviewUrl();
    revokeVideoPreviewUrl();
    revokeAudioPreviewUrl();
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, [revokePdfPreviewUrl, revokeVideoPreviewUrl, revokeAudioPreviewUrl, attachAudioFile]);

  const handleRemoveImage = useCallback(() => {
    revokePdfPreviewUrl();
    revokeVideoPreviewUrl();
    revokeAudioPreviewUrl();
    setSelectedImageFile(null);
    setImagePreview(null);
    setOutboundAudioDurationSec(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [revokePdfPreviewUrl, revokeVideoPreviewUrl, revokeAudioPreviewUrl]);

  const handleSendMessage = useCallback(async () => {
    if (isRecording) return;
    if ((!newMessage.trim() && !selectedImageFile) || !selectedCustomer || !businessId || !currentConversation) return;

    const socket = getSocket();
    if (socket?.connected && selectedCustomer) socket.emit('agentStoppedTyping', { customerId: selectedCustomer });

    const platform = getConversationUiPlatform(currentConversation);
    const messageText = newMessage.trim();
    // Media fields only after attachment upload; pasted links are sent as normal text (`message`), never as imageUrl/mediaUrl.
    let mediaUrl: string | null = null;
    let uploadedKind: 'image' | 'video' | 'document' | 'audio' | null = null;
    let documentFilename: string | undefined;

    if (selectedImageFile) {
      setIsUploadingImage(true);
      try {
        const result = await uploadChatAttachmentApi(selectedImageFile);
        mediaUrl = result.url;
        uploadedKind = result.messageType;
        if (result.messageType === 'document') {
          documentFilename = result.fileName || selectedImageFile.name;
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to upload file');
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
    }
    
    setNewMessage("");
    handleRemoveImage();

    // For website conversations, use internal messaging
    if (platform === 'website' || !platform) {
      if (!socket) {
        toast.error('Connection error. Please refresh the page.');
        return;
      }
      dispatch(
        sendHumanMessage({
          businessId,
          customerId: selectedCustomer,
          message: messageText,
          senderSocketId: socket.id ?? "",
          ...(currentConversation?.id ? { conversationId: currentConversation.id } : {}),
        })
      )
        .unwrap()
        .catch((error) => toast.error(error || t('chatInbox.toastMessageFailed')));
      return;
    }

    // Instagram, WhatsApp, Telegram — same endpoint as business Chat Inbox (Unipile / Whapi / Meta routing on server)
    if (platform === 'instagram' || platform === 'whatsapp' || platform === 'telegram') {
      const clientRequestId = crypto.randomUUID();
      const outboundPreview =
        messageText ||
        (mediaUrl
          ? uploadedKind === 'document'
            ? '📄 Document'
            : uploadedKind === 'video'
              ? '🎥 Video'
              : uploadedKind === 'audio'
                ? '🎵 Audio'
                : '📷 Image'
          : '');
      dispatch(
        addOutboundPendingMessage({
          customerId: selectedCustomer,
          clientRequestId,
          text: outboundPreview,
          messageType: mediaUrl
            ? uploadedKind === 'document'
              ? 'document'
              : uploadedKind === 'video'
                ? 'video'
                : uploadedKind === 'audio'
                  ? 'audio'
                  : 'image'
            : 'text',
        })
      );
      if (currentConversation?.id) {
        dispatch(
          updateConversationPreview({
            conversationId: currentConversation.id,
            preview: outboundPreview,
            latestMessageTimestamp: new Date().toISOString(),
          })
        );
      }
      try {
        const payload: Parameters<typeof sendMessageViaConversation>[0] = {
          conversationId: currentConversation.id,
          message:
            messageText ||
            (mediaUrl
              ? uploadedKind === 'document'
                ? '📄 Document'
                : uploadedKind === 'video'
                  ? '🎥 Video'
                  : uploadedKind === 'audio'
                    ? '🎵 Audio'
                    : '📷 Image'
              : ''),
          businessId: businessId,
          clientRequestId,
          ...(!mediaUrl ? { messageType: 'text' as const } : {}),
        };
        if (mediaUrl) {
          if (uploadedKind === 'document') {
            payload.mediaUrl = mediaUrl;
            payload.messageType = 'document';
            const fn = documentFilename || 'document.pdf';
            payload.documentFilename = fn;
            payload.filename = fn;
          } else if (uploadedKind === 'video') {
            payload.mediaUrl = mediaUrl;
            payload.messageType = 'video';
          } else if (uploadedKind === 'audio') {
            payload.audioUrl = mediaUrl;
            payload.messageType = 'audio';
            if (isWhapiLinkedWhatsApp(currentConversation?.whatsappConnection)) {
              payload.whapiAudioDelivery = 'voice';
            }
          } else {
            payload.imageUrl = mediaUrl;
            payload.messageType = 'image';
          }
        }
        if (isWhapiLinkedWhatsApp(currentConversation?.whatsappConnection) && whapiReplyTo?.id) {
          payload.quotedWhapiMessageId = whapiReplyTo.id;
          if (whapiReplyTo.preview?.trim()) payload.quotedPreviewText = whapiReplyTo.preview.trim().slice(0, 500);
        }
        await sendMessageViaConversation(payload);
        if (isWhapiLinkedWhatsApp(currentConversation?.whatsappConnection)) setWhapiReplyTo(null);
        toast.success(
          mediaUrl
            ? uploadedKind === 'document'
              ? 'PDF sent!'
              : uploadedKind === 'video'
                ? 'Video sent!'
                : uploadedKind === 'audio'
                  ? 'Voice sent!'
                  : 'Image sent!'
            : 'Message sent!'
        );
      } catch (error: any) {
        dispatch(removeOutboundPendingMessage({ customerId: selectedCustomer, clientRequestId }));
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
          const errPayload = error.response?.data?.error;
          if (errPayload?.code === 'REQUIRES_TEMPLATE' || errPayload?.requiresTemplate) {
            setWhatsappSession((prev) =>
              prev
                ? { ...prev, requiresTemplate: true }
                : {
                    withinWindow: false,
                    hoursRemaining: 0,
                    lastMessageTimestamp: null,
                    requiresTemplate: true,
                  }
            );
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
    dispatch(
      sendHumanMessage({
        businessId,
        customerId: selectedCustomer,
        message: messageText,
        senderSocketId: socket.id ?? "",
        ...(currentConversation?.id ? { conversationId: currentConversation.id } : {}),
      })
    )
      .unwrap()
      .catch((error) => toast.error(error || t('chatInbox.toastMessageFailed')));
  }, [
    newMessage,
    selectedCustomer,
    businessId,
    currentConversation,
    dispatch,
    t,
    selectedImageFile,
    handleRemoveImage,
    whapiReplyTo,
    isRecording,
  ]);

  const handleTransfer = async (target: { type: 'agent' | 'channel', id: string }) => {
    if (!currentConversation?.id) { toast.error(t('chatInbox.toastTransferNoId')); return; }
    const payload = target.type === 'agent' ? { targetAgentId: target.id } : { targetChannelId: target.id };
    const promise = api.post(`/api/v1/conversations/${currentConversation.id}/transfer`, payload);
    toast.promise(promise, { loading: t('chatInbox.toastTransferLoading'), success: t('chatInbox.toastTransferSuccess'), error: (err: any) => err.response?.data?.message || t('chatInbox.toastTransferFailed') });
  };

  const handleCloseConversation = () => { if (currentConversation?.id && businessId) { dispatch(closeConversation({ conversationId: currentConversation.id, businessId })).unwrap().then(() => { toast.success(t('chatInbox.toastCloseSuccess')); setSelectedCustomer(null); }).catch(err => toast.error(err || t('chatInbox.toastCloseFailed'))); } };

  const handleConfirmCloseAllOpen = useCallback(async () => {
    if (!agentId) return;
    setCloseAllOpenLoading(true);
    try {
      const r = await dispatch(closeAllOpenAgentConversations()).unwrap();
      toast.success(t('agentInbox.closeAllOpenSuccess', { count: r.closed }));
      if (r.failed > 0) {
        toast.error(t('agentInbox.closeAllOpenSomeFailed', { count: r.failed }));
      }
      setSelectedCustomer(null);
      setCloseAllOpenDialogOpen(false);
      await dispatch(
        fetchAgentConversations({
          page: 1,
          searchQuery: debouncedSearchQuery,
          status: activeFilter,
          platform: activePlatform,
          inboxView: activeInboxView,
          includeCounts: true,
        })
      ).unwrap();
    } catch (err: unknown) {
      toast.error(typeof err === 'string' ? err : t('agentInbox.closeAllOpenFailed'));
    } finally {
      setCloseAllOpenLoading(false);
    }
  }, [agentId, dispatch, debouncedSearchQuery, activeFilter, activePlatform, activeInboxView, t]);

  // 🔧 OPTIMIZED: Memoize pagination handlers
  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages && agentId) {
      dispatch(
        fetchAgentConversations({
          page: currentPage + 1,
          searchQuery: debouncedSearchQuery,
          status: activeFilter,
          platform: activePlatform,
          inboxView: activeInboxView,
          includeCounts: true,
        })
      );
    }
  }, [currentPage, totalPages, agentId, dispatch, debouncedSearchQuery, activeFilter, activePlatform, activeInboxView]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1 && agentId) {
      dispatch(
        fetchAgentConversations({
          page: currentPage - 1,
          searchQuery: debouncedSearchQuery,
          status: activeFilter,
          platform: activePlatform,
          inboxView: activeInboxView,
          includeCounts: true,
        })
      );
    }
  }, [currentPage, agentId, dispatch, debouncedSearchQuery, activeFilter, activePlatform, activeInboxView]);

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
      <div className="agent-inbox-no-shadow grid grid-cols-1 lg:grid-cols-[350px_1fr] h-screen w-full gap-4 lg:gap-6 p-4 lg:p-6">
        <aside className={cn(
          "flex flex-col border p-4 rounded-xl max-h-screen transition-colors",
          activePlatform === 'whatsapp' ? "chat-bg-whatsapp border-[#d4c5b7] dark:border-[#1e2a32]" :
          activePlatform === 'website' ? "chat-bg-website border-border" :
          "bg-card border-border"
        )}>
          <h1 className="text-2xl font-bold mb-4 px-2">{t('agentInbox.title')}</h1>

          {/* Queue scope: All / Mine / Team / Unassigned (matches GET /agents/my-conversations inboxView) */}
          <div className="flex items-center gap-1 mb-2 p-1 bg-muted/70 rounded-lg overflow-x-auto scrollbar-hide">
            {(['all', 'mine', 'team', 'unassigned'] as const).map((key) => {
              const openCount =
                activeFilter === 'open' && inboxQueueCounts
                  ? key === 'all'
                    ? inboxQueueCounts.all
                    : key === 'mine'
                      ? inboxQueueCounts.mine
                      : key === 'team'
                        ? inboxQueueCounts.team
                        : inboxQueueCounts.unassigned
                  : undefined;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveInboxView(key)}
                  className={cn(
                    'flex-shrink-0 px-2 sm:px-3 py-2 text-xs font-medium rounded-md transition-all whitespace-nowrap inline-flex items-center gap-1.5',
                    activeInboxView === key ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                  )}
                  title={
                    activeFilter === 'closed'
                      ? undefined
                      : key === 'unassigned'
                        ? t(
                            'agentInbox.inboxViewUnassignedHint',
                            'Chats where the customer has not picked a department or bot option yet (or only sent free text).'
                          )
                        : key === 'team'
                          ? t(
                              'agentInbox.inboxViewTeamHint',
                              'Open chats in your channels waiting for an agent to claim them.'
                            )
                          : t('agentInbox.inboxViewCountHint', 'Open conversations in this queue')
                  }
                >
                  {t(`agentInbox.inboxView.${key}`)}
                  {openCount != null && openCount > 0 && (
                    <span className="tabular-nums rounded-full bg-primary/15 text-primary px-1.5 py-0.5 text-[10px] font-semibold min-w-[1.25rem] text-center">
                      {openCount > 99 ? '99+' : openCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {activeFilter === 'open' && (
            <p className="text-[11px] leading-snug text-muted-foreground px-2 mb-3">
              {t(
                'agentInbox.inboxQueueExplainer',
                'All: every open chat. Mine: assigned to you. Team: your channels, waiting to be claimed. Unassigned: the customer has not finished the bot department step yet.'
              )}
            </p>
          )}
          
          {/* Platform Tabs: All, Website Chat, WhatsApp Chat */}
          <div className="flex items-center gap-1 mb-3 p-1 bg-muted rounded-lg overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActivePlatform('all')}
              className={cn(
                "flex-shrink-0 px-2 sm:px-3 py-2 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                activePlatform === 'all'
                  ? "bg-background"
                  : "hover:bg-background/50"
              )}
            >
              {t('agentInbox.tabs.all') || 'All'}
            </button>
            <button
              onClick={() => setActivePlatform('website')}
              className={cn(
                "flex-shrink-0 px-2 sm:px-3 py-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1 whitespace-nowrap",
                activePlatform === 'website'
                  ? "bg-background"
                  : "hover:bg-background/50"
              )}
            >
              <Globe className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline">{t('agentInbox.tabs.websiteChat') || 'Website Chat'}</span>
            </button>
            <button
              onClick={() => setActivePlatform('whatsapp')}
              className={cn(
                "flex-shrink-0 px-2 sm:px-3 py-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1 whitespace-nowrap",
                activePlatform === 'whatsapp'
                  ? "bg-[#25d366] text-white"
                  : "hover:bg-[#25d366]/10 text-[#25d366]"
              )}
            >
              <MessageCircle className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline">{t('agentInbox.tabs.whatsappChat') || 'WhatsApp Chat'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 p-2 border-b">
            <Button variant={activeFilter === 'open' ? 'default' : 'ghost'} className="flex-1 min-w-[100px] h-8" onClick={() => setActiveFilter('open')}>{t('agentInbox.filters.open')}</Button>
            <Button variant={activeFilter === 'closed' ? 'default' : 'ghost'} className="flex-1 min-w-[100px] h-8" onClick={() => setActiveFilter('closed')}>{t('agentInbox.filters.closed')}</Button>
            {activeFilter === 'open' && agentId ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={() => setCloseAllOpenDialogOpen(true)}
              >
                {t('agentInbox.closeAllOpenButton')}
              </Button>
            ) : null}
          </div>
        <div className="px-2 my-4">
          <Input placeholder={t('agentInbox.searchPlaceholder')} className="bg-muted border-none" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide pr-2">
            {agentInboxStatus === 'loading' && conversations.length > 0 ? ( // This handles subsequent loads
              <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : conversations.length > 0 ? (
              conversations.filter((convo) => convo.customer?.id).map((convo) => {
                const platform = getConversationUiPlatform(convo);
                const isSelected = selectedCustomer === convo.customer!.id;
                return (
                <div
                  key={convo.id}
                  onClick={() => setSelectedCustomer(convo.customer!.id)} 
                  className={cn(
                    "flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg cursor-pointer transition-colors min-w-0",
                    platform === 'whatsapp' && (isSelected ? "bg-[#dcf8c6] dark:bg-[#1f2c33]" : "hover:bg-[#dcf8c6]/50 dark:hover:bg-[#1f2c33]/50"),
                    platform === 'instagram' && (isSelected ? "bg-gradient-to-r from-[#faf0f8] to-[#f5e8f1] dark:from-[#2d1a2e] dark:to-[#1a1a1a]" : "hover:bg-gradient-to-r hover:from-[#faf0f8]/50 hover:to-[#f5e8f1]/50"),
                    platform === 'telegram' && (isSelected ? "bg-[#e8f5e9] dark:bg-[#1a2b2e]" : "hover:bg-[#e8f5e9]/50 dark:hover:bg-[#1a2b2e]/50"),
                    platform === 'website' && (isSelected ? "bg-primary/10" : "hover:bg-muted/50"),
                    !platform && (isSelected ? "bg-primary/10" : "hover:bg-muted/50")
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-full flex items-center justify-center font-bold text-primary text-xs sm:text-sm">{(convo.customer?.name ?? '?').charAt(0).toUpperCase()}</div>
                    {/* 🔧 NEW: Unread count badge - positioned on avatar */}
                    {(convo.unreadCount || 0) > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center z-10 border-2 border-background">
                        {(convo.unreadCount || 0) > 99 ? '99+' : (convo.unreadCount || 0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p
                          className="font-semibold text-[0.9375rem] sm:text-base leading-snug tracking-tight text-foreground line-clamp-2 sm:line-clamp-1 sm:truncate"
                          title={convo.customer?.name ?? undefined}
                        >
                          {convo.customer?.name ?? '—'}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
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
                          {getConversationUiPlatform(convo) !== 'website' && (
                            <PlatformBadge
                              platform={getConversationUiPlatform(convo)}
                              labelOverride={
                                getConversationUiPlatform(convo) === 'whatsapp'
                                  ? whatsappConnectionBadgeLabel(convo.whatsappConnection)
                                  : undefined
                              }
                            />
                          )}
                          {convo.country && <CountryBadge country={convo.country} />}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5 text-right">
                        {convo.latestMessageTimestamp && (
                          <p className="text-[11px] sm:text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                            {dayjs(convo.latestMessageTimestamp).isToday()
                              ? dayjs(convo.latestMessageTimestamp).format("h:mm A")
                              : dayjs(convo.latestMessageTimestamp).isYesterday()
                              ? "Yesterday"
                              : dayjs(convo.latestMessageTimestamp).format("MMM D")}
                          </p>
                        )}
                        {convo.notes && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground rounded-sm p-0.5 -m-0.5"
                                aria-label={t('chatInbox.internalNote', 'Internal note')}
                              >
                                <FileText className="h-3.5 w-3.5" aria-hidden />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs break-words">{convo.notes}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-end gap-2 min-w-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground leading-snug line-clamp-2 sm:line-clamp-1 min-w-0">
                          {isTyping[convo.customer?.id ?? ''] ? (
                            <span className="text-primary italic">{t('chatInbox.typing')}</span>
                          ) : (
                            convo.preview || t('chatInbox.noMessages')
                          )}
                        </p>
                        {/* 🔧 NEW: Tags display (exclude platform tag to avoid duplicate with PlatformBadge) */}
                        {(() => {
                          const platformKey = (convo.platformInfo?.platform || (convo as any).source || '').toLowerCase();
                          const filteredTags = (convo.tags || []).filter((t) => t.toLowerCase() !== platformKey);
                          if (filteredTags.length === 0) return null;
                          return (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {filteredTags.slice(0, 2).map((tag, i) => (
                                <span key={i} className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                                  {tag}
                                </span>
                              ))}
                              {filteredTags.length > 2 && (
                                <span className="text-xs text-muted-foreground">+{filteredTags.length - 2}</span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 self-end">
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
            "flex flex-col border rounded-xl max-h-screen transition-colors overflow-hidden min-h-0",
            // Platform-specific main container backgrounds (same as ChatInbox)
            chatSurfacePlatform === 'whatsapp'
              ? "chat-bg-whatsapp border-[#c8bfb4] dark:border-[#1e2a32] shadow-sm"
              : chatSurfacePlatform === 'instagram'
              ? "chat-bg-instagram border-[#e8d4e0] dark:border-[#3d2a42]"
              : chatSurfacePlatform === 'telegram'
              ? "chat-bg-telegram border-[#d1d5db] dark:border-[#1a2332]"
              : "chat-bg-website border-border"
          )}
        >
        {!selectedCustomer ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center"><MessageSquareText className="h-12 w-12 sm:h-16 sm:w-16 mb-4" /><h2 className="text-lg sm:text-xl font-medium">{t('agentInbox.empty.title')}</h2><p className="text-sm sm:text-base">{t('agentInbox.empty.subtitle')}</p></div>
        ) : (
          <>
              <div
                className={cn(
                  'flex items-start sm:items-center justify-between p-3 sm:p-4 border-b gap-2 min-w-0',
                  isWaThread && 'chat-wa-header-strip'
                )}
              >
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                  <div className="flex flex-col gap-2 min-[400px]:flex-row min-[400px]:flex-wrap min-[400px]:items-center min-w-0">
                    <h2
                      className="font-semibold text-base sm:text-lg leading-tight tracking-tight text-foreground min-w-0 line-clamp-2 min-[400px]:line-clamp-1 min-[400px]:truncate flex-1 min-[400px]:flex-none min-[400px]:max-w-[min(100%,28rem)]"
                      title={currentConversation?.customer?.name ?? undefined}
                    >
                      {currentConversation?.customer?.name}
                    </h2>
                    {chatSurfacePlatform !== 'website' && (
                      <PlatformBadge
                        platform={chatSurfacePlatform}
                        labelOverride={
                          chatSurfacePlatform === 'whatsapp'
                            ? whatsappConnectionBadgeLabel(currentConversation?.whatsappConnection)
                            : undefined
                        }
                      />
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
                      const platformKey = (currentConversation?.platformInfo?.platform || (currentConversation as any)?.source || '').toLowerCase();
                      const headerTags = (currentConversation?.tags || []).filter((t) => t.toLowerCase() !== platformKey);
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
                      {t('agentInbox.addInternalNote', 'Add internal note')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={async () => {
                      if (!currentConversation?.id) return;
                      setSummaryDialogOpen(true);
                      setSummaryLoading(true);
                      setSummaryText(null);
                      try {
                        const data = await getConversationSummaryApi(currentConversation.id);
                        setSummaryText(data?.summary ?? 'No summary available.');
                      } catch (err: any) {
                        const msg = err?.response?.data?.message || err?.message || 'Failed to load summary.';
                        setSummaryText(msg);
                      } finally {
                        setSummaryLoading(false);
                      }
                    }}>
                      <MessageSquareText className="mr-2 h-4 w-4" />
                      {t('agentInbox.aiSummary', 'AI Summary')}
                    </DropdownMenuItem>
                    {agentId &&
                      currentConversation?.assignedAgentId &&
                      String(currentConversation.assignedAgentId) === String(agentId) && (
                        <DropdownMenuItem onSelect={() => void handleReleaseToQueue()}>
                          <UserMinus className="mr-2 h-4 w-4" />
                          {t('agentInbox.releaseToQueue', 'Release to queue')}
                        </DropdownMenuItem>
                      )}
                    {!currentConversation?.assignedAgentId && agentId && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleAssignConversation(String(agentId))}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {t('agentInbox.claimConversation', 'Claim conversation')}
                        </DropdownMenuItem>
                      </>
                    )}
                    {!currentConversation?.assignedAgentId && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>{t('agentInbox.assignTo', 'Assign to')}</DropdownMenuLabel>
                        {onlineAgents.length > 0 ? (
                          onlineAgents.map((agent) => (
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
                          <DropdownMenuItem disabled>{t('agentInbox.noAgentsOnlineAssign', 'No agents online')}</DropdownMenuItem>
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
                
                {/* 🔧 Internal note: sent as a message so it appears in the chat flow (chronologically) */}
                <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
                  <DialogContent>
                    <h3 className="text-lg font-semibold mb-4">{t('agentInbox.addInternalNote', 'Add internal note')}</h3>
                    <NotesEditor 
                      currentNotes="" 
                      onSave={handleSendInternalNote}
                      placeholder={t('agentInbox.internalNotePlaceholder', 'Add internal notes for this conversation...')}
                    />
                  </DialogContent>
                </Dialog>
                <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
                  <DialogContent>
                    <h3 className="text-lg font-semibold mb-4">{t('agentInbox.aiSummary', 'AI Summary')}</h3>
                    {summaryLoading ? (
                      <div className="flex items-center gap-2 py-4"><Loader2 className="h-5 w-5 animate-spin" /> {t('agentInbox.loadingSummary', 'Loading...')}</div>
                    ) : (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{summaryText ?? '—'}</p>
                    )}
                  </DialogContent>
                </Dialog>
                
                <Tooltip><TooltipTrigger asChild><Button className="cursor-pointer" variant="ghost" size="icon" onClick={handleCloseConversation}><XCircle className="h-5 w-5 text-red-500" /></Button></TooltipTrigger><TooltipContent><p>{t('agentInbox.transfer.closeConversation')}</p></TooltipContent></Tooltip>
              </div>
            </div>
            {isWhapiWaThread && currentConversation?.whatsappConnection?.id && (
              <WhapiInboxToolbar
                connectionId={currentConversation.whatsappConnection.id}
                customerPhone={currentConversation.customer?.phone ?? null}
                chatId={whapiChatJidFromMessages}
              />
            )}
            <div
              ref={messageListRef} 
              className={cn(
                "flex-1 min-h-0 p-3 sm:p-6 space-y-2 overflow-y-auto scrollbar-hide relative",
                // Platform-specific backgrounds (same as ChatInbox)
                chatSurfacePlatform === 'whatsapp'
                  ? "chat-bg-whatsapp"
                  : chatSurfacePlatform === 'instagram'
                  ? "chat-bg-instagram"
                  : chatSurfacePlatform === 'telegram'
                  ? "chat-bg-telegram"
                  : "chat-bg-website"
              )}
            >
              <div className="text-center">
                {messagesData?.status === 'loading' && <Loader2 className="h-5 w-5 animate-spin mx-auto my-4" />}
                {messagesData?.hasMore && messagesData.status !== 'loading' && (<Button variant="link" onClick={handleLoadMoreMessages}>{t('agentInbox.loadMoreMessages')}</Button>)}
              </div>
              {Object.entries(groupedMessages).map(([date, group]) => {
                const platform = chatSurfacePlatform;
                const connectionIdFromConversation = currentConversation?.platformInfo?.connectionId;
                return (
                  <div key={date}>
                    <div className="text-center text-xs text-muted-foreground my-4">{date}</div>
                    {group?.map((msg: any, i) => { 
                      if (msg.sentBy === 'system') return <SystemMessage key={i} text={msg.text} />;
                      // Internal note: render as message bubble in the flow (chronological), agent-side style
                      if (msg.isInternalNote || msg.metadata?.isInternalNote) {
                        return (
                          <div key={i} className="flex justify-end my-2">
                            <div className="max-w-[85%] rounded-xl border-2 border-amber-500/40 dark:border-amber-400/30 bg-amber-100 dark:bg-amber-950/50 px-4 py-2.5">
                              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wide mb-1">{t('agentInbox.internalNote', 'Internal note')}</p>
                              <p className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap break-words"><FormattedText text={msg.text} /></p>
                            </div>
                          </div>
                        );
                      }
                      // Treat AI as agent-side so customer & AI don't render on the same side
                      const isAgentSide = ["agent", "human", "ai"].includes(msg.sentBy);
                      const messageType = msg.messageType || msg.metadata?.messageType || 'text';
                      let mediaUrl = msg.cloudinaryUrl || msg.mediaUrl || msg.metadata?.cloudinaryUrl || msg.metadata?.mediaUrl || msg.originalMediaUrl || msg.metadata?.originalMediaUrl || null;
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
                      
                      // 🔧 CRITICAL: Use any HTTP URL for preview (after refresh API sends cloudinaryUrl/mediaUrl at top level and in metadata)
                      const anyCloudinary = msg.cloudinaryUrl || msg.metadata?.cloudinaryUrl || null;
                      const anyMedia = mediaUrl || msg.metadata?.mediaUrl || null;
                      const validMediaUrl = (anyMedia && typeof anyMedia === 'string' && !anyMedia.startsWith('att://')) ? anyMedia : null;
                      const isLikelyAudio = messageType === 'audio' || msg.text === '🎵 Audio' || msg.metadata?.messageType === 'audio' || (msg.text && /🎵/.test(msg.text));
                      // 🔧 Audio: backend sends audioSrc (and audioPlayUrl); fallback: cloudinaryUrl as MP3 so play always works
                      const audioPlayUrl = msg.audioSrc ?? msg.audioPlayUrl ?? msg.metadata?.audioSrc ?? msg.metadata?.audioPlayUrl ?? null;
                      const fetchedAudioUrl = audioUrlByMessageId[msg._id] || null;
                      const cloudinaryMp3 = (messageType === 'audio' || isLikelyAudio) && anyCloudinary ? (toCloudinaryMp3Url(anyCloudinary) || anyCloudinary) : null;
                      const effectiveAudioUrl = audioPlayUrl || cloudinaryMp3 || (messageType === 'audio' || isLikelyAudio ? (anyCloudinary || validMediaUrl || proxyUrl || fetchedAudioUrl) : null) || null;
                      const displayUrl = (messageType === 'document' || isLikelyAudio)
                        ? (messageType === 'audio' || isLikelyAudio
                          ? (effectiveAudioUrl || anyCloudinary || validMediaUrl || proxyUrl || fetchedAudioUrl || null)
                          : (anyCloudinary || validMediaUrl || proxyUrl || null))
                        : (messageType === 'image' || messageType === 'video'
                            ? (anyCloudinary || validMediaUrl || proxyUrl || null)
                            : (validMediaUrl || proxyUrl || null));
                      
                      // 🔧 Show as document when messageType is document OR we have URL + fileName/PDF hint (so preview shows after refresh)
                      const isDocumentMessage = messageType === 'document' || (!!(displayUrl || proxyUrl) && (!!msg.metadata?.fileName || /\.(pdf|doc|docx|xls|xlsx)$/i.test(msg.metadata?.fileName || '') || (displayUrl || proxyUrl || '').toLowerCase().includes('.pdf')));
                      // 🔧 Show as audio when messageType is audio OR we have URL + audio hint (voice/Unipile sometimes sends wrong type)
                      const isAudioMessage = messageType === 'audio' || (!!(displayUrl || proxyUrl) && (msg.text === '🎵 Audio' || msg.metadata?.messageType === 'audio' || (msg.text && /🎵/.test(msg.text))));
                      const isLikelyVideo =
                        !isDocumentMessage &&
                        !isAudioMessage &&
                        (messageType === 'video' ||
                          msg.metadata?.messageType === 'video' ||
                          msg.text === '🎥 Video' ||
                          (typeof msg.text === 'string' && /\[video\]/i.test(msg.text)) ||
                          (!!displayUrl && chatInboxUrlLooksLikeVideo(displayUrl)));
                      // 🔧 FIX: Detect media message from messageType OR if message text contains "Image:" or "att://"
                      const isMediaMessage = ['image', 'video', 'audio', 'document'].includes(messageType) || isDocumentMessage || isAudioMessage ||
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
                          <MessageQuotedPreview
                            metadata={msg.metadata}
                            variant={platform === 'whatsapp' ? 'whatsapp' : 'default'}
                            className={isAgentSide ? 'self-end' : 'self-start'}
                          />
                          <div className={cn(
                            "max-w-[65%] rounded-2xl text-sm leading-snug overflow-hidden",
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
                            (isMediaMessage && (displayUrl || (isDocumentMessage && proxyUrl) || (isAudioMessage && (proxyUrl || displayUrl)) || isAudioMessage)) ? "p-0" : "p-3 sm:p-4"
                          )}>
                            {/* 🔧 NEW: Render media based on messageType (document can use proxyUrl when displayUrl missing) */}
                            {isMediaMessage && (displayUrl || (isDocumentMessage && proxyUrl) || (isAudioMessage && (proxyUrl || displayUrl)) || isAudioMessage) ? (
                              <>
                                {messageType === 'image' && !isLikelyVideo && (
                                  <div className="relative group">
                                    <MediaImage 
                                      src={displayUrl}
                                      alt={msg.text || 'Image'}
                                      proxyUrl={proxyUrl}
                                      className="max-w-[280px] sm:max-w-[320px] md:max-w-[360px] w-full h-auto rounded-2xl cursor-pointer object-cover border-2 border-white/30 dark:border-white/10 hover:scale-[1.02] hover:border-white/50 dark:hover:border-white/30 transition-all duration-300 ease-out"
                                      onClick={() => setSelectedImage({ src: displayUrl || '', alt: msg.text || 'Image' })}
                                    />
                                    <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                  </div>
                                )}
                                {(messageType === 'video' || isLikelyVideo) && displayUrl && (
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
                                {isAudioMessage && (
                                  <div className="p-3 sm:p-4">
                                    <div className="rounded-xl border border-purple-200/50 bg-gradient-to-r from-purple-50 to-blue-50 p-4 dark:border-purple-800/50 dark:from-purple-900/20 dark:to-blue-900/20">
                                      <SimpleVoiceNote
                                        messageId={String(msg._id)}
                                        audioSrc={
                                          (msg as any).audioSrc ??
                                          msg.metadata?.audioSrc ??
                                          (effectiveAudioUrl?.startsWith('http') ? effectiveAudioUrl : null)
                                        }
                                        audioUrl={(msg as any).audioUrl ?? msg.metadata?.audioUrl ?? audioUrlByMessageId[msg._id]}
                                        cloudinaryUrl={msg.cloudinaryUrl ?? msg.metadata?.cloudinaryUrl ?? anyCloudinary}
                                      />
                                      {msg.text && !(msg.text.match(/^(📷|🎥|🎵|📄|📎)/) || msg.text === '🎵 Audio' || msg.text.includes('att://')) && (
                                        <p className="mt-2 break-words text-xs text-muted-foreground">{msg.text}</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {isDocumentMessage && (
                                  <div className="p-3 space-y-3 w-full max-w-[320px]">
                                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                      <FileText className="h-5 w-5 shrink-0 text-primary" />
                                      <span className="truncate">
                                        {msg.metadata?.fileName || (msg.text && msg.text !== '📄 Document' && !msg.text.startsWith('att://') ? msg.text : 'Document')}
                                      </span>
                                    </div>
                                    {(displayUrl || proxyUrl) ? (
                                      <SecureDocumentPreview
                                        url={displayUrl || proxyUrl || null}
                                        variant={
                                          msg.metadata?.mimeType === 'application/pdf' || /\.pdf$/i.test(msg.metadata?.fileName || '') || (displayUrl || proxyUrl || '').toLowerCase().includes('.pdf')
                                            ? 'pdf'
                                            : /\.(jpe?g|png|gif|webp)$/i.test(msg.metadata?.fileName || '')
                                              ? 'image'
                                              : 'placeholder'
                                        }
                                        fileName={msg.metadata?.fileName || undefined}
                                        downloadLabel={t('chatInbox.downloadDocument', 'Download')}
                                        showDownload
                                      />
                                    ) : (
                                      <p className="text-xs text-muted-foreground">{t('chatInbox.documentUnavailable', 'Document unavailable')}</p>
                                    )}
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
                                ) : msg.status === 'sending' ? (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Loader2 className="h-3 w-3 text-muted-foreground animate-spin" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{t('chatInbox.sending', 'Sending…')}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                ) : null}
                              </div>
                            )}
                          </div>
                          {isWhapiWaThread &&
                            !msg.isInternalNote &&
                            currentConversation?.whatsappConnection?.id &&
                            whapiQuoteMessageIdFromMessage(msg) && (
                              <div
                                className={cn(
                                  'flex flex-wrap items-center gap-0.5 mt-0.5 max-w-[min(100%,20rem)]',
                                  isAgentSide ? 'justify-end ml-auto' : 'justify-start'
                                )}
                              >
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-1.5 text-[10px] gap-0.5 text-muted-foreground hover:text-foreground"
                                  onClick={() => {
                                    const id = whapiQuoteMessageIdFromMessage(msg)!;
                                    const prev = (msg.text || '').replace(/\s+/g, ' ').trim().slice(0, 80);
                                    setWhapiReplyTo({ id, preview: prev || id.slice(0, 16) });
                                  }}
                                >
                                  <Reply className="h-3 w-3 shrink-0" />
                                  {t('chatInbox.whapi.reply')}
                                </Button>
                                {(['👍', '❤️', '😂', '🙏', '✅'] as const).map((em) => (
                                  <button
                                    key={em}
                                    type="button"
                                    className="cursor-pointer rounded-md px-1 py-0.5 text-sm leading-none hover:bg-muted/80 active:scale-95 transition-transform"
                                    title={t('chatInbox.whapi.react')}
                                    onClick={async () => {
                                      const wid = currentConversation.whatsappConnection?.id;
                                      const mid = whapiQuoteMessageIdFromMessage(msg);
                                      if (!wid || !mid) return;
                                      try {
                                        await putWhapiMessageReaction(wid, mid, em);
                                        toast.success(t('chatInbox.whapi.reactionSent'));
                                      } catch {
                                        toast.error(t('chatInbox.whapi.reactionFailed'));
                                      }
                                    }}
                                  >
                                    {em}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ); 
                    })}
                  </div>
                  );
                })}
              </div>
              {/* META: 24h session + opt-in for WhatsApp (hidden for Unipile – same logic as ChatInbox) */}
              {chatSurfacePlatform === 'whatsapp' && (
                <div className="px-3 sm:px-6 pt-2 space-y-2 border-t border-border/50">
                  {isCheckingSession ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Checking session...
                    </p>
                  ) : whatsappSession && isMetaWhatsAppCloudApiSession(whatsappSession.source) && (
                    <>
                      {whatsappSession.withinWindow ? (
                        <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Within 24h{whatsappSession.hoursRemaining != null ? ` • ${Number(whatsappSession.hoursRemaining).toFixed(1)}h left to reply freely` : ' • Reply freely'}
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
                                if (!selectedTemplateName || !currentConversation?.id || !businessId || !selectedCustomer)
                                  return;
                                const clientRequestId = crypto.randomUUID();
                                const tplPreview = `[Template: ${selectedTemplateName}]`;
                                dispatch(
                                  addOutboundPendingMessage({
                                    customerId: selectedCustomer,
                                    clientRequestId,
                                    text: tplPreview,
                                    messageType: 'text',
                                  })
                                );
                                dispatch(
                                  updateConversationPreview({
                                    conversationId: currentConversation.id,
                                    preview: tplPreview,
                                    latestMessageTimestamp: new Date().toISOString(),
                                  })
                                );
                                try {
                                  const { sendMessageViaConversation, getWhatsAppSessionByConversation } = await import('@/api/chatApi');
                                  const components = templateBodyParam.trim()
                                    ? [{ type: 'body' as const, parameters: [{ type: 'text' as const, text: templateBodyParam.trim() }] }]
                                    : undefined;
                                  await sendMessageViaConversation({
                                    conversationId: currentConversation.id,
                                    message: '',
                                    businessId: businessId!,
                                    useTemplate: true,
                                    templateName: selectedTemplateName,
                                    templateLanguage: 'en',
                                    templateComponents: components,
                                    clientRequestId,
                                  });
                                  toast.success('Template sent');
                                  setTemplateBodyParam('');
                                  setSelectedTemplateName('');
                                  const session = await getWhatsAppSessionByConversation(currentConversation.id);
                                  setWhatsappSession({
                                    withinWindow: session.withinWindow,
                                    hoursRemaining: session.hoursRemaining,
                                    lastMessageTimestamp: session.lastMessageTimestamp ?? null,
                                    requiresTemplate: session.requiresTemplate,
                                    optIn: session.optIn ?? undefined,
                                    source: session.source,
                                  });
                                } catch (err: any) {
                                  dispatch(
                                    removeOutboundPendingMessage({
                                      customerId: selectedCustomer,
                                      clientRequestId,
                                    })
                                  );
                                  toast.error(err.response?.data?.message || err.message || 'Failed to send template');
                                }
                              }}
                            >
                              Send template
                            </Button>
                          </div>
                        </div>
                      )}
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
              <div
                className={cn(
                  'flex-shrink-0 p-3 sm:p-6 border-t',
                  isWaThread
                    ? 'chat-wa-composer-dock'
                    : 'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'
                )}
              >
                {isWhapiWaThread && whapiReplyTo && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-600/20 bg-emerald-500/5 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {t('chatInbox.whapi.replyingTo', { text: whapiReplyTo.preview })}
                    </span>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setWhapiReplyTo(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {isRecording && (
                  <VoiceRecordingBar
                    recordingSeconds={recordingSeconds}
                    isPaused={isPaused}
                    supportsPause={supportsPause}
                    variant={isWaThread ? 'whatsapp' : 'default'}
                    onPause={pauseRecording}
                    onResume={resumeRecording}
                    onCancel={cancelRecording}
                    onDone={async () => {
                      const { file, activeDurationSec } = await stopRecording();
                      if (!file) {
                        toast.error(t('chatInbox.voiceTooShort', 'Recording too short'));
                        return;
                      }
                      const d = await resolveVoiceAttachmentDurationSeconds(file, activeDurationSec);
                      attachAudioFile(file, d);
                    }}
                  />
                )}
                {selectedImageFile && (
                  audioPreviewUrl ? (
                    <div className="relative mb-3 inline-block max-w-full pr-2 pt-2">
                      <OutboundVoicePreviewCard
                        src={audioPreviewUrl}
                        durationHint={
                          outboundAudioDurationSec != null
                            ? formatVoiceDuration(outboundAudioDurationSec)
                            : null
                        }
                        fileName={selectedImageFile.name}
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute -top-1 -right-1 z-20 h-6 w-6 rounded-full shadow-sm"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                  <div className="mb-3 relative inline-block max-w-full">
                    <div className="relative rounded-lg overflow-hidden border border-border bg-muted/50">
                      {pdfPreviewUrl ? (
                        <div className="w-[min(100vw-2rem,280px)] h-[240px] sm:w-[280px] flex flex-col">
                          <iframe
                            title={selectedImageFile.name}
                            src={`${pdfPreviewUrl}#view=FitH&toolbar=0&navpanes=0`}
                            className="w-full flex-1 min-h-0 border-0 bg-background"
                          />
                          <div className="flex items-center gap-2 px-2 py-1.5 border-t border-border bg-background/95 text-xs text-muted-foreground shrink-0">
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate" title={selectedImageFile.name}>
                              {selectedImageFile.name}
                            </span>
                          </div>
                        </div>
                      ) : videoPreviewUrl ? (
                        <div className="flex flex-col gap-1.5 p-2 max-w-[280px]">
                          <video
                            src={videoPreviewUrl}
                            controls
                            className="max-h-[200px] w-full rounded-md bg-black"
                          />
                          <span className="text-xs text-muted-foreground truncate" title={selectedImageFile.name}>
                            {selectedImageFile.name}
                          </span>
                        </div>
                      ) : imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-w-[200px] max-h-[200px] object-cover"
                        />
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2 max-w-[220px]">
                          <FileText className="h-8 w-8 shrink-0 text-muted-foreground" />
                          <span className="text-sm truncate" title={selectedImageFile.name}>
                            {selectedImageFile.name}
                          </span>
                        </div>
                      )}
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 z-20 h-6 w-6 rounded-full shadow-sm"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  )
                )}
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*,application/pdf,.pdf"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload-agent"
                  />
                  <Textarea 
                    placeholder={t('chatInbox.snippetHint') || "Use '/' for snippets"} 
                    value={newMessage} 
                    onChange={e => setNewMessage(e.target.value)} 
                    onFocus={() => { const s = getSocket(); if (s?.connected && selectedCustomer) s.emit('agentTyping', { customerId: selectedCustomer }); }}
                    onBlur={() => { const s = getSocket(); if (s?.connected && selectedCustomer) s.emit('agentStoppedTyping', { customerId: selectedCustomer }); }}
                    onKeyDown={e => {
                      if ((newMessage || '').trim().startsWith('/') && snippetSuggestions.length > 0) {
                        if (e.key === 'Escape') { setSnippetSuggestions([]); e.preventDefault(); return; }
                        if (e.key === 'Enter' && snippetSuggestions.length === 1) {
                          setNewMessage(snippetSuggestions[0].message);
                          setSnippetSuggestions([]);
                          e.preventDefault();
                          return;
                        }
                      }
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
                    }} 
                    className={cn(
                      'w-full resize-none p-3 sm:p-4 pr-[8.75rem] sm:pr-40 focus-visible:ring-2 focus-visible:ring-primary text-sm sm:text-base',
                      isWaThread ? 'wa-composer-input' : 'rounded-lg bg-muted border-none'
                    )}
                    rows={1} 
                    spellCheck={true}
                    disabled={chatSurfacePlatform === 'whatsapp' && whatsappSession?.requiresTemplate && isMetaWhatsAppCloudApiSession(whatsappSession?.source)}
                  />
                  {(snippetSuggestions.length > 0 || snippetSuggestLoading) && (newMessage || '').trim().startsWith('/') && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 max-h-[220px] overflow-y-auto rounded-lg border bg-popover text-popover-foreground z-50 py-1">
                      {snippetSuggestLoading ? (
                        <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t('chatInbox.loadingSnippets', 'Loading...')}
                        </div>
                      ) : (
                        snippetSuggestions.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            className="w-full cursor-pointer text-left px-3 py-2 hover:bg-accent focus:bg-accent focus:outline-none text-sm flex flex-col gap-0.5"
                            onMouseDown={(e) => { e.preventDefault(); setNewMessage(s.message); setSnippetSuggestions([]); }}
                          >
                            <span className="font-medium">/{s.command}</span>
                            <span className="text-muted-foreground line-clamp-1">{s.message}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  <div className="absolute bottom-2 sm:bottom-2.5 right-2 sm:right-3 flex flex-row-reverse items-center gap-0.5">
                    <Button
                      type="button"
                      onClick={handleSendMessage}
                      size="icon"
                      disabled={
                        isUploadingImage ||
                        isRecording ||
                        (chatSurfacePlatform === 'whatsapp' &&
                          whatsappSession?.requiresTemplate &&
                          isMetaWhatsAppCloudApiSession(whatsappSession?.source)) ||
                        (!newMessage.trim() && !selectedImageFile)
                      }
                      className={cn(
                        'h-8 w-8 sm:h-9 sm:w-9 disabled:opacity-50',
                        isWaThread
                          ? 'rounded-full bg-[#25D366] text-white hover:bg-[#20bd5a] shadow-sm border-0'
                          : 'bg-primary hover:bg-primary/90'
                      )}
                    >
                      {isUploadingImage ? (
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={!newMessage.trim() || improveLoading}
                      onClick={async () => {
                        if (!newMessage.trim()) return;
                        setImproveLoading(true);
                        try {
                          const lang =
                            detectLanguageFromText(newMessage) ||
                            (currentConversation as any)?.preferredLanguage ||
                            (user as any)?.language ||
                            i18n.language?.slice(0, 2);
                          const data = await improveMessageApi(newMessage, lang);
                          if (data?.improvedText) setNewMessage(data.improvedText);
                        } catch {
                          toast.error(t('agentInbox.improveFailed', 'Could not improve message'));
                        } finally {
                          setImproveLoading(false);
                        }
                      }}
                      className="h-8 w-8 sm:h-9 sm:w-9"
                      title={t('agentInbox.improveTone', 'Improve wording and tone')}
                    >
                      {improveLoading ? (
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={isUploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 w-8 sm:h-9 sm:w-9"
                      title="Attach image, video, audio, or PDF"
                    >
                      {isUploadingImage ? (
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      ) : (
                        <Paperclip className="h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={
                        isUploadingImage ||
                        !!selectedImageFile ||
                        isRecording ||
                        (chatSurfacePlatform === 'whatsapp' &&
                          whatsappSession?.requiresTemplate &&
                          isMetaWhatsAppCloudApiSession(whatsappSession?.source))
                      }
                      className={cn(
                        'h-8 w-8 sm:h-9 sm:w-9',
                        isWaThread && 'text-[#25D366] hover:text-[#20bd5a] hover:bg-[#25D366]/10'
                      )}
                      title={t('chatInbox.voiceMicHint', 'Record voice message')}
                      onClick={async () => {
                        try {
                          await startRecording();
                        } catch (e: unknown) {
                          const err = e as Error & { name?: string };
                          if (err?.message === 'VOICE_NOT_SUPPORTED') {
                            toast.error(
                              t('chatInbox.voiceNotSupported', 'Voice recording is not supported in this browser')
                            );
                            return;
                          }
                          if (err?.name === 'NotAllowedError') {
                            toast.error(t('chatInbox.voiceMicDenied', 'Microphone permission denied'));
                            return;
                          }
                          toast.error(t('chatInbox.voiceMicError', 'Could not start recording'));
                        }
                      }}
                    >
                      <Mic className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
      
      {/* Image Modal for Full-Screen Viewing */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="!flex h-[min(92vh,920px)] max-h-[95vh] w-[min(95vw,1200px)] max-w-[95vw] flex-col gap-0 overflow-hidden border-none bg-black/95 p-0 shadow-xl">
          {selectedImage && (
            <ZoomableImageLightbox
              key={selectedImage.src}
              hint={t(
                'chatInbox.imageZoomHint',
                'Hold Ctrl or ⌘ and scroll to zoom. Pinch to zoom on touch. Drag to pan when zoomed.'
              )}
            >
              {selectedImage.src && (selectedImage.src.includes('/api/v1/unipile/attachments/') || selectedImage.src.includes('/unipile/attachments/')) ? (
                <MediaImage
                  src={selectedImage.src}
                  alt={selectedImage.alt}
                  proxyUrl={null}
                  className="max-h-full max-w-full h-auto w-auto object-contain rounded-lg"
                  onClick={() => {}}
                />
              ) : (
                <img
                  src={optimizeImageUrl(selectedImage.src, 2560, 'auto') || selectedImage.src}
                  alt={selectedImage.alt}
                  className="max-h-full max-w-full h-auto w-auto object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                  loading="eager"
                  decoding="async"
                  draggable={false}
                  onError={(_e) => {
                    console.error('Failed to load image in modal:', selectedImage.src);
                  }}
                />
              )}
            </ZoomableImageLightbox>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={closeAllOpenDialogOpen} onOpenChange={setCloseAllOpenDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>{t('agentInbox.closeAllOpenConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('agentInbox.closeAllOpenConfirmDescription')}</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closeAllOpenLoading}>{t('workflow.cancel')}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={closeAllOpenLoading}
              onClick={() => void handleConfirmCloseAllOpen()}
            >
              {closeAllOpenLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                  {t('agentInbox.closeAllOpenConfirmAction')}
                </>
              ) : (
                t('agentInbox.closeAllOpenConfirmAction')
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

// 🔧 Notes Editor Component (placeholder translated by parent)
const NotesEditor = ({ currentNotes, onSave, placeholder = 'Add internal notes for this conversation...' }: { currentNotes: string; onSave: (notes: string) => void; placeholder?: string }) => {
  const [notes, setNotes] = useState(currentNotes);
  
  return (
    <div className="space-y-4">
      <Textarea
        placeholder={placeholder}
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
