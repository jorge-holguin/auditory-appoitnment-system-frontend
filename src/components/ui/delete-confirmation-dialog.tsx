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
import { AlertTriangle, Trash2 } from "lucide-react";

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  itemName?: string;
  isLoading?: boolean;
}

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar anulación",
  description = "Esta acción no se puede deshacer. ¿Está seguro de que desea anular este elemento?",
  itemName,
  isLoading = false,
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden">
        <div className="bg-red-50 p-4 border-b border-red-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-red-700">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {title}
            </DialogTitle>
          </DialogHeader>
        </div>
        
        <div className="p-6">
          <DialogDescription className="text-base text-gray-700 mb-4">
            {description}
          </DialogDescription>
          {itemName && (
            <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
              <span className="font-medium">{itemName}</span>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex flex-row justify-end gap-2 p-4 bg-gray-50 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700 text-white sm:w-auto flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="animate-spin">◌</span>
                <span>Eliminando...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Eliminar</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
