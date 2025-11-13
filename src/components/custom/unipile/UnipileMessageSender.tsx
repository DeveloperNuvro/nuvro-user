import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/app/store";
import { sendManualMessage, fetchUnipileConnections } from "@/features/unipile/unipileSlice";
import toast from "react-hot-toast";
import PlatformBadge from "./PlatformBadge";

interface UnipileMessageSenderProps {
  customerName?: string;
  customerPlatform?: string;
}

const UnipileMessageSender = ({ customerName, customerPlatform }: UnipileMessageSenderProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { connections, status } = useSelector((state: RootState) => state.unipile);
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<string>("");
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<'text' | 'image' | 'video' | 'audio' | 'document'>('text');

  useEffect(() => {
    if (isOpen && connections.length === 0) {
      dispatch(fetchUnipileConnections());
    }
  }, [isOpen, connections.length, dispatch]);

  useEffect(() => {
    if (customerPlatform && connections.length > 0) {
      // Auto-select connection based on customer platform
      const matchingConnection = connections.find(conn => 
        conn.platform === customerPlatform && conn.status === 'active'
      );
      if (matchingConnection) {
        setSelectedConnection(matchingConnection.connectionId);
      }
    }
  }, [customerPlatform, connections]);

  const handleSendMessage = async () => {
    if (!selectedConnection || !recipient || !message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await dispatch(sendManualMessage({
        connectionId: selectedConnection,
        to: recipient,
        content: message.trim(),
        messageType,
      })).unwrap();
      
      toast.success("Message sent successfully!");
      setIsOpen(false);
      setMessage("");
      setRecipient("");
      setSelectedConnection("");
    } catch (error: any) {
      toast.error(error || "Failed to send message");
    }
  };

  const activeConnections = connections.filter(conn => conn.status === 'active');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageSquare className="w-4 h-4 mr-2" />
          Send via Platform
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Message via Platform</DialogTitle>
          <DialogDescription>
            Send a message to {customerName || 'customer'} through one of your connected platforms.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="connection">Platform Connection *</Label>
            <Select value={selectedConnection} onValueChange={setSelectedConnection}>
              <SelectTrigger>
                <SelectValue placeholder="Select a platform connection" />
              </SelectTrigger>
              <SelectContent>
                {activeConnections.map((connection) => (
                  <SelectItem key={connection.connectionId} value={connection.connectionId}>
                    <div className="flex items-center space-x-2">
                      <PlatformBadge platform={connection.platform} />
                      <span>{connection.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="recipient">Recipient *</Label>
            <Input
              id="recipient"
              placeholder={
                selectedConnection 
                  ? connections.find(c => c.connectionId === selectedConnection)?.platform === 'whatsapp'
                    ? "+1234567890"
                    : connections.find(c => c.connectionId === selectedConnection)?.platform === 'email'
                    ? "user@example.com"
                    : connections.find(c => c.connectionId === selectedConnection)?.platform === 'instagram'
                    ? "@username"
                    : "Recipient ID"
                  : "Enter recipient"
              }
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="messageType">Message Type</Label>
            <Select value={messageType} onValueChange={(value: any) => setMessageType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="document">Document</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendMessage} 
            disabled={status === 'loading' || !selectedConnection || !recipient || !message.trim()}
          >
            {status === 'loading' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Send className="w-4 h-4 mr-2" />
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UnipileMessageSender;
