// src/layouts/DashboardLayout.tsx

import { useState, useEffect, useMemo, useRef } from "react";
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
  const { user }: any = useSelector((state: RootState) => state.auth as { user: AuthUser | null });
  const { selectedBusiness } = useSelector((state: RootState) => state.business);
  
  const [isConnected, setIsConnected] = useState(getSocket()?.connected || false);

  const notificationRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    notificationRef.current = new Audio("/sounds/notification.mp3");
    const initAudio = () => { if (notificationRef.current) notificationRef.current.load(); };
    window.addEventListener('click', initAudio, { once: true });
    return () => window.removeEventListener('click', initAudio);
  }, []);

  useEffect(() => {
    if (!user?._id || !user?.businessId) {
      disconnectSocket();
      setIsConnected(false);
      return;
    }

    const socket = initSocket(user);

    const onConnect = () => {
      setIsConnected(true);
      socket.emit('getInitialAgentStatuses');
    };
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) onConnect();

    // ----------- THE FIX IS HERE -----------
    const handleNewMessage = (data: any) => {
      const { customerId, sender, message, customerName, conversationId, assignment, senderSocketId } = data;
      
      if (!customerId || !sender) return;
      if (senderSocketId && senderSocketId === socket.id) return;

      const formattedMessage: Message = { _id: data._id, text: message, sentBy: sender, time: data.createdAt || new Date().toISOString() };

      // Get the MOST RECENT state directly from the store inside the handler
      const currentState = store.getState();
      const allCurrentConversations = [
          ...currentState.chatInbox.conversations,
          ...currentState.agentInbox.conversations
      ];
      const uniqueConversations = allCurrentConversations.filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i);
      const isNewConversation = !uniqueConversations.some(c => c.id === conversationId);

      // --- Universal Update ---
      // This will now correctly add ANY new message (customer, AI, or human) to the chat window's state.
      dispatch(addRealtimeMessage({ customerId, message: formattedMessage }));

      // --- Conditional Logic for Lists & Notifications ---
      if (isNewConversation && (sender === 'customer' || sender === 'system' || sender === 'ai')) {
        if (user.role === 'business') {
            dispatch(addNewCustomer({ id: conversationId, customer: { id: customerId, name: customerName || t('chatInbox.unknownCustomer') }, preview: message, latestMessageTimestamp: new Date().toISOString(), status: 'ai_only' }));
        }
      }

      // Update previews for existing conversations
      if (!isNewConversation) {
          dispatch(updateConversationPreview({ conversationId, preview: message, latestMessageTimestamp: data.createdAt || new Date().toISOString() }));
      }
      
      // Handle pop-up notifications ONLY for customer messages
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
    };
    // ----------- END OF FIX -----------
    
    const handleNewAssignment = (data: ConversationInList) => {
      if (user.role === 'agent') {
        dispatch(addAssignedConversation(data));
        toast.success(t('chatInbox.toastNewChat', { customerName: data.customer.name }));
        playNotificationSound(notificationRef);
      } else if (user.role === 'business') {
        dispatch(updateConversationStatus({ customerId: data.customer.id, status: data.status, assignedAgentId: data.assignedAgentId }));
      }
    };

    // Other listeners...
    const handleInitialAgentStatuses = (allAgentsWithStatus: HumanAgent[]) => allAgentsWithStatus.forEach(agent => dispatch(setAgentStatus({ userId: agent._id, status: agent.status, lastSeen: agent.lastSeen })));
    const handleAgentStatusUpdate = (data: { userId: string; status: 'online' | 'offline'; lastSeen?: string }) => dispatch(setAgentStatus(data));
    const handleConversationRemoved = (data: { conversationId: string }) => { dispatch(removeConversation(data)); dispatch(removeAgentConversation(data)); };
    const handleConversationUpdate = (data: any) => dispatch(updateConversationStatus({ customerId: data.customerId, status: data.status, assignedAgentId: data.agentId || (data.to?.type === 'agent' ? data.to.id : undefined) }));

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
  }, [user, dispatch, t]);

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
    <div className= "w-[300px] bg-[#FAFAFA] dark:bg-[#1B1B20] scrollbar-hide overflow-y-auto h-full fixed inset-y-0 left-0 border-r-[0.5px] border-[#D4D8DE] dark:border-[#2C3139] z-40" >
      <div className="px-6 my-6 max-h-[100px]" >
        <img className="object-fill" src = { imageSrc } alt = "Nuvro logo" />
      </div>
      <ScrollArea className = "h-[calc(100vh-64px)] px-4" >
        <nav className="flex flex-col gap-6" >
          { menuItems.map((section) => (
            <div key= { section.title } >
            <p className="text-[12px] font-400 text-[#A3ABB8] uppercase mb-2" > { section.title } </p>
              <ul className = "space-y-1" >
                { section.links.map((link) => (
                  <li key= { link.to } >
                  {
                    link.action === 'logout' ? (
                      <button onClick= {() => handleMenuClick(link)} className = "w-full cursor-pointer text-left block rounded-md px-3 py-2 text-sm font-400 transition-colors text-[#A3ABB8] hover:text-[#ff21b0] hover:bg-muted/40" >
                        <div className="flex items-center" > { link.icon }{ link.label } </div>
                      </button>
                    ) : (
                      <NavLink to= { link.to } onClick = {() => setSidebarOpen(false)} className = {({ isActive }) => cn("block rounded-md px-3 py-2 text-sm font-400 transition-colors", isActive ? "bg-[#f7deee] dark:bg-[#ff21b0] text-[#ff21b0] dark:text-[#FFFFFF]" : "hover:text-[#ff21b0] text-[#A3ABB8] hover:bg-muted/40")}>
                        <div className="flex items-center" > { link.icon }{ link.label } </div>
                      </NavLink>
                    )
                  }
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
        <header className="h-[64px] flex items-center sticky top-0 z-[50] bg-[#FAFAFA] dark:bg-[#1B1B20] border-b-[0.5px] border-[#D4D8DE] dark:border-[#2C3139] px-[20px] py-[40px] justify-between" >
          <div className="flex items-center gap-4" >
            <Sheet open={ sidebarOpen } onOpenChange = { setSidebarOpen } >
              <SheetTrigger asChild > 
                <button className="md:hidden" > 
                  <Menu className="h-6 w-6" /> 
                </button>
              </SheetTrigger >
              <SheetContent side="left" className = "p-0 w-[300px]" > 
                { SidebarContent } 
              </SheetContent>
            </Sheet>
            <div className = "text-sm hidden md:flex items-center" > { getBreadcrumb() } </div>
          </div>
          <div className = "flex items-center gap-4" >
            { user?.role === 'business' && (
              <div className="hidden md:flex flex-col items-center text-[16px] font-400 text-[#101214] dark:text-[#FFFFFF] border-[#D4D8DE] dark:border-[#2C3139] border-[1px] px-[16px] py-[8px] rounded-md cursor-pointer" >
                <div className="flex items-center" > <MdOutlinePayment className="mr-2" /> { t('currentSubscription') } < ChevronDown size = { 16} className = "ml-1" /> </div>
                <div className = "text-[10px] text-[#A3ABB8] dark:text-[#ABA8B4]" > { t('subscriptionDetails', { plan: selectedBusiness?.subscriptionPlan, endDate: endDate }) } </div>
              </div>
            )}
            <div className={ cn("flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full", isConnected ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300") }>
              <Circle className={ cn("h-2 w-2", isConnected ? "fill-green-500" : "fill-red-500") } />
              { isConnected ? t('agentInbox.status.online') : t('agentInbox.status.offline') }
            </div>
            <LanguageToggle />
            <ModeToggle />
            <CircleUser className = "w-6 h-6 cursor-pointer" />
          </div>
        </header>
        <main className = "flex-1 p-6 overflow-y-auto bg-gray-50 dark:bg-[#121212]" >
          <Outlet />
        </main>
      </div>
    </div>
  );
}