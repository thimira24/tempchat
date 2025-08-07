import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

interface DestroyModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

export default function DestroyModal({ isOpen, onConfirm, onClose, isLoading }: DestroyModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-sm mx-4 rounded-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-[#F44336]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-[#F44336]" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#212121]">
              Destroy Chat Room
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#757575] mt-1">
            This will permanently delete all messages and end the chat for all participants.
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 bg-gray-100 text-[#757575] font-medium py-3 px-4 rounded-lg min-h-[44px] hover:bg-gray-200"
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 bg-[#F44336] hover:bg-[#D32F2F] text-white font-medium py-3 px-4 rounded-lg min-h-[44px]"
          >
            {isLoading ? "Destroying..." : "Destroy"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
