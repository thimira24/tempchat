import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, User } from "lucide-react";

interface PasswordModalProps {
  isOpen: boolean;
  roomId: string;
  onSubmit: (password: string, nickname: string) => void;
  onClose: () => void;
  isValidating?: boolean;
}

export default function PasswordModal({
  isOpen,
  roomId,
  onSubmit,
  onClose,
  isValidating = false
}: PasswordModalProps) {
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");

  const handleSubmit = () => {
    if (password.trim() && nickname.trim()) {
      onSubmit(password.trim(), nickname.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Join Chat Room
          </DialogTitle>
          <DialogDescription>
            Enter the password and your nickname to join room {roomId}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Nickname
              </Label>
              <Input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Enter your nickname"
                className="min-h-[44px]"
                autoFocus
                disabled={isValidating}
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Room Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Enter room password"
                className="min-h-[44px]"
                disabled={isValidating}
              />
            </div>
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isValidating}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!password.trim() || !nickname.trim() || isValidating}
              className="min-w-[80px]"
            >
              {isValidating ? "Joining..." : "Join Room"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}