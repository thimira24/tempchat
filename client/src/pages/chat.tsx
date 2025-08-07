import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/hooks/use-socket";
import { 
  ArrowLeft, 
  Share2, 
  Trash2, 
  Send, 
  Smile,
  Copy,
  Users
} from "lucide-react";
import type { ClientMessage } from "@shared/schema";
import DestroyModal from "@/components/destroy-modal";

interface TypingUser {
  userId: string;
  nickname: string;
}

export default function Chat() {
  const [, params] = useRoute("/chat/:roomId");
  const [, setLocation] = useLocation();
  const roomId = params?.roomId;
  
  const [message, setMessage] = useState("");
  const [showDestroyModal, setShowDestroyModal] = useState(false);
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Avatar color generator based on user nickname
  const getAvatarColor = (nickname: string) => {
    const colors = [
      'bg-gradient-to-br from-purple-400 to-purple-600',
      'bg-gradient-to-br from-blue-400 to-blue-600',
      'bg-gradient-to-br from-green-400 to-green-600',
      'bg-gradient-to-br from-red-400 to-red-600',
      'bg-gradient-to-br from-yellow-400 to-yellow-600',
      'bg-gradient-to-br from-pink-400 to-pink-600',
      'bg-gradient-to-br from-indigo-400 to-indigo-600',
      'bg-gradient-to-br from-orange-400 to-orange-600',
      'bg-gradient-to-br from-teal-400 to-teal-600',
      'bg-gradient-to-br from-cyan-400 to-cyan-600'
    ];
    
    let hash = 0;
    for (let i = 0; i < nickname.length; i++) {
      hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };
  
  // Sound functions
  const playSendSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmHbDTtxve+wYhYVk9nyw3kpBSd+zPDajzwIDWWz6NugRAoIj9nyxnkpBSd+zPDajzwIDWWz6NugRAoIj9nyxnkpBSd+zPDajzwIDWWz6NugRAoIj9nyxnkpBSd+zPDajzwIDWWz6NugRAoIj9nyxnkpBSd+zPDajzwIDWWz6NugRAoIj9nyxnkpBSd+zPDajzwIDWWz6NugRAoIj9nyxnkpBSd+zPDajzwIDWWz6NugRAoIj9nyxnkpBSd+zPDajzwIDWWz6NugRAoIj9nyxnkpBSd+zPDajzwIDWWz6NugRAoIj9nyxnkpBSd+zPDajzwIDWWz6NugRAoIj9nyxnkpBSd+zPDajzwIDWWz6NugRAoIj9nyxnkpBSd+zPDajzwIDWWz6NugRAoIj9nyxnkpBSd+zPDajzwIDWWz6NugRAoIj9nyxnkpBSd+zPDajzwIDWWz6NugRAoIj9nyxnkpBSd+zPDajzwIDWWz6NugRAoIj9nyxnkpBSd+zPDajzwIDWWz6NugRAoI');
      audio.volume = 0.3;
      audio.play().catch(() => {}); // Ignore errors if sound can't play
    } catch (e) {}
  };

  const playReceiveSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRlIJAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YS4JAACqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
      audio.volume = 0.2;
      audio.play().catch(() => {}); // Ignore errors if sound can't play
    } catch (e) {}
  };

  // Get nickname from URL params
  const searchParams = new URLSearchParams(window.location.search);
  const nickname = searchParams.get('nickname') || 'Anonymous';
  const currentUserId = useRef(Math.random().toString(36).substr(2, 9));

  // Socket connection
  const { socket, isConnected, safeSend } = useSocket();

  // Fetch room data
  const { data: roomData, isLoading } = useQuery({
    queryKey: ['/api/rooms', roomId],
    enabled: !!roomId,
  });

  // Handle room data
  useEffect(() => {
    if (roomData && typeof roomData === 'object' && 'messages' in roomData) {
      const data = roomData as { messages: any[] };
      setMessages(data.messages.map((msg: any) => ({
        ...msg,
        isOwn: msg.senderId === currentUserId.current,
        timestamp: new Date(msg.timestamp)
      })));
    }
  }, [roomData]);

  // Handle error states
  useEffect(() => {
    if (roomData === null) {
      toast({
        title: "Error",
        description: "Room not found",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [roomData, toast, setLocation]);

  // Destroy room mutation
  const destroyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/rooms/${roomId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Chat room destroyed",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to destroy room",
        variant: "destructive",
      });
    }
  });

  // Socket event handlers
  useEffect(() => {
    if (!socket || !roomId || !isConnected) return;

    const handleMessage = (event: MessageEvent) => {
      const response = JSON.parse(event.data);
      
      switch (response.type) {
        case 'room_joined':
          setMessages(response.data.messages.map((msg: any) => ({
            ...msg,
            isOwn: msg.senderId === currentUserId.current,
            timestamp: new Date(msg.timestamp)
          })));
          break;
          
        case 'new_message':
          const newMessage = {
            ...response.data,
            isOwn: response.data.senderId === currentUserId.current,
            timestamp: new Date(response.data.timestamp)
          };
          setMessages(prev => [...prev, newMessage]);
          
          // Play sound for received messages (not own messages)
          if (!newMessage.isOwn) {
            playReceiveSound();
          }
          break;
          
        case 'participant_update':
          const prevParticipantCount = participants.length;
          const newParticipants = response.data.participants;
          setParticipants(newParticipants);
          
          // Show join notification if someone new joined
          if (newParticipants.length > prevParticipantCount) {
            const newParticipant = newParticipants[newParticipants.length - 1];
            if (newParticipant.nickname !== nickname) {
              // Add system message for join
              const joinMessage = {
                id: `system-${Date.now()}`,
                content: `${newParticipant.nickname} joined the chat`,
                senderNickname: 'System',
                timestamp: new Date(),
                isOwn: false,
                isSystem: true
              };
              setMessages(prev => [...prev, joinMessage]);
            }
          }
          break;
          
        case 'typing_update':
          const { userId, nickname: typingNickname, isTyping } = response.data;
          setTypingUsers(prev => {
            const filtered = prev.filter(u => u.userId !== userId);
            if (isTyping) {
              return [...filtered, { userId, nickname: typingNickname }];
            }
            return filtered;
          });
          break;
          
        case 'room_destroyed':
          toast({
            title: "Room Destroyed",
            description: "This chat room has been destroyed by another user",
          });
          setLocation("/");
          break;
          
        case 'error':
          toast({
            title: "Error",
            description: response.error,
            variant: "destructive",
          });
          break;
      }
    };

    socket.addEventListener('message', handleMessage);

    // Join room when connected
    safeSend(JSON.stringify({
      type: 'join_room',
      roomId,
      nickname
    }));

    return () => {
      socket.removeEventListener('message', handleMessage);
      // Leave room
      safeSend(JSON.stringify({
        type: 'leave_room',
        roomId
      }));
    };
  }, [socket, roomId, nickname, isConnected, safeSend, toast, setLocation]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle textarea auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + 'px';
    }
  }, [message]);

  const handleSendMessage = () => {
    if (!isConnected || !message.trim()) return;

    safeSend(JSON.stringify({
      type: 'send_message',
      message: message.trim()
    }));

    // Play send sound
    playSendSound();

    setMessage("");
    
    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    safeSend(JSON.stringify({
      type: 'typing_stop'
    }));
  };

  const handleTyping = () => {
    if (!isConnected) return;

    // Send typing start
    safeSend(JSON.stringify({
      type: 'typing_start'
    }));

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      safeSend(JSON.stringify({
        type: 'typing_stop'
      }));
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyRoomLink = () => {
    const url = `${window.location.origin}/chat/${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Success",
        description: "Room link copied to clipboard!",
      });
    }).catch(() => {
      toast({
        title: "Error", 
        description: "Failed to copy link",
        variant: "destructive",
      });
    });
  };

  const handleDestroy = () => {
    setShowDestroyModal(true);
  };

  const confirmDestroy = () => {
    destroyMutation.mutate();
    setShowDestroyModal(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#1976D2] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-[#757575]">Loading chat room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background font-[Inter]">
      {/* Chat Header */}
      <header className="bg-card shadow-sm border-b border-border px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="mr-3 p-2 -ml-2 rounded-lg hover:bg-muted min-h-[44px] min-w-[44px]"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Button>
            
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-foreground truncate">
                Chat Room
              </h1>
              <p className="text-xs text-muted-foreground flex items-center">
                <Users className="w-3 h-3 mr-1" />
                {participants.length} participants
                {isConnected && (
                  <>
                    <span className="mx-1">•</span>
                    <span className="inline-flex items-center">
                      <span className="w-2 h-2 bg-[#4CAF50] rounded-full mr-1"></span>
                      Active
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Copy Link Button */}
            <Button
              variant="ghost"
              size="sm"
              className="p-2 rounded-lg hover:bg-muted min-h-[44px] min-w-[44px]"
              onClick={copyRoomLink}
            >
              <Share2 className="w-5 h-5 text-muted-foreground" />
            </Button>
            
            {/* Destroy Chat Button */}
            <Button
              variant="ghost"
              size="sm"
              className="p-2 rounded-lg hover:bg-destructive/10 min-h-[44px] min-w-[44px]"
              onClick={handleDestroy}
            >
              <Trash2 className="w-5 h-5 text-destructive" />
            </Button>
          </div>
        </div>
      </header>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* System Message */}
          <div className="text-center">
            <Badge variant="secondary" className="bg-muted text-muted-foreground">
              Room created • Code: {roomId}
            </Badge>
          </div>

          {/* Messages */}
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex items-start gap-3 ${msg.isOwn ? 'justify-end' : ''} animate-in fade-in slide-in-from-bottom-2 duration-200`}
            >
              {(msg as any).isSystem ? (
                <div className="flex-1 text-center">
                  <Badge variant="secondary" className="bg-muted/50 text-muted-foreground text-xs">
                    {msg.content}
                  </Badge>
                </div>
              ) : msg.isOwn ? (
                <>
                  <div className="flex-1 min-w-0 flex flex-col items-end">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-sm font-medium text-foreground">You</span>
                    </div>
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-3 max-w-xs shadow-sm">
                      <p>{msg.content}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-xs opacity-70">✓</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground text-sm font-medium">
                      {nickname.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className={`w-8 h-8 ${getAvatarColor(msg.senderNickname)} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white text-sm font-medium">
                      {msg.senderNickname.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">{msg.senderNickname}</span>
                      <span className="text-xs text-muted-foreground">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="bg-card border border-border text-card-foreground rounded-2xl rounded-tl-md px-4 py-3 max-w-xs shadow-sm">
                      <p>{msg.content}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="flex items-start gap-3 animate-in fade-in duration-200">
              <div className={`w-8 h-8 ${getAvatarColor(typingUsers[0].nickname)} rounded-full flex items-center justify-center flex-shrink-0`}>
                <span className="text-white text-sm font-medium">
                  {typingUsers[0].nickname.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{typingUsers[0].nickname}</span>
                  <span className="text-xs text-muted-foreground">typing...</span>
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3 max-w-xs">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="border-t border-border bg-card px-4 py-3 sticky bottom-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  handleTyping();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                rows={1}
                className="w-full px-4 py-3 pr-12 border border-border bg-input text-foreground rounded-2xl focus:ring-2 focus:ring-ring focus:border-transparent resize-none min-h-[48px] max-h-32 placeholder:text-muted-foreground"
              />
              
              {/* Emoji Button (Optional) */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-3 bottom-3 p-1 rounded-full hover:bg-muted text-muted-foreground"
              >
                <Smile className="w-5 h-5" />
              </Button>
            </div>
            
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || !isConnected}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-3 min-h-[48px] min-w-[48px] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <DestroyModal
        isOpen={showDestroyModal}
        onConfirm={confirmDestroy}
        onClose={() => setShowDestroyModal(false)}
        isLoading={destroyMutation.isPending}
      />
    </div>
  );
}
