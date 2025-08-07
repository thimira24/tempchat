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
import PasswordModal from "@/components/password-modal";

export default function Home() {
  const [, setLocation] = useLocation();
  const [roomId, setRoomId] = useState("");
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
  const { toast } = useToast();

  const [createPassword, setCreatePassword] = useState("");
  const [currentUserId] = useState(() => Math.random().toString(36).substr(2, 9));

  const createRoomMutation = useMutation({
    mutationFn: async () => {
      if (!createPassword.trim()) {
        throw new Error("Password is required");
      }
      const response = await apiRequest("POST", "/api/rooms", {
        password: createPassword.trim(),
        creatorId: currentUserId
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Room Created",
        description: `Room "${data.roomName}" created successfully!`,
      });
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
    if (!createPassword.trim()) {
      toast({
        title: "Error",
        description: "Please enter a password for the room",
        variant: "destructive",
      });
      return;
    }
    createRoomMutation.mutate();
  };

  const joinRoomMutation = useMutation({
    mutationFn: async ({ roomId, password, nickname }: { roomId: string, password: string, nickname: string }) => {
      const response = await apiRequest("POST", `/api/rooms/${roomId}/join`, {
        password,
        nickname
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Joined Successfully",
        description: `Welcome to ${data.roomName}!`,
      });
      const params = new URLSearchParams();
      if (variables.nickname) {
        params.set('nickname', variables.nickname);
      }
      setLocation(`/chat/${variables.roomId}?${params.toString()}`);
    },
    onError: (error: any) => {
      if (error.message.includes('401')) {
        toast({
          title: "Incorrect Password",
          description: "The password you entered is incorrect. Please try again.",
          variant: "destructive",
        });
      } else if (error.message.includes('404')) {
        toast({
          title: "Room Not Found",
          description: "The room code you entered doesn't exist or has expired.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to join the room. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

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
    setShowPasswordModal(true);
  };

  const handleJoinSubmit = (password: string, nickname: string) => {
    if (pendingRoomId) {
      joinRoomMutation.mutate({
        roomId: pendingRoomId,
        password,
        nickname
      });
    }
    setShowPasswordModal(false);
    setPendingRoomId(null);
  };

  const handleNicknameConfirmed = (nickname?: string) => {
    if (pendingRoomId) {
      // Created new room, just navigate
      const params = new URLSearchParams();
      if (nickname) {
        params.set('nickname', nickname);
      }
      if (currentUserId) {
        params.set('creatorId', currentUserId);
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

          {/* Create Room Section */}
          <Card className="mb-6 shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Create New Room</h3>
              <div className="space-y-3">
                <Input
                  type="password"
                  placeholder="Enter room password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  className="min-h-[44px]"
                />
                <Button 
                  onClick={handleCreateRoom}
                  disabled={createRoomMutation.isPending}
                  className="w-full bg-[#1976D2] hover:bg-[#1565C0] text-white font-semibold py-4 px-6 rounded-xl min-h-[44px] shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {createRoomMutation.isPending ? "Creating..." : "Create Room"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Join Room Section */}
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Join Existing Room</h3>
              <div className="space-y-3">
                <Input
                  type="text"
                  placeholder="Enter room code (e.g. ABC123)"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  className="text-center text-lg font-mono tracking-wider min-h-[44px]"
                  maxLength={8}
                />
                
                <Button 
                  onClick={handleJoinRoom}
                  variant="outline"
                  className="w-full min-h-[44px] font-semibold"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Join Room
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

      <PasswordModal
        isOpen={showPasswordModal}
        roomId={pendingRoomId || ""}
        onSubmit={handleJoinSubmit}
        onClose={() => {
          setShowPasswordModal(false);
          setPendingRoomId(null);
        }}
        isValidating={joinRoomMutation.isPending}
      />

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
