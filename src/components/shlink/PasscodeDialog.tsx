import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, KeyRound } from "lucide-react"

interface PasscodeDialogProps {
  open: boolean
  loading?: boolean
  error?: string | null
  onConfirm: (passcode: string) => void
  onCancel: () => void
}

export function PasscodeDialog({
  open,
  loading = false,
  error,
  onConfirm,
  onCancel,
}: PasscodeDialogProps) {
  const [value, setValue] = useState("")

  useEffect(() => {
    if (!open) setValue("")
  }, [open])

  const handleConfirm = () => {
    if (value.length === 6) onConfirm(value)
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !loading) onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-sm"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex flex-col items-center gap-3 pt-2 pb-1">
            <div className="w-14 h-14 rounded-full bg-[#E0F2F1] flex items-center justify-center border-2 border-[#00A591]/30">
              <KeyRound className="w-6 h-6 text-[#00A591]" />
            </div>
            <DialogTitle className="text-center text-[#114C5F]">
              Verificación de Acceso
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-slate-500 leading-relaxed">
              Este QR requiere un código de verificación.
              <br />
              Solicite el código de <strong>6 dígitos</strong> al paciente.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-3 px-1">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            placeholder="000000"
            className="text-center text-2xl font-bold font-mono tracking-[0.5rem] h-14 border-[#00A591]/40 focus-visible:ring-[#00A591]/30"
            autoFocus
            disabled={loading}
          />

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-[11px] text-slate-400 text-center">
            El paciente comunicó verbalmente este código al generar el QR.
          </p>
        </div>

        <DialogFooter className="gap-2 pt-1">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="border-slate-200 text-slate-600"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={value.length !== 6 || loading}
            className="bg-[#00A591] hover:bg-[#007a6d] text-white"
          >
            {loading ? "Verificando…" : "Verificar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
