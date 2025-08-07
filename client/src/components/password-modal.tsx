import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

interface PasswordModalProps {
  isOpen: boolean;
  roomId: string;
  onPasswordSubmit: (password: string) => void;
  onClose: () => void;
  isValidating?: boolean;
}

export default function PasswordModal({
  isOpen,
  roomId,
  onPasswordSubmit,
  onClose,
  isValidating = false
}: PasswordModalProps) {
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    if (password.trim()) {
      onPasswordSubmit(password.trim());
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
            Room Password Required
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter the password to join room <span className="font-mono font-semibold">{roomId}</span>
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter room password"
              className="min-h-[44px]"
              autoFocus
              disabled={isValidating}
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isValidating}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!password.trim() || isValidating}
              className="min-w-[80px]"
            >
              {isValidating ? "Checking..." : "Join"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}