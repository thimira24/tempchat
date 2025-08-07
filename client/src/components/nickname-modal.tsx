import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User } from "lucide-react";

interface NicknameModalProps {
  isOpen: boolean;
  onConfirm: (nickname?: string) => void;
  onClose: () => void;
}

export default function NicknameModal({ isOpen, onConfirm, onClose }: NicknameModalProps) {
  const [nickname, setNickname] = useState("");

  const handleConfirm = () => {
    onConfirm(nickname.trim() || undefined);
    setNickname("");
  };

  const handleSkip = () => {
    onConfirm();
    setNickname("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-sm mx-4 rounded-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-[#1976D2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-6 h-6 text-[#1976D2]" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#212121]">
              Choose a Nickname
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#757575] mt-1">
            Optional - helps others identify you in chat
          </p>
        </div>
        
        <div className="space-y-4">
          <Input 
            type="text" 
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your nickname..."
            maxLength={20}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
            autoFocus
          />
          
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={handleSkip}
              className="flex-1 bg-gray-100 text-[#757575] font-medium py-3 px-4 rounded-lg min-h-[44px] hover:bg-gray-200"
            >
              Skip
            </Button>
            <Button 
              onClick={handleConfirm}
              className="flex-1 bg-[#1976D2] hover:bg-[#1565C0] text-white font-medium py-3 px-4 rounded-lg min-h-[44px]"
            >
              Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
