import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageSquareText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { socket } from "@/lib/useSocket";
import { useDispatch, useSelector } from "react-redux";
import { debounce } from "lodash";
import {
  fetchCustomersByBusiness,
  fetchMessagesByCustomer,
  addRealtimeMessage,
  addNewCustomer,
} from "@/features/chatInbox/chatInboxSlice";
import dayjs from "dayjs";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";
import { AppDispatch, RootState } from "@/app/store";
import toast from 'react-hot-toast';
import NotificationToast from "@/components/custom/Notification/NotificationToast";

dayjs.extend(isToday);
dayjs.extend(isYesterday);

const TYPING_EMIT_DELAY = 500;

export default function ChatInbox() {
  const dispatch = useDispatch<AppDispatch>();
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [unread, setUnread] = useState<{ [key: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState<{ [key: string]: boolean }>({});

  const messageListRef = useRef<HTMLDivElement | null>(null);
  const notificationRef = useRef<HTMLAudioElement | null>(null);

  const { user } = useSelector((state: RootState) => state.auth);
  const businessId = user?.businessId;
  const { customers, chatData, status: chatStatus } = useSelector((state: RootState) => state.chatInbox);
  
  const [isFetchingOldMessages, setIsFetchingOldMessages] = useState(false);

  // --- All useEffect and handler hooks are unchanged from the previous correct version ---
  // ... (No changes needed in the logic section)
  useEffect(() => {
    notificationRef.current = new Audio("/sounds/notification.mp3");
    const unlockAudio = () => {
      notificationRef.current?.play().catch(() => {});
      notificationRef.current?.pause();
      notificationRef.current!.currentTime = 0;
      window.removeEventListener("click", unlockAudio);
    };
    window.addEventListener("click", unlockAudio);
  }, []);

  useEffect(() => {
    if (businessId) {
      dispatch(fetchCustomersByBusiness({ businessId, page: 1, searchQuery }));
      socket.emit("joinBusiness", businessId);
    }
  }, [businessId, searchQuery, dispatch]);
  
  const selectedCustomerRef = useRef(selectedCustomer);
  useEffect(() => {
    selectedCustomerRef.current = selectedCustomer;
  }, [selectedCustomer]);

  useEffect(() => {
    const handleNewMessage = (data: any) => {
      const { customerId, sender, message, name } = data;
      const id = customerId?.toString();
      if (!id) return;
      setIsTyping(prev => ({...prev, [id]: false}));
      if (sender === 'user') {
        toast.custom((t) => <NotificationToast t={t} name={name|| "A customer"} msg={message} />)
        notificationRef.current?.play().catch(err => console.warn("Audio playback failed:", err));
      }
      const exists = customers.some((c: any) => c.id === id);
      if (!exists && sender === 'user') {
        dispatch(addNewCustomer({ id, name: name|| "Unknown", preview: message, latestMessageTimestamp: new Date().toISOString() }));
      }
      dispatch(addRealtimeMessage({
        customerId: id,
        message: { text: message, sentBy: sender, time: new Date().toISOString() },
      }));
      if (id !== selectedCustomerRef.current) {
        setUnread((prev) => ({ ...prev, [id]: true }));
      }
    };
    const handleTyping = ({ customerId }: { customerId: string }) => {
        setIsTyping(prev => ({...prev, [customerId]: true}));
        setTimeout(() => { setIsTyping(prev => ({...prev, [customerId]: false})); }, 3000);
    };
    socket.on("newMessage", handleNewMessage);
    socket.on("typing", handleTyping);
    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("typing", handleTyping);
    };
  }, [dispatch, customers]);

  useEffect(() => {
    if (selectedCustomer) {
      setIsFetchingOldMessages(true);
      dispatch(fetchMessagesByCustomer({ customerId: selectedCustomer, page: 1 }))
        .finally(() => setIsFetchingOldMessages(false));
      setUnread((prev) => ({ ...prev, [selectedCustomer]: false }));
    }
  }, [selectedCustomer, dispatch]);

  useEffect(() => {
    if (messageListRef.current) {
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [chatData[selectedCustomer || '']?.length, selectedCustomer]);

  const emitTyping = useCallback(debounce((customerId: string, businessId: string) => {
    socket.emit("typing", { customerId, businessId, source: "human" });
  }, TYPING_EMIT_DELAY), []);

  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !selectedCustomer || !businessId) return;
    dispatch(addRealtimeMessage({
        customerId: selectedCustomer,
        message: { text: newMessage.trim(), sentBy: "human", time: new Date().toISOString() }
    }));
    socket.emit("humanMessage", {
      sender: "human",
      customerId: selectedCustomer,
      businessId,
      message: newMessage.trim(),
    });
    setNewMessage("");
  }, [newMessage, selectedCustomer, businessId, dispatch]);

  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => dayjs(b.latestMessageTimestamp || 0).valueOf() - dayjs(a.latestMessageTimestamp || 0).valueOf());
  }, [customers]);

  const allMessages = useMemo(() => (selectedCustomer ? [...(chatData[selectedCustomer] || [])] : []), [selectedCustomer, chatData]);
  
  const groupedMessages = useMemo(() => {
    return allMessages.reduce((acc: any, msg: any) => {
      const dateLabel = dayjs(msg.time).isToday() ? "Today" : dayjs(msg.time).isYesterday() ? "Yesterday" : dayjs(msg.time).format("MMMM D, YYYY");
      if (!acc[dateLabel]) acc[dateLabel] = [];
      acc[dateLabel].push(msg);
      return acc;
    }, {});
  }, [allMessages]);


  return (
    // --- UI CHANGE: Increased overall padding for a more spacious feel ---
    <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] h-screen w-full gap-6 p-6 ">
      {/* Customer List Panel */}
      <aside className="flex flex-col border bg-white dark:bg-[#1B1B20] p-4 rounded-xl max-h-screen">
        <h1 className="text-2xl font-bold mb-4 px-2">Inbox</h1>
        <div className="px-2 mb-4">
            <Input
              placeholder="Search conversations..."
              className="bg-gray-100 dark:bg-gray-800 border-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide pr-2">
          {chatStatus === 'loading' && customers.length === 0 ? (
            <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : (
            sortedCustomers.map((customer: any) => (
              <div
                key={customer.id}
                onClick={() => setSelectedCustomer(customer.id)}
                className={cn("flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors duration-200", selectedCustomer === customer.id ? "bg-violet-100 dark:bg-[#daa2c6]" : "hover:bg-gray-100 dark:hover:bg-gray-900")}
              >
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center font-bold text-[#ff21b0] shrink-0">
                  {customer.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold truncate">{customer.name}</p>
                    <p className="text-xs text-gray-500 shrink-0 ml-2">{dayjs(customer.latestMessageTimestamp).format("h:mm A")}</p>
                  </div>
                  <div className="flex justify-between items-center mt-0.5">
                    <p className="text-sm text-gray-500 truncate">{isTyping[customer.id] ? <span className="text-[#ff21b0] italic">Typing...</span> : customer.preview}</p>
                    {unread[customer.id] && <div className="w-2.5 h-2.5 bg-[#ff21b0] rounded-full shrink-0 ml-2" />}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Message View Panel */}
      <main className="flex flex-col bg-white dark:bg-[#1B1B20] border rounded-xl max-h-screen">
        {!selectedCustomer ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
            <MessageSquareText className="h-16 w-16 mb-4" />
            <h2 className="text-xl font-medium">Select a conversation</h2>
            <p>Choose a customer from the left to view messages.</p>
          </div>
        ) : (
          <>
            {/* --- UI CHANGE: Increased padding and message gap --- */}
            <div ref={messageListRef} className="flex-1 p-6 space-y-2 overflow-y-auto scrollbar-hide">
              {isFetchingOldMessages && <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>}
              {Object.entries(groupedMessages).map(([date, group]: any) => (
                <div key={date}>
                  <div className="text-center text-xs text-gray-400 my-4">{date}</div>
                  {group?.map((msg: any, i: any) => {
                    const isAgentSide = ["agent", "bot", "human"].includes(msg.sentBy);

                    return (
                        // --- UI CHANGE: Increased vertical margin for more space between messages ---
                      <div key={i} className={cn("flex flex-col my-4", isAgentSide ? "items-end" : "items-start")}>
                        <div
                          className={cn(
                            // --- UI CHANGE: Adjusted max-width for better proportions ---
                            "max-w-[65%] p-3 rounded-2xl text-sm leading-snug",
                            isAgentSide
                              ? "bg-[#ff21b0] text-white rounded-br-none"
                              : "bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none"
                          )}
                        >
                          {msg.text}
                        </div>
                        {/* --- UI CHANGE: Added timestamp below each message --- */}
                        <p className="text-xs text-gray-400 mt-1.5 px-1">
                          {dayjs(msg.time).format("h:mm A")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ))}
              {isTyping[selectedCustomer] && (
                 <div className="flex flex-col items-start my-4">
                     <div className="bg-gray-200 dark:bg-gray-800 text-gray-500 text-sm italic p-3 rounded-2xl rounded-bl-none">
                         Typing...
                     </div>
                 </div> 
              )}
            </div>
            {/* --- UI CHANGE: Increased padding in the input area --- */}
            <div className="p-6 border-t dark:border-gray-800">
              <div className="relative">
                <Textarea
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    if (selectedCustomer && businessId) {
                      emitTyping(selectedCustomer, businessId);
                    }
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  className="w-full resize-none p-4 pr-14 rounded-lg bg-gray-100 dark:bg-gray-800 border-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  rows={1}
                />
                <Button onClick={handleSendMessage} size="icon" className="absolute right-3 bottom-2.5 h-9 w-9 bg-[#ff21b0] cursor-pointer hover:bg-[#ff21b0]">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}