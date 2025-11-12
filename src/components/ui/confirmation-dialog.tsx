import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  additionalContent?: React.ReactNode;
  confirmDisabled?: boolean;
  isConfirming?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isLoading = false,
  additionalContent,
  confirmDisabled = false,
  isConfirming = false,
}: ConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            {title}
          </DialogTitle>
          <DialogDescription className="pt-2 text-base text-gray-700">
            {description}
          </DialogDescription>
        </DialogHeader>
        {additionalContent && (
          <div className="py-2">
            {additionalContent}
          </div>
        )}
        <DialogFooter className="flex flex-row justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading || isConfirming || confirmDisabled}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white sm:w-auto"
          >
            {isLoading || isConfirming ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin">◌</span>
                Procesando...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
