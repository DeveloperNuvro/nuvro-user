// src/layouts/DashboardLayout.tsx

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu, CircleUser, ChevronDown, Circle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import logo from "@/assets/images/LogoColor.png";
import logoWhite from "@/assets/images/logoWhiteColor.png";
import { ModeToggle } from "@/components/mode-toggle";
import { LanguageToggle } from "../../languageToggle";
import { MdOutlinePayment } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState, store } from '@/app/store'; 
import { logoutUser, User as AuthUser } from '@/features/auth/authSlice';
import { fetchBusinessById, fetchAiIntregationByBusinessId } from "@/features/business/businessSlice";
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { menuRoutes } from "@/appRoutes";
import { initSocket, disconnectSocket, getSocket } from "../../../../lib/useSocket";
import {
  addRealtimeMessage,
  addOutboundPendingMessage,
  removeOutboundPendingMessage,
  addNewCustomer,
  removeConversation,
  updateConversationStatus,
  updateConversationEnhanced,
  ConversationInList,
  Message
} from '@/features/chatInbox/chatInboxSlice';
import { addAssignedConversation, updateConversationPreview, removeConversation as removeAgentConversation } from "@/features/humanAgent/humanAgentInboxSlice";
import { setAgentStatus, HumanAgent } from "@/features/humanAgent/humanAgentSlice";
import { socketReconnected } from "@/features/socket/socketSlice";
import NotificationToast from "@/components/custom/Notification/NotificationToast";
import { fetchChannels } from "@/features/channel/channelSlice";
import { normalizeApiMediaUrl } from "@/lib/audioUrlNormalize";
import {
  conversationRowFromBusinessNewMessageSocket,
  conversationRowFromNewConversationSocket,
  inboxListPatchFromSocketMessage,
} from "@/utils/socketInboxRealtime";

