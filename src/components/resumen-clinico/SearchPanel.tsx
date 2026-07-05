import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, QrCode, Search } from "lucide-react"
import { QRScannerPanel } from "./QRScannerPanel"

interface SearchPanelProps {
  tipoDocumento: "DNI" | "CE"
  setTipoDocumento: (v: "DNI" | "CE") => void
  numeroDocumento: string
  setNumeroDocumento: (v: string) => void
  onBuscar: (docNumberOverride?: string) => void
  loading: boolean
}

export function SearchPanel({
  tipoDocumento,
  setTipoDocumento,
  numeroDocumento,
  setNumeroDocumento,
  onBuscar,
  loading,
}: SearchPanelProps) {
  const [qrOpen, setQrOpen] = useState(false)

  const handleQrResult = (dni: string) => {
    setNumeroDocumento(dni)
    setTipoDocumento("DNI")
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#9CD2D3]/30 overflow-hidden">
      {/* ── Fila de búsqueda ─────────────────────────────────── */}
      <div className="px-6 py-5">
        <p className="text-xs font-semibold text-[#114C5F]/50 uppercase tracking-wider mb-4">
          Búsqueda de Paciente
        </p>

        <div className="flex flex-col sm:flex-row gap-3 items-end flex-wrap">
          {/* Tipo */}
          <div className="w-44 flex-shrink-0">
            <Label className="text-xs font-medium text-[#114C5F]/70 mb-1.5 block">
              Tipo
            </Label>
            <Select
              value={tipoDocumento}
              onValueChange={(v) => setTipoDocumento(v as "DNI" | "CE")}
            >
              <SelectTrigger className="h-9 text-sm border-[#9CD2D3]/60 focus:ring-[#4F9BB6]/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DNI">DNI</SelectItem>
                <SelectItem value="CE">Carné de Extranjería</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Número */}
          <div className="flex-1 min-w-[160px] max-w-sm">
            <Label className="text-xs font-medium text-[#114C5F]/70 mb-1.5 block">
              Número de Documento
            </Label>
            <Input
              placeholder={tipoDocumento === "DNI" ? "Ej: 46970797" : "Ej: CE123456"}
              value={numeroDocumento}
              onChange={(e) => setNumeroDocumento(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && onBuscar()}
              className="h-9 text-sm border-[#9CD2D3]/60 focus-visible:ring-[#4F9BB6]/30"
            />
          </div>

          {/* Acciones */}
          <div className="flex gap-2 flex-shrink-0">
            <Button
              onClick={() => onBuscar()}
              disabled={loading}
              className="h-9 bg-gradient-to-r from-[#4F9BB6] to-[#4A6EB0] hover:from-[#3d8aa5] hover:to-[#3a5da0] text-white gap-2 px-5 text-sm"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Search className="w-4 h-4" />}
              Buscar
            </Button>

            <Button
              variant="outline"
              onClick={() => setQrOpen((v) => !v)}
              className={`h-9 gap-1.5 text-sm transition-colors border-[#4F9BB6]/60 ${
                qrOpen
                  ? "bg-[#4F9BB6] text-white hover:bg-[#3d8aa5]"
                  : "text-[#4F9BB6] hover:bg-[#4F9BB6]/10"
              }`}
            >
              <QrCode className="w-4 h-4" />
              QR
            </Button>
          </div>
        </div>
      </div>

      {/* ── Panel QR expandible ─────────────────────────────── */}
      {qrOpen && (
        <div className="border-t border-[#9CD2D3]/20 px-6 pb-6 pt-5">
          <p className="text-xs font-semibold text-[#114C5F]/50 uppercase tracking-wider mb-4">
            Leer Código QR
          </p>
          <QRScannerPanel onResult={handleQrResult} onBuscar={onBuscar} />
        </div>
      )}
    </div>
  )
}
