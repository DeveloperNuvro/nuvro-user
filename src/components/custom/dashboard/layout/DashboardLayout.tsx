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
import { fetchBusinessById } from "@/features/business/businessSlice";
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { menuRoutes } from "@/appRoutes";
import { initSocket, disconnectSocket, getSocket } from "../../../../lib/useSocket";
import {
  addRealtimeMessage,
  addNewCustomer,
  removeConversation,
  updateConversationStatus,
  updateConversationEnhanced,
  ConversationInList,
  Message
} from '@/features/chatInbox/chatInboxSlice';
import { addAssignedConversation, updateConversationPreview, removeConversation as removeAgentConversation } from "@/features/humanAgent/humanAgentInboxSlice";
import { setAgentStatus, HumanAgent } from "@/features/humanAgent/humanAgentSlice";
import NotificationToast from "@/components/custom/Notification/NotificationToast";

const playNotificationSound = (notificationRef: React.RefObject<HTMLAudioElement | null>) => {
  if (notificationRef.current) {
    notificationRef.current.currentTime = 0;
    const playPromise = notificationRef.current.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => { console.warn("Audio playback prevented.", error); });
    }
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
  const { selectedBusiness } = useSelector((state: RootState) => state.business);
  
  const [isConnected, setIsConnected] = useState(getSocket()?.connected || false);

  const notificationRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    notificationRef.current = new Audio("/sounds/notification.mp3");
    const initAudio = () => { if (notificationRef.current) notificationRef.current.load(); };
    window.addEventListener('click', initAudio, { once: true });
    return () => window.removeEventListener('click', initAudio);
  }, []);

  // 🔧 OPTIMIZED: Memoize socket event handlers with useCallback (moved outside useEffect)
  const handleNewMessage = useCallback((data: any) => {
    const { customerId, sender, message, customerName, conversationId, assignment, senderSocketId } = data;
    
    if (!customerId || !sender) return;
    const socket = getSocket();
    if (senderSocketId && senderSocketId === socket?.id) return;

    const formattedMessage: Message = { 
      _id: data._id, 
      text: message, 
      sentBy: sender, 
      time: data.createdAt || new Date().toISOString(),
      messageType: data.messageType || data.metadata?.messageType || 'text',
      mediaUrl: data.mediaUrl || data.metadata?.mediaUrl || data.metadata?.cloudinaryUrl || null,
      cloudinaryUrl: data.cloudinaryUrl || data.metadata?.cloudinaryUrl || null,
      originalMediaUrl: data.originalMediaUrl || data.metadata?.originalMediaUrl || null,
      proxyUrl: data.proxyUrl || data.metadata?.proxyUrl || null,
      attachmentId: data.attachmentId || data.metadata?.attachmentId || null,
      metadata: data.metadata || {}
    };

    const currentState = store.getState();
    const allCurrentConversations = [
        ...currentState.chatInbox.conversations,
        ...currentState.agentInbox.conversations
    ];
    const uniqueConversations = allCurrentConversations.filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i);
    const isNewConversation = !uniqueConversations.some(c => c.id === conversationId);

    dispatch(addRealtimeMessage({ customerId, message: formattedMessage }));

    if (isNewConversation && (sender === 'customer' || sender === 'system' || sender === 'ai')) {
      if (user.role === 'business') {
          dispatch(addNewCustomer({ id: conversationId, customer: { id: customerId, name: customerName || t('chatInbox.unknownCustomer') }, preview: message, latestMessageTimestamp: new Date().toISOString(), status: 'ai_only' }));
      }
    }

    if (!isNewConversation) {
        dispatch(updateConversationPreview({ conversationId, preview: message, latestMessageTimestamp: data.createdAt || new Date().toISOString() }));
    }
    
    if (sender === 'customer') {
      const isUnassigned = assignment && (assignment.status === 'ai_only' || assignment.type === 'unassigned');
      const isAssignedToMe = user.role === 'agent' && assignment && assignment.type === 'agent' && assignment.id === user._id;

      if (isUnassigned && user.role === 'business') {
        toast.custom(tToast => <NotificationToast t={tToast} name={customerName} msg={message} />);
        playNotificationSound(notificationRef);
      } else if (isAssignedToMe) {
        toast.custom(tToast => <NotificationToast t={tToast} name={customerName} msg={message} />);
        playNotificationSound(notificationRef);
      }
    }
  }, [user, dispatch, t]);

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
      playNotificationSound(notificationRef);
    } else if (user.role === 'business') {
      dispatch(updateConversationStatus({ customerId: data.customer.id, status: data.status, assignedAgentId: data.assignedAgentId }));
    }
  }, [user, dispatch, t]);

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

  const handleConversationUpdate = useCallback((data: any) => {
    dispatch(updateConversationStatus({ customerId: data.customerId, status: data.status, assignedAgentId: data.agentId || (data.to?.type === 'agent' ? data.to.id : undefined) }));
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
      socket.emit('getInitialAgentStatuses');
    };
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) onConnect();

    socket.on("initialAgentStatuses", handleInitialAgentStatuses);
    socket.on("agentStatusUpdate", handleAgentStatusUpdate);
    socket.on("newMessage", handleNewMessage);
    socket.on("newChatAssigned", handleNewAssignment);
    socket.on("conversationRemoved", handleConversationRemoved);
    socket.on("conversationTransferred", handleNewAssignment);
    socket.on("newTicketCreated", handleConversationUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off("initialAgentStatuses", handleInitialAgentStatuses);
      socket.off("agentStatusUpdate", handleAgentStatusUpdate);
      socket.off("newMessage", handleNewMessage);
      socket.off("newChatAssigned", handleNewAssignment);
      socket.off("conversationRemoved", handleConversationRemoved);
      socket.off("conversationTransferred", handleNewAssignment);
      socket.off("newTicketCreated", handleConversationUpdate);
    };
  }, [user, accessToken, handleNewMessage, handleNewAssignment, handleInitialAgentStatuses, handleAgentStatusUpdate, handleConversationRemoved, handleConversationUpdate]);

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
      <div className = "flex-1 flex flex-col md:ml-[300px]" >
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
              <div className="hidden md:flex flex-col items-start bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/30 dark:to-rose-900/30 border border-pink-200 dark:border-pink-800/50 px-4 py-2 rounded-lg cursor-pointer hover:shadow-md transition-all duration-200 group">
                <div className="flex items-center text-sm font-semibold text-[#ff21b0] dark:text-pink-300">
                  <MdOutlinePayment className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> 
                  {t('currentSubscription')} 
                  <ChevronDown size={14} className="ml-1 group-hover:rotate-180 transition-transform" /> 
                </div>
                <div className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">
                  {t('subscriptionDetails', { plan: selectedBusiness?.subscriptionPlan, endDate: endDate })}
                </div>
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
        <main className = "flex-1 p-6 overflow-y-auto bg-gray-50 dark:bg-[#121212]" >
          <Outlet />
        </main>
      </div>
    </div>
  );
}