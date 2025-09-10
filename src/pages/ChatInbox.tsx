// src/pages/ChatInbox.tsx

import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageSquareText, Loader2, User, Ticket, Bot, MoreVertical, ChevronsRight, XCircle } from "lucide-react";
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
import {
  fetchCustomersByBusiness,
  fetchMessagesByCustomer,
  sendHumanMessage,
  resetConversations,
  closeConversation,
} from "@/features/chatInbox/chatInboxSlice";
import { fetchAgentsWithStatus } from "@/features/humanAgent/humanAgentSlice";
import { fetchChannels } from "@/features/channel/channelSlice";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getSocket } from "../lib/useSocket"; 

dayjs.extend(isToday);
dayjs.extend(isYesterday);
dayjs.extend(relativeTime);

const SystemMessage = ({ text }: { text: string }) => ( <div className="flex items-center justify-center my-4"><div className="text-center text-xs text-muted-foreground px-4 py-1 bg-muted rounded-full">{text}</div></div> );
const useDebounce = (value: string, delay: number) => { const [debouncedValue, setDebouncedValue] = useState(value); useEffect(() => { const handler = setTimeout(() => { setDebouncedValue(value); }, delay); return () => { clearTimeout(handler); }; }, [value, delay]); return debouncedValue; };

export default function ChatInbox() {
  const dispatch = useDispatch<AppDispatch>();
  const { t, i18n } = useTranslation();
  
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeFilter, setActiveFilter] = useState<'open' | 'closed'>('open');
  const [isTyping] = useState<{ [key: string]: boolean }>({});

  const messageListRef = useRef<HTMLDivElement | null>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const [isInitialMessageLoad, setIsInitialMessageLoad] = useState(true);

  const { user }: any = useSelector((state: RootState) => state.auth);
  const { channels } = useSelector((state: RootState) => state.channel);
  const { agents } = useSelector((state: RootState) => state.humanAgent);
  const { conversations, status: chatListStatus, currentPage, totalPages } = useSelector((state: RootState) => state.chatInbox);
  const messagesData = useSelector((state: RootState) => selectedCustomer ? state.chatInbox.chatData[selectedCustomer] : null);

  const businessId = user?.businessId;
  const debouncedSearchQuery = useDebounce(searchInput, 500);
  
  const currentConversation = useMemo(() => conversations.find((c) => c.customer.id === selectedCustomer), [conversations, selectedCustomer]);
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

  useEffect(() => { if (businessId) { dispatch(resetConversations()); dispatch(fetchCustomersByBusiness({ businessId, page: 1, searchQuery: debouncedSearchQuery, status: activeFilter })); } }, [businessId, dispatch, debouncedSearchQuery, activeFilter]);
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

  const handleSendMessage = useCallback(() => {
    const socket = getSocket();
    if (!newMessage.trim() || !selectedCustomer || !businessId || !socket) return;
    dispatch(sendHumanMessage({ businessId, customerId: selectedCustomer, message: newMessage.trim(), senderSocketId: socket.id ?? "" }))
      .unwrap().catch(error => toast.error(error.message || t('chatInbox.toastMessageFailed')));
    setNewMessage("");
  }, [newMessage, selectedCustomer, businessId, dispatch, t]);

  const handleTransfer = async (target: { type: 'agent' | 'channel', id: string }) => {
    if (!currentConversation?.id) { toast.error(t('chatInbox.toastTransferNoId')); return; }
    const payload = target.type === 'agent' ? { targetAgentId: target.id } : { targetChannelId: target.id };
    const promise = api.post(`/api/v1/conversations/${currentConversation.id}/transfer`, payload);
    toast.promise(promise, { loading: t('chatInbox.toastTransferLoading'), success: t('chatInbox.toastTransferSuccess'), error: (err: any) => err.response?.data?.message || t('chatInbox.toastTransferFailed') });
  };

  const handleCloseConversation = () => { if (currentConversation?.id && businessId) { dispatch(closeConversation({ conversationId: currentConversation.id, businessId })).unwrap().then(() => { toast.success(t('chatInbox.toastCloseSuccess')); setSelectedCustomer(null); }).catch(err => toast.error(err || t('chatInbox.toastCloseFailed'))); } };
  const handleNextPage = () => { if (currentPage < totalPages && businessId) dispatch(fetchCustomersByBusiness({ businessId, page: currentPage + 1, searchQuery: debouncedSearchQuery, status: activeFilter })); };
  const handlePrevPage = () => { if (currentPage > 1 && businessId) dispatch(fetchCustomersByBusiness({ businessId, page: currentPage - 1, searchQuery: debouncedSearchQuery, status: activeFilter })); };
  const handleLoadMoreMessages = () => { if (selectedCustomer && messagesData?.hasMore && messagesData.status !== 'loading' && messageListRef.current) { prevScrollHeightRef.current = messageListRef.current.scrollHeight; dispatch(fetchMessagesByCustomer({ customerId: selectedCustomer, page: messagesData.currentPage + 1 })); } };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] h-screen w-full gap-6 p-6">
        <aside className="flex flex-col border bg-card p-4 rounded-xl max-h-screen">
          <h1 className="text-2xl font-bold mb-4 px-2">{t('chatInbox.title')}</h1>
          <div className="flex items-center gap-2 p-2 border-b">
            <Button variant={activeFilter === 'open' ? 'default' : 'ghost'} className="flex-1 h-8" onClick={() => setActiveFilter('open')}>{t('chatInbox.filterOpen')}</Button>
            <Button variant={activeFilter === 'closed' ? 'default' : 'ghost'} className="flex-1 h-8" onClick={() => setActiveFilter('closed')}>{t('chatInbox.filterClosed')}</Button>
          </div>
          <div className="px-2 my-4">
            <Input placeholder={t('chatInbox.searchPlaceholder')} className="bg-muted border-none" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide pr-2">
            {chatListStatus === 'loading' && conversations.length === 0 ? (
              <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : conversations.length > 0 ? (
              conversations.map((convo) => (
                <div key={convo.id} onClick={() => setSelectedCustomer(convo.customer.id)} className={cn("flex items-center gap-4 p-3 rounded-lg cursor-pointer", selectedCustomer === convo.customer.id ? "bg-primary/10" : "hover:bg-muted/50")}>
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center font-bold text-primary shrink-0">{convo.customer.name?.charAt(0).toUpperCase()}</div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center"><p className="font-semibold truncate">{convo.customer.name}</p><p className="text-xs text-muted-foreground shrink-0 ml-2">{dayjs(convo.latestMessageTimestamp).format("h:mm A")}</p></div>
                    <div className="flex justify-between items-center mt-0.5">
                      <p className="text-sm text-muted-foreground truncate">{isTyping[convo.customer.id] ? <span className="text-primary italic">{t('chatInbox.typing')}</span> : convo.preview}</p>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {convo.status === 'live' && <Tooltip><TooltipTrigger><User className="h-3 w-3 text-green-500" /></TooltipTrigger><TooltipContent><p>{t('chatInbox.tooltipAssignedTo', { agentName: agents.find(a => a._id === convo.assignedAgentId)?.name || t('chatInbox.anAgent') })}</p></TooltipContent></Tooltip>}
                        {convo.status === 'ticket' && <Tooltip><TooltipTrigger><Ticket className="h-3 w-3 text-orange-500" /></TooltipTrigger><TooltipContent><p>{t('chatInbox.tooltipTicketCreated')}</p></TooltipContent></Tooltip>}
                        {convo.status === 'ai_only' && <Tooltip><TooltipTrigger><Bot className="h-3 w-3 text-blue-500" /></TooltipTrigger><TooltipContent><p>{t('chatInbox.tooltipHandledByAI')}</p></TooltipContent></Tooltip>}
                      </div>
                    </div>
                  </div>
                </div>
              ))
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

        <main className="flex flex-col bg-card border rounded-xl max-h-screen">
          {!selectedCustomer ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><MessageSquareText className="h-16 w-16 mb-4" /><h2 className="text-xl font-medium">{t('chatInbox.mainEmptyTitle')}</h2><p>{t('chatInbox.mainEmptySubtitle')}</p></div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-semibold">{currentConversation?.customer?.name}</h2>
                <div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t('chatInbox.transferTitle')}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
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
                  <Tooltip><TooltipTrigger asChild><Button className="cursor-pointer" variant="ghost" size="icon" onClick={handleCloseConversation}><XCircle className="h-5 w-5 text-red-500" /></Button></TooltipTrigger><TooltipContent><p>{t('chatInbox.closeConversationTooltip')}</p></TooltipContent></Tooltip>
                </div>
              </div>
              <div ref={messageListRef} className="flex-1 p-6 space-y-2 overflow-y-auto scrollbar-hide">
                <div className="text-center">
                  {messagesData?.status === 'loading' && <Loader2 className="h-5 w-5 animate-spin mx-auto my-4" />}
                  {messagesData?.hasMore && messagesData.status !== 'loading' && (<Button variant="link" onClick={handleLoadMoreMessages}>{t('chatInbox.loadMoreMessages')}</Button>)}
                </div>
                {Object.entries(groupedMessages).map(([date, group]) => (
                  <div key={date}><div className="text-center text-xs text-muted-foreground my-4">{date}</div>{group?.map((msg: any, i) => { if (msg.sentBy === 'system') return <SystemMessage key={i} text={msg.text} />; const isAgentSide = ["agent", "human"].includes(msg.sentBy); return (<div key={i} className={cn("flex flex-col my-4", isAgentSide ? "items-end" : "items-start", msg.status === 'failed' && 'opacity-50')}><div className={cn("max-w-[65%] p-3 rounded-2xl text-sm leading-snug", isAgentSide ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted text-muted-foreground rounded-bl-none")}>{msg.text}</div><p className="text-xs text-muted-foreground mt-1.5 px-1">{dayjs(msg.time).format("h:mm A")}</p></div>); })}</div>
                ))}
              </div>
              <div className="p-6 border-t">
                <div className="relative">
                  <Textarea placeholder={t('chatInbox.messagePlaceholder')} value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} className="w-full resize-none p-4 pr-14 rounded-lg bg-muted border-none focus-visible:ring-2 focus-visible:ring-primary" rows={1} />
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