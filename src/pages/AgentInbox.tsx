import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageSquareText, Loader2, User, MoreVertical, ChevronsRight, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { io, Socket } from 'socket.io-client';
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAgentConversations,
  addAssignedConversation,
  removeConversation
} from "../features/humanAgent/humanAgentInboxSlice";
import { 
  fetchMessagesByCustomer, 
  addRealtimeMessage, 
  sendHumanMessage 
} from "@/features/chatInbox/chatInboxSlice";
import { fetchHumanAgents,  updateAgentStatus } from "@/features/humanAgent/humanAgentSlice";
import { fetchChannels} from "@/features/channel/channelSlice";
import dayjs from "dayjs";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";
import { AppDispatch, RootState } from "@/app/store";
import toast from 'react-hot-toast';
import { api } from '../api/axios';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import NotificationToast from "@/components/custom/Notification/NotificationToast";

dayjs.extend(isToday);
dayjs.extend(isYesterday);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const SystemMessage = ({ text }: { text: string }) => (
    <div className="flex items-center justify-center my-4"><div className="text-center text-xs text-muted-foreground px-4 py-1 bg-muted rounded-full">{text}</div></div>
);

export default function AgentInbox() {
  const dispatch = useDispatch<AppDispatch>();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'open' | 'closed'>('open');
  
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const conversationsRef = useRef<any[]>([]);
  const audioInitialized = useRef(false);
  const notificationRef = useRef<HTMLAudioElement | null>(null);

  const { user }: { user: any } = useSelector((state: RootState) => state.auth);
  const { channels } = useSelector((state: RootState) => state.channel);
  const { agents } = useSelector((state: RootState) => state.humanAgent);
  const businessId = user?.businessId;
  const agentId = user?._id;

  const { conversations, status: agentInboxStatus } = useSelector((state: RootState) => state.agentInbox);
  const { chatData } = useSelector((state: RootState) => state.chatInbox);
  
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  const currentConversation = useMemo(() => {
    if (!Array.isArray(conversations)) return null;
    return conversations.find((c) => c.customer?.id === selectedCustomer);
  }, [conversations, selectedCustomer]);
  
  const handleAppClick = useCallback(() => {
    if (!audioInitialized.current && notificationRef.current) {
        notificationRef.current.load();
        audioInitialized.current = true;
    }
  }, []);
  
  useEffect(() => {
    window.addEventListener('click', handleAppClick, { once: true });
    return () => window.removeEventListener('click', handleAppClick);
  }, [handleAppClick]);

  useEffect(() => {
    dispatch(fetchAgentConversations());
    dispatch(fetchHumanAgents());
    dispatch(fetchChannels());

    const newSocket = io(API_BASE_URL, { query: { userId: agentId }, transports: ['websocket'] });
    setSocket(newSocket);
    
    newSocket.on('connect', () => { setIsConnected(true); if (agentId) newSocket.emit('agentOnline', agentId); });
    newSocket.on('disconnect', () => setIsConnected(false));

    return () => { newSocket.disconnect(); };
  }, [dispatch, agentId]);
  
  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (data: any) => {
        dispatch(addRealtimeMessage({ customerId: data.customerId, message: { text: data.message, sentBy: data.sender, time: new Date().toISOString() } }));
        if (data.sender === 'customer') {
          toast.custom((t) => <NotificationToast t={t} name={data.customerName || "A customer"} msg={data.message} />);
          if (audioInitialized.current) notificationRef.current?.play();
        }
    };
    
    const handleNewAssignment = (data: any) => {
        toast.success(`New chat assigned from ${data.customer.name}`);
        const currentConversations = conversationsRef.current;
        if (!currentConversations.some(c => c.id === data.id)) {
            dispatch(addAssignedConversation(data));
        }
    };

    const handleConversationRemoved = (data: { conversationId: string }) => {
        dispatch(removeConversation(data));
        if (currentConversation?.id === data.conversationId) {
            setSelectedCustomer(null);
        }
    };

    const handleAgentStatusChange = (data: { userId: string, status: 'online' | 'offline' }) => {
        dispatch(updateAgentStatus(data));
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("newChatAssigned", handleNewAssignment);
    socket.on("conversationRemoved", handleConversationRemoved);
    socket.on("agentStatusChanged", handleAgentStatusChange);

    return () => {
      socket.off("newMessage");
      socket.off("newChatAssigned");
      socket.off("conversationRemoved");
      socket.off("agentStatusChanged");
    };
  }, [dispatch, socket, currentConversation]);

  useEffect(() => { notificationRef.current = new Audio("/sounds/notification.mp3"); }, []);

  useEffect(() => {
    if (selectedCustomer) { dispatch(fetchMessagesByCustomer({ customerId: selectedCustomer })); }
  }, [selectedCustomer, dispatch]);

  useEffect(() => {
    if (messageListRef.current) { messageListRef.current.scrollTop = messageListRef.current.scrollHeight; }
  }, [chatData[selectedCustomer || '']]);

  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !selectedCustomer || !businessId || !socket) return;
    dispatch(sendHumanMessage({ businessId, customerId: selectedCustomer, message: newMessage.trim(), senderSocketId: socket.id ?? "" }))
      .unwrap().catch((error) => toast.error(error || "Message failed to send."));
    setNewMessage("");
  }, [newMessage, selectedCustomer, businessId, dispatch, socket]);

  const handleTransfer = async (target: { type: 'agent' | 'channel', id: string }) => {
    if (!currentConversation?.id) { toast.error("Cannot transfer: Conversation ID not found."); return; }
    const payload = target.type === 'agent' ? { targetAgentId: target.id } : { targetChannelId: target.id };
    const promise = api.post(`/api/v1/conversations/${currentConversation.id}/transfer`, payload);
    toast.promise(promise, {
        loading: 'Transferring conversation...',
        success: 'Conversation transferred!',
        error: (err: any) => err.response?.data?.message || 'Transfer failed.'
    });
  };

  const onlineAgents = useMemo(() => Array.isArray(agents) ? agents.filter(agent => agent.status === 'online' && agent._id !== agentId) : [], [agents, agentId]);
  const filteredConversations = useMemo(() => {
    const list = Array.isArray(conversations) ? conversations : [];
    if (activeFilter === 'closed') { return list.filter(c => c.status === 'closed'); }
    return list.filter(c => c.status !== 'closed');
  }, [conversations, activeFilter]);
  const sortedConversations = useMemo(() => [...filteredConversations].sort((a, b) => dayjs(b.latestMessageTimestamp || 0).valueOf() - dayjs(a.latestMessageTimestamp || 0).valueOf()), [filteredConversations]);
  const groupedMessages = useMemo(() => {
    const allMessages = selectedCustomer ? chatData[selectedCustomer] || [] : [];
    return allMessages.reduce((acc: any, msg: any) => {
      const dateLabel = dayjs(msg.time).isToday() ? "Today" : dayjs(msg.time).isYesterday() ? "Yesterday" : dayjs(msg.time).format("MMMM D, YYYY");
      if (!acc[dateLabel]) acc[dateLabel] = [];
      acc[dateLabel].push(msg);
      return acc;
    }, {});
  }, [selectedCustomer, chatData]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] h-screen w-full gap-6 p-6">
      <aside className="flex flex-col border bg-card p-4 rounded-xl max-h-screen">
          <div className="flex items-center justify-between px-2 mb-2">
            <h1 className="text-2xl font-bold">My Inbox</h1>
            <div className={cn("flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-full", isConnected ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300")}>
                {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                {isConnected ? 'Online' : 'Offline'}
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 border-y">
              <Button variant={activeFilter === 'open' ? 'default' : 'ghost'} className="flex-1 h-8" onClick={() => setActiveFilter('open')}>Open</Button>
              <Button variant={activeFilter === 'closed' ? 'default' : 'ghost'} className="flex-1 h-8" onClick={() => setActiveFilter('closed')}>Closed</Button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide pr-2 mt-2">
              {agentInboxStatus === 'loading' ? (
                  <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : sortedConversations.length > 0 ? (
                  sortedConversations.map((convo) => (
                      <div key={convo.id} onClick={() => setSelectedCustomer(convo.customer.id)} className={cn("flex items-center gap-4 p-3 rounded-lg cursor-pointer", selectedCustomer === convo.customer.id ? "bg-primary/10" : "hover:bg-muted/50")}>
                          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center font-bold text-primary shrink-0">{convo.customer.name?.charAt(0).toUpperCase()}</div>
                          <div className="flex-1 overflow-hidden">
                              <p className="font-semibold truncate">{convo.customer.name}</p>
                              <p className="text-sm text-muted-foreground truncate">{convo.preview}</p>
                          </div>
                      </div>
                  ))
              ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
                      <MessageSquareText className="h-12 w-12 mb-2" />
                      <p>You have no {activeFilter} conversations.</p>
                  </div>
              )}
          </div>
      </aside>
      <main className="flex flex-col bg-card border rounded-xl max-h-screen">
          {!selectedCustomer ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><MessageSquareText className="h-16 w-16 mb-4" /><h2 className="text-xl font-medium">Select a conversation</h2><p>Choose a conversation from your inbox to begin.</p></div>
          ) : (
              <>
                  <div className="flex items-center justify-between p-4 border-b">
                      <h2 className="font-semibold">{currentConversation?.customer?.name}</h2>
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5"/></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Transfer Conversation</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {Array.isArray(channels) && channels.length > 0 ? (
                                  channels.map((channel) => (
                                      <DropdownMenuItem key={channel._id} onSelect={() => handleTransfer({ type: 'channel', id: channel._id })}>
                                          <ChevronsRight className="mr-2 h-4 w-4" /> To {channel.name} Channel
                                      </DropdownMenuItem>
                                  ))
                              ) : null}
                              {Array.isArray(channels) && channels.length > 0 && onlineAgents.length > 0 && <DropdownMenuSeparator />}
                              {onlineAgents.length > 0 ? (
                                  onlineAgents.map((agent) => (
                                      <DropdownMenuItem key={agent._id} onSelect={() => handleTransfer({ type: 'agent', id: agent._id })}>
                                          <User className="mr-2 h-4 w-4" /> To {agent.name}
                                      </DropdownMenuItem>
                                  ))
                              ) : null}
                               {(Array.isArray(channels) && channels.length === 0 && onlineAgents.length === 0) && (
                                <DropdownMenuItem disabled>No transfer options available</DropdownMenuItem>
                               )}
                          </DropdownMenuContent>
                      </DropdownMenu>
                  </div>
                  <div ref={messageListRef} className="flex-1 p-6 space-y-2 overflow-y-auto scrollbar-hide">
                      {Object.entries(groupedMessages).map(([date, group]: any) => (
                          <div key={date}>
                              <div className="text-center text-xs text-muted-foreground my-4">{date}</div>
                              {group?.map((msg: any, i: any) => {
                                  if (msg.sentBy === 'system') return <SystemMessage key={i} text={msg.text} />;
                                  const isAgentSide = ["agent", "human"].includes(msg.sentBy);
                                  return (<div key={i} className={cn("flex flex-col my-4", isAgentSide ? "items-end" : "items-start")}><div className={cn("max-w-[65%] p-3 rounded-2xl text-sm leading-snug", isAgentSide ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted text-muted-foreground rounded-bl-none")}>{msg.text}</div><p className="text-xs text-muted-foreground mt-1.5 px-1">{dayjs(msg.time).format("h:mm A")}</p></div>);
                              })}
                          </div>
                      ))}
                  </div>
                  <div className="p-6 border-t">
                      <div className="relative">
                          <Textarea placeholder="Type your message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} className="w-full resize-none p-4 pr-14 rounded-lg bg-muted border-none" rows={1} />
                          <Button onClick={handleSendMessage} size="icon" className="absolute right-3 bottom-2.5 h-9 w-9 bg-primary"><Send className="h-4 w-4" /></Button>
                      </div>
                  </div>
              </>
          )}
      </main>
    </div>
  );
}