// One-at-a-time notification sound: stop any current playback before starting new one so it's not intrusive and no stacking.
const NOTIFICATION_SOUND_URL = "/sounds/notification.mp3";
let currentNotificationAudio: HTMLAudioElement | null = null;
const playNotificationSound = () => {
  if (currentNotificationAudio) {
    try {
      currentNotificationAudio.pause();
      currentNotificationAudio.currentTime = 0;
    } catch (_) {}
    currentNotificationAudio = null;
  }
  const audio = new Audio(NOTIFICATION_SOUND_URL);
  audio.volume = 1;
  currentNotificationAudio = audio;
  audio.addEventListener('ended', () => { currentNotificationAudio = null; });
  audio.addEventListener('error', () => { currentNotificationAudio = null; });
  const p = audio.play();
  if (p !== undefined) {
    p.catch(() => { currentNotificationAudio = null; });
  }
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const [imageSrc, setImageSrc] = useState<string>(logoWhite);
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user, accessToken }: any = useSelector((state: RootState) => state.auth as { user: AuthUser | null; accessToken: string | null });
  const { selectedBusiness, aiIntegrations } = useSelector((state: RootState) => state.business);
  const channels = useSelector((state: RootState) => state.channel?.channels ?? []);
  
  const [isConnected, setIsConnected] = useState(getSocket()?.connected || false);
  const wasConnectedRef = useRef(false);
  // এজেন্ট একই newMessage business + agent room দু’বার পায় বলে টোস্ট দুবার না দেখাতে dedupe
  const lastToastMessageIdRef = useRef<string | null>(null);

  // Agent's channel IDs for department filter: only play notification for conversations in my channel (Support vs Sales).
  const myChannelIds = useMemo(() => {
    if (!user || user.role !== 'agent') return [];
    const uid = (user._id ?? (user as any).id)?.toString();
    if (!uid) return [];
    return (channels || []).filter((c: any) =>
      (c.members || []).some((m: any) => (m?._id ?? m)?.toString() === uid)
    ).map((c: any) => c._id);
  }, [user, channels]);

  // Load channels when user is agent so we can filter notifications by department.
  useEffect(() => {
    if (user?.role === 'agent' && channels?.length === 0) {
      dispatch(fetchChannels());
    }
  }, [user?.role, channels?.length, dispatch]);

  // একবার ক্লিক/ইন্টারঅ্যাকশন দিলে অডিও আনলক (ব্রাউজার পলিসি) — প্রতিবার নতুন Audio() দিয়ে বাজানো হয় তাই ref দরকার নেই
  useEffect(() => {
    const unlock = () => {
      const a = new Audio(NOTIFICATION_SOUND_URL);
      a.load();
    };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // 🔧 When user returns to this tab after 5+ min on another tab, reconnect socket if it dropped (browsers throttle background tabs so connection may have been closed).
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      const s = getSocket();
      if (s && !s.connected) {
        s.connect();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  // 🔧 OPTIMIZED: Memoize socket event handlers with useCallback (moved outside useEffect)
  const handleNewMessage = useCallback((data: any) => {
    const customerId = data?.customerId ?? data?.customer_id;
    const rawSender = data?.sender ?? data?.senderType;
    const sender = rawSender === 'user' ? 'customer' : rawSender;
    const message = data?.message ?? data?.text ?? '';
    const customerName = data?.customerName;
    const conversationId = data?.conversationId;
    const assignment = data?.assignment;
    const senderSocketId = data?.senderSocketId;

    if (!customerId || !sender) return;
    const socket = getSocket();
    if (senderSocketId && senderSocketId === socket?.id) return;

    const formattedMessage: Message = {
      _id: data._id ?? data?.id,
      text: message,
      sentBy: sender,
      time: data.time ?? data.createdAt ?? data?.timestamp ?? new Date().toISOString(),
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
      isInternalNote: !!(data.isInternalNote ?? data.metadata?.isInternalNote),
    };

    const currentState = store.getState();
    const allCurrentConversations = [
        ...currentState.chatInbox.conversations,
        ...currentState.agentInbox.conversations
    ];
    const uniqueConversations = allCurrentConversations.filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i);
    const isNewConversation = conversationId ? !uniqueConversations.some(c => c.id === conversationId) : true;

    const conversationSource =
      typeof data.source === 'string' && data.source.trim()
        ? data.source.trim()
        : typeof data.metadata?.platform === 'string' && data.metadata.platform.trim()
          ? String(data.metadata.platform).trim()
          : undefined;
    const inboxListPatch =
      user.role === 'business' ? inboxListPatchFromSocketMessage(data) : undefined;
    dispatch(
      addRealtimeMessage({
        customerId: String(customerId),
        message: formattedMessage,
        ...(conversationSource ? { conversationSource } : {}),
        ...(inboxListPatch && Object.keys(inboxListPatch).length > 0 ? { inboxListPatch } : {}),
      })
    );

    // Sound only for the right audience: business = unassigned only; agent = assigned to me AND conversation is in my department (Support vs Sales).
    if (!formattedMessage.isInternalNote) {
      const isUnassigned = assignment && (assignment.status === 'ai_only' || assignment.type === 'unassigned');
      const isAssignedToMe = user.role === 'agent' && assignment && assignment.type === 'agent' && (assignment.id === user._id || assignment.id === (user as any).id);
      const conversationChannelId = data.channelId ?? null;
      const isMyDepartment = !conversationChannelId || myChannelIds.includes(conversationChannelId);
      if (user.role === 'business' && isUnassigned) {
        playNotificationSound();
      } else if (isAssignedToMe && isMyDepartment) {
        playNotificationSound();
      }
    }

    if (isNewConversation && conversationId && (sender === 'customer' || sender === 'system' || sender === 'ai')) {
      if (user.role === 'business') {
        const row = conversationRowFromBusinessNewMessageSocket(data, {
          conversationId: String(conversationId),
          customerId: String(customerId),
          customerName: String(customerName || ''),
          preview: message,
          unknownCustomerLabel: t('chatInbox.unknownCustomer'),
        });
        dispatch(addNewCustomer(row));
      }
    }

    if (!isNewConversation && conversationId && user.role === 'agent') {
      dispatch(
        updateConversationPreview({
          conversationId: String(conversationId),
          preview: message,
          latestMessageTimestamp: data.createdAt ?? data?.timestamp ?? new Date().toISOString(),
          ...(conversationSource ? { conversationSource } : {}),
          messageMetadata: data.metadata ?? undefined,
        })
      );
    }
    
    if (sender === 'customer') {
      const isUnassigned = assignment && (assignment.status === 'ai_only' || assignment.type === 'unassigned');
      const isAssignedToMe = user.role === 'agent' && assignment && assignment.type === 'agent' && (assignment.id === user._id || assignment.id === (user as any).id);
      const messageId = data._id ?? data?.id ?? '';
      const alreadyShownToast = messageId && lastToastMessageIdRef.current === messageId;

      if (alreadyShownToast) return;

      if (isUnassigned && user.role === 'business') {
        lastToastMessageIdRef.current = messageId || null;
        toast.custom(tToast => <NotificationToast t={tToast} name={customerName} msg={message} />);
        if (messageId) setTimeout(() => { if (lastToastMessageIdRef.current === messageId) lastToastMessageIdRef.current = null; }, 2000);
      } else if (isAssignedToMe) {
        lastToastMessageIdRef.current = messageId || null;
        toast.custom(tToast => <NotificationToast t={tToast} name={customerName} msg={message} />);
        if (messageId) setTimeout(() => { if (lastToastMessageIdRef.current === messageId) lastToastMessageIdRef.current = null; }, 2000);
      }
    }
  }, [user, dispatch, t, myChannelIds]);

  const handleOutboundMessagePending = useCallback(
    (data: {
      clientRequestId?: string;
      customerId?: string;
      conversationId?: string;
      message?: string;
      messageType?: string;
      startedAt?: string;
    }) => {
      const customerId = data?.customerId;
      const clientRequestId = data?.clientRequestId;
      if (!customerId || !clientRequestId) return;
      dispatch(
        addOutboundPendingMessage({
          customerId: String(customerId),
          clientRequestId: String(clientRequestId),
          text: String(data.message ?? ''),
          messageType: data.messageType || 'text',
        })
      );
      if (data.conversationId && user.role === 'agent') {
        dispatch(
          updateConversationPreview({
            conversationId: String(data.conversationId),
            preview: String(data.message ?? ''),
            latestMessageTimestamp: data.startedAt ?? new Date().toISOString(),
          })
        );
      }
    },
    [dispatch, user.role]
  );

  const handleOutboundMessageFailed = useCallback(
    (data: { clientRequestId?: string; customerId?: string }) => {
      const customerId = data?.customerId;
      const clientRequestId = data?.clientRequestId;
      if (!customerId || !clientRequestId) return;
      dispatch(
        removeOutboundPendingMessage({
          customerId: String(customerId),
          clientRequestId: String(clientRequestId),
        })
      );
    },
    [dispatch]
  );

  const handleNewAssignment = useCallback((data: ConversationInList & { conversationId?: string }) => {
    // Workflow channel assignment may emit newChatAssigned without customer (conversationId, status, channelId, channelName only)
    if (!data?.customer) {
      if (data?.conversationId && user.role === 'business') {
        dispatch(updateConversationEnhanced({ conversationId: data.conversationId, status: data.status, assignedAgentId: data.assignedAgentId }));
      }
      return;
    }
    if (user.role === 'agent') {
      dispatch(addAssignedConversation(data));
      toast.success(t('chatInbox.toastNewChat', { customerName: data.customer.name }));
      const assignmentChannelId = (data as any).channelId ?? null;
      const isMyDepartment = !assignmentChannelId || myChannelIds.includes(assignmentChannelId);
      if (isMyDepartment) playNotificationSound();
    } else if (user.role === 'business') {
      dispatch(updateConversationStatus({ customerId: data.customer.id, status: data.status, assignedAgentId: data.assignedAgentId }));
    }
  }, [user, dispatch, t, myChannelIds]);

  const handleInitialAgentStatuses = useCallback((allAgentsWithStatus: HumanAgent[]) => {
    allAgentsWithStatus.forEach(agent => dispatch(setAgentStatus({ userId: agent._id, status: agent.status, lastSeen: agent.lastSeen })));
  }, [dispatch]);

  const handleAgentStatusUpdate = useCallback((data: { userId: string; status: 'online' | 'offline'; lastSeen?: string }) => {
    dispatch(setAgentStatus(data));
  }, [dispatch]);

  const handleConversationRemoved = useCallback((data: { conversationId: string }) => {
    dispatch(removeConversation(data));
    dispatch(removeAgentConversation(data));
  }, [dispatch]);

  const handleConversationClosedByAgent = useCallback((data: { conversationId: string }) => {
    if (data?.conversationId) {
      dispatch(removeConversation({ conversationId: data.conversationId }));
      dispatch(removeAgentConversation({ conversationId: data.conversationId }));
    }
  }, [dispatch]);

  // 🔧 NEW: Handle new conversation so chat list updates in real time (no refresh) from any page
  const handleNewConversation = useCallback((data: any) => {
    const payload = conversationRowFromNewConversationSocket(data, t('chatInbox.unknownCustomer'));
    if (!payload) return;
    const state = store.getState();
    const inChatInbox = state.chatInbox.conversations.some((c: ConversationInList) => c.id === payload.id);
    const inAgentInbox = state.agentInbox.conversations.some((c: ConversationInList) => c.id === payload.id);
    if (!inChatInbox) dispatch(addNewCustomer(payload));
    if (!inAgentInbox) dispatch(addAssignedConversation(payload));
  }, [dispatch, t]);

  const handleConversationUpdate = useCallback((data: any) => {
    if (data?.conversationId && (data?.status === 'closed' || data?.status === 'CLOSED')) {
      dispatch(removeConversation({ conversationId: data.conversationId }));
      dispatch(removeAgentConversation({ conversationId: data.conversationId }));
      return;
    }
    if (data?.customerId) {
      dispatch(updateConversationStatus({ customerId: data.customerId, status: data.status, assignedAgentId: data.agentId || (data.to?.type === 'agent' ? data.to.id : undefined) }));
    }
  }, [dispatch]);

  useEffect(() => {
    if (!user?._id || !user?.businessId) {
      disconnectSocket();
      setIsConnected(false);
      return;
    }

    const socket = initSocket(user, accessToken || undefined);

    const onConnect = () => {
      setIsConnected(true);
      if (wasConnectedRef.current) {
        dispatch(socketReconnected());
      }
      wasConnectedRef.current = true;
      socket.emit('getInitialAgentStatuses');
    };
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) onConnect();

    socket.on("initialAgentStatuses", handleInitialAgentStatuses);
    socket.on("agentStatusUpdate", handleAgentStatusUpdate);
    socket.on("newMessage", handleNewMessage);
    socket.on("outboundMessagePending", handleOutboundMessagePending);
    socket.on("outboundMessageFailed", handleOutboundMessageFailed);
    socket.on("newConversation", handleNewConversation);
    socket.on("newChatAssigned", handleNewAssignment);
    socket.on("conversationRemoved", handleConversationRemoved);
    socket.on("conversationClosedByAgent", handleConversationClosedByAgent);
    socket.on("conversationUpdated", handleConversationUpdate);
    socket.on("conversationTransferred", handleNewAssignment);
    socket.on("newTicketCreated", handleConversationUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off("initialAgentStatuses", handleInitialAgentStatuses);
      socket.off("agentStatusUpdate", handleAgentStatusUpdate);
      socket.off("newMessage", handleNewMessage);
      socket.off("outboundMessagePending", handleOutboundMessagePending);
      socket.off("outboundMessageFailed", handleOutboundMessageFailed);
      socket.off("newConversation", handleNewConversation);
      socket.off("newChatAssigned", handleNewAssignment);
      socket.off("conversationRemoved", handleConversationRemoved);
      socket.off("conversationClosedByAgent", handleConversationClosedByAgent);
      socket.off("conversationUpdated", handleConversationUpdate);
      socket.off("conversationTransferred", handleNewAssignment);
      socket.off("newTicketCreated", handleConversationUpdate);
    };
  }, [user, accessToken, handleNewMessage, handleOutboundMessagePending, handleOutboundMessageFailed, handleNewAssignment, handleNewConversation, handleInitialAgentStatuses, handleAgentStatusUpdate, handleConversationRemoved, handleConversationClosedByAgent, handleConversationUpdate]);

  const menuItems = useMemo(() => {
    if (!user) return [];
    const accessibleRoutes = menuRoutes.filter(route => route.allowedRoles.includes(user.role));
    const grouped = accessibleRoutes.reduce((acc, route) => {
      if (!acc[route.section]) acc[route.section] = [];
      const labelKey = `sidebar.labels.${route.label.toLowerCase().replace(/[^a-z0-9]/gi, '')}`;
      acc[route.section].push({
        label: t(labelKey, route.label),
        to: `/main-menu/${route.path}`,
        icon: route.icon,
        action: route.action,
      });
      return acc;
    }, {} as Record<string, any[]>);
    return [
      { title: t('sidebar.sections.mainmenu', 'Main Menu'), links: grouped["Main Menu"] || [] },
      { title: t('sidebar.sections.business', 'Business'), links: grouped["Business"] || [] },
      { title: t('sidebar.sections.account', 'Account'), links: grouped["Account"] || [] }
    ].filter(section => section.links.length > 0);
  }, [user, t]);

  const businessId = useMemo(() => user?.businessId, [user]);

  useEffect(() => {
    if (businessId && user?.role === 'business') {
      dispatch(fetchBusinessById(businessId));
      dispatch(fetchAiIntregationByBusinessId(businessId));
    }
  }, [dispatch, businessId, user?.role]);

  const handleMenuClick = async (item: any) => {
    if (item.action === 'logout') {
      try {
        const socket = getSocket();
        if (socket && socket.connected) {
          socket.emit('manual-logout');
        }
        await dispatch(logoutUser()).unwrap();
        toast.success(t('toastLogoutSuccess'));
        navigate('/login');
        window.location.reload();
      } catch (err) {
        toast.error(t('toastLogoutFailed'));
      }
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateImage = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setImageSrc(isDark ? logo : logoWhite);
    };
    updateImage();
    mediaQuery.addEventListener('change', updateImage);
    const observer = new MutationObserver(updateImage);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => { mediaQuery.removeEventListener('change', updateImage); observer.disconnect(); };
  }, []);

  const endDateRaw = selectedBusiness?.currentPeriodEnd || selectedBusiness?.trialEndDate;
  const endDate = endDateRaw ? format(new Date(endDateRaw), 'MMMM d, yyyy, h:mm a') : 'N/A';

  const currentPlanKey = selectedBusiness?.subscriptionPlan as 'basic' | 'premium' | 'enterprise' | undefined;
  const currentPlanLabel = currentPlanKey
    ? t(`pricingPage.plans.${currentPlanKey}.label`)
    : t('pricingPage.usage.noPlan');

  const limits = aiIntegrations?.integrationDetails?.limits;
  const usage = aiIntegrations?.integrationDetails?.usageStats;
  const seatsUsed = (aiIntegrations as any)?.seatsUsed ?? 0;
  const seatsMax = limits?.maxSeats ?? 0;
  const aiCreditsUsed = usage?.monthlyAiTurnsUsed ?? 0;
  const aiCreditsMax = limits?.maxMonthlyAiTurns ?? 0;
  const headerUsageParts: string[] = [];
  if (seatsMax > 0) headerUsageParts.push(t('pricingPage.usage.headerSeats', { used: seatsUsed, max: seatsMax, defaultValue: '{{used}}/{{max}} seats' }));
  if (aiCreditsMax > 0) headerUsageParts.push(t('pricingPage.usage.headerAiCredits', { used: aiCreditsUsed, max: aiCreditsMax, defaultValue: '{{used}}/{{max}} AI credits' }));
  if (limits?.maxAgents) headerUsageParts.push(`${limits.maxAgents} AI agents`);
  if (limits?.maxWhatsappNumbers) headerUsageParts.push(`${limits.maxWhatsappNumbers} WhatsApp`);
  if (limits?.maxWebsites) headerUsageParts.push(`${limits.maxWebsites} website`);
  const headerUsage = headerUsageParts.join(' • ');

  // --- SUBSCRIPTION RESTRICTION COMMENTED OUT: no banner ---
  // let subscriptionBanner: string | null = null;
  // if (selectedBusiness) {
  //   const status = selectedBusiness.subscriptionStatus as string | undefined;
  //   const trialEnd = selectedBusiness.trialEndDate ? new Date(selectedBusiness.trialEndDate) : null;
  //   if (status === 'trial') {
  //     if (trialEnd && trialEnd < new Date()) {
  //       subscriptionBanner = t('pricingPage.trial.ended');
  //     } else if (trialEnd) {
  //       const days = Math.max(0, differenceInDays(trialEnd, new Date()));
  //       subscriptionBanner = t('pricingPage.trial.endsIn', { count: days });
  //     }
  //   } else if (status === 'past_due' || status === 'incomplete') {
  //     subscriptionBanner = 'Payment issue: please update your billing in Plan & Payment.';
  //   } else if (status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired') {
  //     subscriptionBanner = 'Subscription ended: please renew your plan to restore full access.';
  //   }
  // }
  const subscriptionBanner: string | null = null;

  const SidebarContent = menuItems.length > 0 ? (
    <div className="w-[300px] bg-gradient-to-b from-white to-gray-50 dark:from-[#1B1B20] dark:to-[#151519] scrollbar-hide overflow-y-auto h-full fixed inset-y-0 left-0 border-r border-gray-200 dark:border-[#2C3139] z-40 shadow-sm dark:shadow-[#0F0F12]" >
      {/* Logo Section with Enhanced Styling */}
      <div className="px-6 py-6 border-b border-gray-200 dark:border-[#2C3139] bg-white dark:bg-[#1B1B20]">
        <div className="flex items-center justify-center h-16">
          <img 
            className="h-14 w-auto object-contain max-w-full dark:h-14" 
            src={imageSrc} 
            alt="Nuvro logo" 
          />
        </div>
      </div>
      
      <ScrollArea className="h-[calc(100vh-112px)] px-4 py-4">
        <nav className="flex flex-col gap-6">
          {menuItems.map((section) => (
            <div key={section.title}>
              <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase mb-3 tracking-wider px-2">
                {section.title}
              </p>
              <ul className="space-y-1">
                {section.links.map((link) => (
                  <li key={link.to}>
                    {link.action === 'logout' ? (
                      <button 
                        onClick={() => handleMenuClick(link)} 
                        className="w-full cursor-pointer text-left block rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 text-gray-700 dark:text-[#A3ABB8] hover:text-[#ff21b0] hover:bg-muted/40 group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="group-hover:scale-110 transition-transform duration-200">
                            {link.icon}
                          </span>
                          <span>{link.label}</span>
                        </div>
                      </button>
                    ) : (
                      <NavLink 
                        to={link.to} 
                        onClick={() => setSidebarOpen(false)} 
                        className={({ isActive }) => cn(
                          "block rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group",
                          isActive 
                            ? "bg-[#f7deee] dark:bg-[#ff21b0] text-[#ff21b0] dark:text-[#FFFFFF]" 
                            : "hover:text-[#ff21b0] text-gray-700 dark:text-[#A3ABB8] hover:bg-muted/40"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "group-hover:scale-110 transition-transform duration-200",
                            location.pathname === link.to && "scale-110"
                          )}>
                            {link.icon}
                          </span>
                          <span>{link.label}</span>
                        </div>
                      </NavLink>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </div>
  ) : null;

  const getBreadcrumb = () => {
    const segments = location.pathname.split("/").filter(Boolean);
    return segments.map((segment, index) => {
      const label = segment.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
      const isLast = index === segments.length - 1;
      return (<span className= { cn("text-[#D4D8DE] dark:text-[#A3ABB8] text-[16px]", isLast && "font-500 text-[16px] text-[#101214] dark:text-[#FFFFFF]")} key = { index } > { index > 0 && <span className="mx-1" > /</span >}{ label } </span>);
    });
  };
  
  if (!SidebarContent) {
    return null;
  }

  return (
    <div className= "flex min-h-screen" >
      <div className="hidden md:block" > { SidebarContent } </div>
      <div className="flex-1 flex flex-col min-w-0 md:ml-[300px]">
        <header className="h-[72px] flex items-center sticky top-0 z-[50] bg-gradient-to-r from-white via-gray-50 to-white dark:from-[#1B1B20] dark:via-[#18181D] dark:to-[#1B1B20] border-b border-gray-200 dark:border-[#2C3139] px-6 shadow-sm dark:shadow-[#0F0F12] backdrop-blur-sm bg-white/95 dark:bg-[#1B1B20]/95" >
          <div className="flex items-center gap-6 flex-1">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild> 
                <button className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" > 
                  <Menu className="h-6 w-6" /> 
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[300px]"> 
                {SidebarContent} 
              </SheetContent>
            </Sheet>
            <div className="hidden md:flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-[#252530]">
                {getBreadcrumb()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === 'business' && (
              <div
                className="hidden md:flex flex-col items-start bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/30 dark:to-rose-900/30 border border-pink-200 dark:border-pink-800/50 px-4 py-2 rounded-lg cursor-pointer hover:shadow-md transition-all duration-200 group"
                onClick={() => navigate('/main-menu/pricing')}
              >
                <div className="flex items-center text-sm font-semibold text-[#ff21b0] dark:text-pink-300">
                  <MdOutlinePayment className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> 
                  <span className="mr-1">{currentPlanLabel}</span>
                  <ChevronDown size={14} className="ml-1 group-hover:rotate-180 transition-transform" /> 
                </div>
                <div className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">
                  {headerUsage
                    ? headerUsage
                    : t('subscriptionDetails', { plan: currentPlanLabel, endDate })}
                </div>
                {subscriptionBanner && (
                  <div className="mt-1 text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                    {subscriptionBanner}
                  </div>
                )}
              </div>
            )}
            <div className={cn(
              "flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-200",
              isConnected 
                ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800/50 shadow-sm" 
                : "bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50 shadow-sm"
            )}>
              <Circle className={cn(
                "h-2 w-2 animate-pulse",
                isConnected ? "fill-green-500" : "fill-red-500"
              )} />
              {isConnected ? t('agentInbox.status.online') : t('agentInbox.status.offline')}
            </div>
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-gray-100 dark:bg-[#252530] border border-gray-200 dark:border-[#2C3139]">
              <LanguageToggle />
              <ModeToggle />
            </div>
            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group">
              <CircleUser className="w-6 h-6 cursor-pointer text-gray-600 dark:text-gray-400 group-hover:text-[#ff21b0] dark:group-hover:text-pink-400 transition-colors" />
            </button>
          </div>
        </header>
        <main className="flex-1 min-w-0 p-6 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-[#121212]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}