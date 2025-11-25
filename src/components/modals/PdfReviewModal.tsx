import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useState } from "react"
import { RevisionAtencionModal } from "./RevisionAtencionModal"
import { aprobarCita } from "@/services/citaService"

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
  onAprobar?: () => void
  onRefresh?: () => void
}

const API_CITAS_URL = import.meta.env.VITE_API_CITAS_URL

export function PdfReviewModal({ open, onClose, citaId, citaContext, onAprobar, onRefresh }: PdfReviewModalProps) {
  const [loading, setLoading] = useState(false)
  const [showRevisionModal, setShowRevisionModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pdfUrl = `${API_CITAS_URL}/reporte/fua?citaId=${citaId}`

  const handleAprobar = async () => {
    setLoading(true)
    setError(null)
    try {
      // Llamar a la API para cambiar el estado a APROBADO (3)
      await aprobarCita(citaId)
      
      // Llamar al callback opcional
      if (onAprobar) {
        onAprobar()
      }
      
      // Refrescar la lista si se proporciona el callback
      if (onRefresh) {
        onRefresh()
      }
      
      onClose()
    } catch (error) {
      console.error("Error al aprobar:", error)
      setError("Error al aprobar la cita. Por favor, inténtelo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  const handleObservar = () => {
    setShowRevisionModal(true)
  }

  const handleSaveObservations = async (observations: any[]) => {
    console.log("Observaciones guardadas:", observations)
    setShowRevisionModal(false)
    
    // Refrescar la lista si se proporciona el callback
    if (onRefresh) {
      onRefresh()
    }
    
    onClose()
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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

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
        onRefresh={onRefresh}
      />
    </Dialog>
  )
}
