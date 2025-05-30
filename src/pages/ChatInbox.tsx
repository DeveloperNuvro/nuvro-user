
import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { cn } from "@/lib/utils";
import { Send } from "lucide-react";
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
import { AppDispatch } from "@/app/store";
import toast from 'react-hot-toast';
import NotificationToast from "@/components/custom/Notification/NotificationToast";



dayjs.extend(isToday);
dayjs.extend(isYesterday);

const TYPING_EMIT_DELAY = 500;

export default function ChatInbox() {
  const dispatch = useDispatch<AppDispatch>();
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [customerPage, setCustomerPage] = useState(1);
  const [messagePage, setMessagePage] = useState(1);
  const [typing, setTyping] = useState<{ [key: string]: boolean }>({});
  const [unread, setUnread] = useState<{ [key: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState("");

  const customerScrollRef = useRef<HTMLDivElement | null>(null);
  const messageScrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const notificationRef = useRef<HTMLAudioElement | null>(new Audio("/sounds/notification.mp3"));

  const { user } = useSelector((state: any) => state.auth);
  const businessId = user?.businessId;
  const { customers, chatData } = useSelector((state: any) => state.chatInbox);

  const selectedCustomerRef = useRef<string | null>(null);


  useEffect(() => {
    selectedCustomerRef.current = selectedCustomer;
  }, [selectedCustomer]);


  useEffect(() => {
    const unlockAudio = () => {
      if (notificationRef.current) {
        notificationRef.current.volume = 1.0;
        notificationRef.current.play().catch(() => { });
        notificationRef.current.pause();
        notificationRef.current.currentTime = 0;
      }
      window.removeEventListener("click", unlockAudio);
    };

    window.addEventListener("click", unlockAudio);
  }, []);

  useEffect(() => {
    if (businessId) {
      setCustomerPage(1);
      dispatch(fetchCustomersByBusiness({ businessId, page: 1, searchQuery }));
      socket.emit("joinBusiness", businessId);

      setTimeout(() => {
        console.log("Agent socket ID after join:", socket.id);
      }, 1000);
    }
  }, [businessId, searchQuery]);

  const handleScrollCustomers = () => {
    if (
      customerScrollRef.current &&
      customerScrollRef.current.scrollTop + customerScrollRef.current.clientHeight >=
      customerScrollRef.current.scrollHeight - 10
    ) {
      const nextPage = customerPage + 1;
      setCustomerPage(nextPage);
      dispatch(fetchCustomersByBusiness({ businessId, page: nextPage, searchQuery }));
    }
  };

  useEffect(() => {
    socket.on("humanCustomerWaiting", (data) => {
      const { customerId, name, message } = data;

      const id = customerId?.toString();
      if (!id) return;

      toast.custom((t) => <NotificationToast t={t} name={name} msg={message} />)

      if (notificationRef.current) {
        notificationRef.current.currentTime = 0;
        notificationRef.current
          .play()
          .then(() => console.log("✅ Sound played"))
          .catch((err) => console.warn("❌ Sound playback blocked:", err));
      }


      dispatch(addNewCustomer({ id, name, email: "", phone: "", preview: message }));
      dispatch(addRealtimeMessage({
        customerId: id,
        message: {
          from: name,
          time: new Date().toISOString(),
          text: message,
          sentBy: "user",
        },
      }));

      // ✅ Use ref for accurate comparison
      if (id !== selectedCustomerRef.current) {
        setUnread((prev) => ({ ...prev, [id]: true }));
      }


    });

    socket.on("newMessage", (data) => {
      const { customerId, sender, message, customerName } = data;

      const id = customerId?.toString();
      if (!id) return;

      setTyping((prev) => ({ ...prev, [id]: false }));

      const exists = customers.some((c: any) => c.id === id);
      if (!exists) {
        dispatch(addNewCustomer({
          id,
          name: customerName || "Unknown",
          email: "",
          phone: "",
        }));
      }

      dispatch(addRealtimeMessage({
        customerId: id,
        message: {
          from: sender === "agent" ? "You" : sender === "human" ? "Human" : "Customer",
          time: new Date().toISOString(),
          text: message,
          sentBy: sender === "agent" ? "bot" : sender,
        },
      }));

      // ✅ Use ref for accurate comparison
      if (id !== selectedCustomerRef.current) {
        setUnread((prev) => ({ ...prev, [id]: true }));
      }


    });


    socket.on("typing", ({ customerId, source }) => {
      console.log("Typing event received for:", customerId);
      if (source !== "customer") return;
      setTyping((prev) => ({ ...prev, [customerId]: true }));
      setTimeout(() => {
        setTyping((prev) => ({ ...prev, [customerId]: false }));
      }, 3000);
    });

    return () => {
      socket.off("humanCustomerWaiting");
      socket.off("newMessage");
      socket.off("typing");
    };
  }, [dispatch, selectedCustomer]);

  useEffect(() => {
    if (selectedCustomer) {
      setMessagePage(1);
      dispatch(fetchMessagesByCustomer({ customerId: selectedCustomer, page: 1 }));
      setUnread((prev) => ({ ...prev, [selectedCustomer]: false }));
    }
  }, [selectedCustomer, dispatch]);

  const handleScrollMessages = () => {
    if (messageScrollRef.current && messageScrollRef.current.scrollTop < 50) {
      const nextPage = messagePage + 1;
      setMessagePage(nextPage);
      dispatch(fetchMessagesByCustomer({ customerId: selectedCustomer!, page: nextPage }));
    }
  };

  useEffect(() => {
    if (messageScrollRef.current) {
      messageScrollRef.current.scrollTo({ top: messageScrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [chatData, selectedCustomer]);

  const emitTyping = debounce((customerId: string, businessId: string) => {
    socket.emit("typing", { customerId, businessId, source: "humanAgent" });
  }, TYPING_EMIT_DELAY);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedCustomer || !businessId) return;
    socket.emit("userMessage", {
      sender: "agent",
      customerId: selectedCustomer,
      businessId,
      message: newMessage.trim(),
    });
    setNewMessage("");
    inputRef.current?.focus();
  };

  const allMessages = selectedCustomer
    ? [...(chatData[selectedCustomer] || [])].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
    : [];

  const groupMessagesByDate = (messages: any[]) => {
    return messages.reduce((acc: any, msg: any) => {
      if (!msg.time || !dayjs(msg.time).isValid()) return acc;
      const dateLabel = dayjs(msg.time).isToday()
        ? "Today"
        : dayjs(msg.time).isYesterday()
          ? "Yesterday"
          : dayjs(msg.time).format("MMMM D, YYYY");
      if (!acc[dateLabel]) acc[dateLabel] = [];
      acc[dateLabel].push(msg);
      return acc;
    }, {});
  };

  const groupedMessages = groupMessagesByDate(allMessages);

  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) =>
      new Date(b.latestMessageTimestamp || 0).getTime() -
      new Date(a.latestMessageTimestamp || 0).getTime()
    );
  }, [customers]);



  return (
    <div className="flex flex-col md:flex-row h-screen w-full gap-3 p-2 overflow-x-hidden">


      <aside className="w-full md:w-1/4 border p-4 rounded-[16px] max-h-screen">
        <Tabs defaultValue="chatlog" className="mb-4">
          <TabsList className="grid grid-cols-2 bg-[#FAFAFA] dark:bg-[#2C3139]">
            <TabsTrigger value="chatlog">Chatlog</TabsTrigger>
          </TabsList>
        </Tabs>

        <Input
          placeholder="Search"
          className="mb-4 border-[#D4D8DE]"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div
          ref={customerScrollRef}
          onScroll={handleScrollCustomers}
          className="space-y-3 scrollbar-hide overflow-y-auto h-[200px] md:h-full  max-h-[calc(100vh-250px)] pr-1"
        >
          {sortedCustomers
            .map((customer: any) => (
              <Card
                key={customer.id}
                onClick={() => {
                  setSelectedCustomer(customer.id);
                  setUnread((prev) => ({ ...prev, [customer.id]: false }));
                }}

                className={cn(
                  "cursor-pointer rounded-[8px] p-3",
                  selectedCustomer === customer.id
                    ? "bg-[#EEE5FF] dark:bg-[#101214] border-[1px] dark:border-[#B9B6C1]"
                    : unread[customer.id]
                      ? "bg-[#F4E3FF] dark:bg-[#2E1C4F] border-[1px] border-[#D4D8DE] dark:border-[#A182C1]"
                      : "bg-white border-[#D4D8DE] dark:border-[#2C3139] dark:bg-[#101214] border-[1px]"
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-gray-500">
                      {typing[customer.id] ? "Typing..." : customer.preview}
                    </p>
                  </div>
                  <div className="text-sm text-gray-400 flex items-center gap-2">
                    {unread[customer.id] && (
                      <span className="w-2 h-2 bg-red-500 rounded-full" />
                    )}
                    <span className="text-xs">{dayjs(customer?.latestMessageTimestamp).format("h:mm A")}</span>
                  </div>
                </div>
              </Card>
            ))}
        </div>
      </aside>

      <main className="w-full flex-1 flex flex-col p-2 md:p-4 overflow-hidden border rounded-[16px] max-h-screen">
        <div
          ref={messageScrollRef}
          onScroll={handleScrollMessages}
          className="flex flex-col gap-4 scrollbar-hide  overflow-y-auto flex-1 mt-5 px-1"
        >
          {Object.entries(groupedMessages).map(([date, group]: any) => (
            <div key={date}>
              <p className="text-center text-xs text-muted-foreground my-2">{date}</p>
              {group?.map((msg: any, i: any) => (
                <div
                  key={i}
                  className={cn("max-w-[90%] sm:max-w-full",
                    ["bot", "human"].includes(msg.sentBy) ? "self-end text-right" : "self-start")}
                >
                  <Card className="inline-block">
                    <CardContent
                      className={cn(
                        "px-3 py-2 text-sm text-left border-[1px] max-w-[200px] sm:w-full break-words sm:max-w-[600px] border-[#D4D8DE] rounded-[24px]",
                        ["bot", "human"].includes(msg.sentBy) ? "bg-[#EEE5FF] dark:bg-[#8C52FF] dark:text-white" : ""
                      )}
                    >
                      {msg.text}
                    </CardContent>
                  </Card>
                  <p className="text-[12px] text-[#A3ABB8] mt-1">
                    {dayjs(msg.time).format("h:mm A")} • via Website • {msg.from}
                  </p>
                </div>
              ))}
            </div>
          ))}

          {selectedCustomer && typing[selectedCustomer] && (
            <div className="self-start bg-[#8C52FF] rounded-md text-white text-left text-sm  italic px-3 mt-2">
              Customer is typing...
            </div>
          )}

        </div>

        <div className="mt-4 border-t pt-4">
          <div className="flex flex-col items-stretch sm:items-end gap-2">
            <Textarea
              ref={inputRef}
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                if (selectedCustomer && businessId) {
                  emitTyping(selectedCustomer, businessId);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="w-full resize-none h-auto min-h-[150px] max-h-[200px] overflow-y-auto break-words break-all border-[#D4D8DE] dark:border-[#2C3139] dark:bg-[#101214] focus:outline-none p-4 rounded-[16px]"
              rows={3}
            />

            <Button onClick={handleSendMessage} className="px-4 w-[135px] bg-[#8C52FF] hover:bg-[#8C52FF] text-white cursor-pointer">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>

    </div>
  );
}
