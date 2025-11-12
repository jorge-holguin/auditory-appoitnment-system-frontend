import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useState } from "react"
import { RevisionAtencionModal } from "./RevisionAtencionModal"

interface CitaContext {
  paciente: string
  fecha: string
  hora: string
  consultorioNombre: string
  medicoNombre: string
  seguroNombre: string
  historia: string
  seguro: string
  numRef: string
  entidadSis: string
}

interface PdfReviewModalProps {
  open: boolean
  onClose: () => void
  citaId: string
  citaContext: CitaContext
  onAprobar: () => void
}

export function PdfReviewModal({ open, onClose, citaId, citaContext, onAprobar }: PdfReviewModalProps) {
  const [loading, setLoading] = useState(false)
  const [showRevisionModal, setShowRevisionModal] = useState(false)
  const pdfUrl = `http://192.168.0.252:9011/api/reporte/fua?citaId=${citaId}`

  const handleAprobar = async () => {
    setLoading(true)
    try {
      await onAprobar()
      onClose()
    } catch (error) {
      console.error("Error al aprobar:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleObservar = () => {
    setShowRevisionModal(true)
  }

  const handleSaveObservations = (observations: any[]) => {
    console.log("Observaciones guardadas:", observations)
    setShowRevisionModal(false)
    onClose()
    // Aquí iría la lógica para guardar las observaciones en la API
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col bg-white">
        <DialogHeader>
          <DialogTitle className="text-[#114C5F]">
            Revisar FUA - Cita ID: {citaId}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden rounded-lg border border-gray-200">
          <iframe
            src={`${pdfUrl}#zoom=125`}
            className="w-full h-full"
            title={`FUA ${citaId}`}
          />
        </div>

        <div className="flex gap-4 pt-4 border-t">
          <Button
            onClick={handleObservar}
            disabled={loading}
            variant="outline"
            className="flex-1 h-12 text-base font-medium border-2 border-orange-500 text-orange-600 hover:bg-orange-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2" />
            )}
            Observar
          </Button>
          
          <Button
            onClick={handleAprobar}
            disabled={loading}
            className="flex-1 h-12 text-base font-medium bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5 mr-2" />
            )}
            Aprobar
          </Button>
        </div>
      </DialogContent>

      {/* Modal de Revisión de Atención */}
      <RevisionAtencionModal
        open={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        citaId={citaId}
        citaContext={citaContext}
        onSave={handleSaveObservations}
      />
    </Dialog>
  )
}
