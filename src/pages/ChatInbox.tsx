import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageSquareText, Loader2, User, Ticket, Bot, MoreVertical, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { io, Socket } from 'socket.io-client';
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCustomersByBusiness,
  fetchMessagesByCustomer,
  addRealtimeMessage,
  addNewCustomer,
  sendHumanMessage,
  updateConversationStatus,
  removeConversation,
  ConversationInList
} from "@/features/chatInbox/chatInboxSlice";
import { fetchHumanAgents,  updateAgentStatus } from "@/features/humanAgent/humanAgentSlice";
import { fetchChannels } from "@/features/channel/channelSlice";
import dayjs from "dayjs";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";
import { AppDispatch, RootState } from "@/app/store";
import toast from 'react-hot-toast';
import NotificationToast from "@/components/custom/Notification/NotificationToast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/api/axios";

dayjs.extend(isToday);
dayjs.extend(isYesterday);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const SystemMessage = ({ text }: { text: string }) => (
  <div className="flex items-center justify-center my-4">
    <div className="text-center text-xs text-muted-foreground px-4 py-1 bg-muted rounded-full">{text}</div>
  </div>
);

export default function ChatInbox() {
  const dispatch = useDispatch<AppDispatch>();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [unread, setUnread] = useState<{ [key: string]: boolean }>({});
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState<{ [key: string]: boolean }>({});
  const [activeFilter, setActiveFilter] = useState<'open' | 'closed'>('open');
  
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const notificationRef = useRef<HTMLAudioElement | null>(null);
  const audioInitialized = useRef(false);
  const conversationsRef = useRef<any[]>([]);

  const { user }: { user: any } = useSelector((state: RootState) => state.auth);
  const { channels } = useSelector((state: RootState) => state.channel);
  const { agents } = useSelector((state: RootState) => state.humanAgent);
  const businessId = user?.businessId;

  const { conversations, chatData, status: chatListStatus } = useSelector((state: RootState) => state.chatInbox);

  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  const currentConversation = useMemo(() => conversations.find((c) => c.customer.id === selectedCustomer), [conversations, selectedCustomer]);

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
    if (businessId) { 
      dispatch(fetchCustomersByBusiness({ businessId, page: 1, searchQuery: debouncedSearchQuery })); 
      dispatch(fetchHumanAgents());
      dispatch(fetchChannels());
    }
  }, [businessId, dispatch, debouncedSearchQuery]);

  useEffect(() => {
    const newSocket = io(API_BASE_URL, { query: { userId: user?._id }, transports: ['websocket'], withCredentials: true });
    setSocket(newSocket);
    return () => { newSocket.disconnect(); };
  }, [user?._id]);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (data: any) => {
      const { customerId, sender, message, customerName, conversationId } = data;
      if (!customerId) return;
      setIsTyping(prev => ({ ...prev, [customerId]: false }));

      const currentConversations = conversationsRef.current;
      const exists = currentConversations.some((c: any) => c.id === conversationId);
      if (!exists && (sender === 'customer' || sender === 'system')) {
        dispatch(addNewCustomer({
            id: conversationId, customer: { id: customerId, name: customerName || "Unknown" },
            preview: message, latestMessageTimestamp: new Date().toISOString(), status: 'ai_only',
        }));
      }
      
      dispatch(addRealtimeMessage({ customerId, message: { text: message, sentBy: sender, time: new Date().toISOString() } }));

      if (sender === 'customer') {
        toast.custom((t) => <NotificationToast t={t} name={customerName || "A customer"} msg={message} />);
        if (audioInitialized.current) { notificationRef.current?.play().catch(err => console.warn("Audio playback failed:", err)); }
      }
    };
    
    const handleNewAssignment = (data: any) => {
        const currentConversations = conversationsRef.current;
        if (!currentConversations.some(c => c.id === data.id)) { dispatch(addNewCustomer(data)); }
        toast.success(`New chat assigned from ${data.customer.name}`);
    };

    const handleConversationRemoved = (data: { conversationId: string }) => { dispatch(removeConversation(data)); };
    const handleConversationUpdate = (data: any) => { dispatch(updateConversationStatus({ customerId: data.customerId, status: data.status, assignedAgentId: data.agentId || (data.to?.type === 'agent' ? data.to.id : undefined) })); };
    const handleAgentStatusChange = (data: { userId: string, status: 'online' | 'offline' }) => { dispatch(updateAgentStatus(data)); };

    socket.on("newMessage", handleNewMessage);
    socket.on("newChatAssigned", handleNewAssignment);
    socket.on("conversationRemoved", handleConversationRemoved);
    socket.on("conversationTransferred", handleConversationUpdate);
    socket.on("newTicketCreated", handleConversationUpdate);
    socket.on("agentStatusChanged", handleAgentStatusChange);

    return () => {
      socket.off("newMessage"); socket.off("newChatAssigned"); socket.off("conversationRemoved");
      socket.off("conversationTransferred"); socket.off("newTicketCreated"); socket.off("agentStatusChanged");
    };
  }, [dispatch, socket]);

  useEffect(() => { notificationRef.current = new Audio("/sounds/notification.mp3"); }, []);

  useEffect(() => {
    if (selectedCustomer) {
      dispatch(fetchMessagesByCustomer({ customerId: selectedCustomer }));
      setUnread((prev) => ({ ...prev, [selectedCustomer]: false }));
    }
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
  
  // --- RE-ADDED THIS FUNCTION ---
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

  const onlineAgents = useMemo(() => Array.isArray(agents) ? agents.filter(agent => agent.status === 'online' && agent._id !== user?._id) : [], [agents, user]);
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
    <TooltipProvider delayDuration={0}>
        <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] h-screen w-full gap-6 p-6">
            <aside className="flex flex-col border bg-card p-4 rounded-xl max-h-screen">
                <h1 className="text-2xl font-bold mb-4 px-2">Inbox</h1>
                <div className="flex items-center gap-2 p-2 border-b">
                    <Button variant={activeFilter === 'open' ? 'default' : 'ghost'} className="flex-1 h-8" onClick={() => setActiveFilter('open')}>Open</Button>
                    <Button variant={activeFilter === 'closed' ? 'default' : 'ghost'} className="flex-1 h-8" onClick={() => setActiveFilter('closed')}>Closed</Button>
                </div>
                <div className="px-2 my-4">
                    <Input placeholder="Search conversations..." className="bg-muted border-none" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}/>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide pr-2">
                {chatListStatus === 'loading' && conversations.length === 0 ? (
                    <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : sortedConversations.length > 0 ? (
                    sortedConversations.map((convo: ConversationInList) => (
                    <div key={convo.id} onClick={() => setSelectedCustomer(convo.customer.id)} className={cn("flex items-center gap-4 p-3 rounded-lg cursor-pointer", selectedCustomer === convo.customer.id ? "bg-primary/10" : "hover:bg-muted/50")}>
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center font-bold text-primary shrink-0">{convo.customer.name?.charAt(0).toUpperCase()}</div>
                        <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-center"><p className="font-semibold truncate">{convo.customer.name}</p><p className="text-xs text-muted-foreground shrink-0 ml-2">{dayjs(convo.latestMessageTimestamp).format("h:mm A")}</p></div>
                        <div className="flex justify-between items-center mt-0.5">
                            <p className="text-sm text-muted-foreground truncate">{isTyping[convo.customer.id] ? <span className="text-primary italic">Typing...</span> : convo.preview}</p>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                {convo.status === 'live' && <Tooltip><TooltipTrigger><User className="h-3 w-3 text-green-500" /></TooltipTrigger><TooltipContent><p>Assigned to {agents.find((a: any) => a._id === convo.assignedAgentId)?.name || 'an agent'}</p></TooltipContent></Tooltip>}
                                {convo.status === 'ticket' && <Tooltip><TooltipTrigger><Ticket className="h-3 w-3 text-orange-500" /></TooltipTrigger><TooltipContent><p>Ticket created</p></TooltipContent></Tooltip>}
                                {convo.status === 'ai_only' && <Tooltip><TooltipTrigger><Bot className="h-3 w-3 text-blue-500" /></TooltipTrigger><TooltipContent><p>Handled by AI</p></TooltipContent></Tooltip>}
                                {unread[convo.customer.id] && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                            </div>
                        </div>
                        </div>
                    </div>
                    ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
                      <MessageSquareText className="h-12 w-12 mb-2" />
                      <p>No {activeFilter} conversations found.</p>
                  </div>
                )}
                </div>
            </aside>  
            <main className="flex flex-col bg-card border rounded-xl max-h-screen">
                {!selectedCustomer ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><MessageSquareText className="h-16 w-16 mb-4" /><h2 className="text-xl font-medium">Select a conversation</h2><p>Choose from the list on the left to view messages.</p></div>
                ) : (
                <>
                    <div className="flex items-center justify-between p-4 border-b">
                        <h2 className="font-semibold">{currentConversation?.customer?.name}</h2>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5"/></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Transfer Conversation</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {Array.isArray(channels) && channels.length > 0 ? (
                                    channels.map((channel: any) => (<DropdownMenuItem key={channel._id} onSelect={() => handleTransfer({ type: 'channel', id: channel._id })}><ChevronsRight className="mr-2 h-4 w-4" /> To {channel.name} Channel</DropdownMenuItem>))
                                ) : ( <DropdownMenuItem disabled>No channels available</DropdownMenuItem> )}
                                <DropdownMenuSeparator />
                                {onlineAgents.length > 0 ? (
                                    onlineAgents.map((agent: any) => (<DropdownMenuItem key={agent._id} onSelect={() => handleTransfer({ type: 'agent', id: agent._id })}><User className="mr-2 h-4 w-4" /> To {agent.name}</DropdownMenuItem>))
                                ) : (
                                    <DropdownMenuItem disabled>No other agents online</DropdownMenuItem>
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
                        {isTyping[selectedCustomer] && <div className="flex flex-col items-start my-4"><div className="bg-muted text-muted-foreground text-sm italic p-3 rounded-2xl rounded-bl-none">Typing...</div></div>}
                    </div>
                    <div className="p-6 border-t">
                        <div className="relative">
                            <Textarea placeholder="Type your message..." value={newMessage} onChange={(e) => { setNewMessage(e.target.value); }} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} className="w-full resize-none p-4 pr-14 rounded-lg bg-muted border-none focus-visible:ring-2 focus-visible:ring-primary" rows={1} />
                            <Button onClick={handleSendMessage} size="icon" className="absolute right-3 bottom-2.5 h-9 w-9 bg-primary cursor-pointer hover:bg-primary/90"><Send className="h-4 w-4" /></Button>
                        </div>
                    </div>
                </>
                )}
            </main>
        </div>
    </TooltipProvider>
  );
}