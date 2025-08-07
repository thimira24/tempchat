import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Plus, LogIn, Check } from "lucide-react";
import NicknameModal from "@/components/nickname-modal";

export default function Home() {
  const [, setLocation] = useLocation();
  const [roomId, setRoomId] = useState("");
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
  const { toast } = useToast();

  const createRoomMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/rooms");
      return response.json();
    },
    onSuccess: (data) => {
      setPendingRoomId(data.roomId);
      setShowNicknameModal(true);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create chat room. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateRoom = () => {
    createRoomMutation.mutate();
  };

  const handleJoinRoom = () => {
    if (!roomId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid room code",
        variant: "destructive",
      });
      return;
    }
    
    setPendingRoomId(roomId.toUpperCase().trim());
    setShowNicknameModal(true);
  };

  const handleNicknameConfirmed = (nickname?: string) => {
    if (pendingRoomId) {
      const params = new URLSearchParams();
      if (nickname) {
        params.set('nickname', nickname);
      }
      setLocation(`/chat/${pendingRoomId}?${params.toString()}`);
    }
    setShowNicknameModal(false);
    setPendingRoomId(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-[Inter]">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border px-4 py-3">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">QuickChat</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          {/* Hero Content */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <MessageCircle className="w-10 h-10 text-primary-foreground" />
            </div>
            
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Private Instant Chat
            </h2>
            
            <p className="text-lg text-muted-foreground mb-2">
              No signup, no tracking, no storage
            </p>
            
            <p className="text-sm text-muted-foreground">
              Create temporary chat rooms that disappear after 10 minutes of inactivity
            </p>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            <Badge variant="secondary" className="bg-[#4CAF50]/10 text-[#4CAF50] hover:bg-[#4CAF50]/20">
              <Check className="w-3 h-3 mr-1" />
              No Registration
            </Badge>
            <Badge variant="secondary" className="bg-[#1976D2]/10 text-[#1976D2] hover:bg-[#1976D2]/20">
              <Check className="w-3 h-3 mr-1" />
              Real-time
            </Badge>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-200">
              <Check className="w-3 h-3 mr-1" />
              Private
            </Badge>
          </div>

          {/* Start Chat Button */}
          <Button 
            onClick={handleCreateRoom}
            disabled={createRoomMutation.isPending}
            className="w-full bg-[#1976D2] hover:bg-[#1565C0] text-white font-semibold py-4 px-6 rounded-xl min-h-[44px] mb-4 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5 mr-2" />
            {createRoomMutation.isPending ? "Creating..." : "Start New Chat"}
          </Button>

          {/* Join Room Input */}
          <Card className="bg-card rounded-xl shadow-sm border border-border">
            <CardContent className="p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Join Existing Chat</h3>
              <div className="flex gap-2">
                <Input 
                  type="text" 
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Enter room code..."
                  className="flex-1 px-4 py-3 border border-border bg-input text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleJoinRoom();
                    }
                  }}
                />
                <Button 
                  onClick={handleJoinRoom}
                  className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium py-3 px-4 rounded-lg min-h-[44px]"
                >
                  <LogIn className="w-5 h-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-6 border-t border-border bg-card">
        <div className="max-w-md mx-auto text-center">
          <p className="text-xs text-muted-foreground">
            Messages are stored temporarily in memory only • Auto-deleted after 10 minutes of inactivity
          </p>
        </div>
      </footer>

      <NicknameModal
        isOpen={showNicknameModal}
        onConfirm={handleNicknameConfirmed}
        onClose={() => {
          setShowNicknameModal(false);
          setPendingRoomId(null);
        }}
      />
    </div>
  );
}
