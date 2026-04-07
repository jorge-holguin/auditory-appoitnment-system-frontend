import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, Loader2, ExternalLink, FileSearch } from "lucide-react"
import { useState, useEffect } from "react"
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
  estadoAuditoria?: string
  firmado?: boolean
  onAprobar?: () => void
  onRefresh?: () => void
  requireRevert?: boolean
}

const API_CITAS_URL = import.meta.env.VITE_API_CITAS_URL
const API_CONSULTA_EXTERNA_URL = import.meta.env.VITE_CONSULTA_EXTERNA_URL

export function PdfReviewModal({ open, onClose, citaId, citaContext, estadoAuditoria, firmado, onAprobar, onRefresh, requireRevert = false }: PdfReviewModalProps) {
  const [loading, setLoading] = useState(false)
  const [showRevisionModal, setShowRevisionModal] = useState(false)
  const [showRevisionReadOnly, setShowRevisionReadOnly] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [loadingPdf, setLoadingPdf] = useState(false)
  
  // URL base para abrir en nueva pestaña (siempre usa la URL directa)
  const externalPdfUrl = firmado 
    ? `${API_CONSULTA_EXTERNA_URL}/Fua056/getDocumentoFirmado?idDocumento=${citaId}&idTipoDocumento=10`
    : `${API_CITAS_URL}/reporte/fua?citaId=${citaId}`
  
  // Efecto para cargar el PDF como blob cuando se abre el modal y está firmado
  useEffect(() => {
    if (open && firmado) {
      setLoadingPdf(true)
      fetch(`${API_CONSULTA_EXTERNA_URL}/Fua056/getDocumentoFirmado?idDocumento=${citaId}&idTipoDocumento=10`)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Error al cargar PDF: ${response.status}`)
          }
          return response.blob()
        })
        .then(blob => {
          const url = URL.createObjectURL(blob)
          setPdfBlobUrl(url)
        })
        .catch(err => {
          console.error("Error cargando PDF firmado:", err)
          setError("No se pudo cargar el PDF firmado")
        })
        .finally(() => {
          setLoadingPdf(false)
        })
    }
    
    // Cleanup: revocar la URL del blob cuando se cierra
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl)
        setPdfBlobUrl(null)
      }
    }
  }, [open, firmado, citaId])
  
  // URL para el iframe: si está firmado y tenemos el blob, usar el blob URL
  const iframePdfUrl = firmado && pdfBlobUrl 
    ? pdfBlobUrl 
    : `${API_CITAS_URL}/reporte/fua?citaId=${citaId}`
  
  // Estados derivados para control de botones
  const isAprobado = estadoAuditoria === "APROBADO"
  const isObservado = estadoAuditoria === "OBSERVADO"
  const isCompletado = estadoAuditoria === "COMPLETADO"
  const isSubsanado = estadoAuditoria === "SUBSANADO"
  const canVerAtencion = isAprobado || isSubsanado || isCompletado

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

  const handleOpenInNewTab = () => {
    window.open(externalPdfUrl, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col bg-white">
        <DialogHeader>
          <DialogTitle className="text-[#114C5F] flex items-center justify-between pr-8">
            <span>Revisar FUA - Cita ID: {citaId}</span>
            <Button
              onClick={handleOpenInNewTab}
              variant="outline"
              size="sm"
              className="border-[#4F9BB6] text-[#4F9BB6] hover:bg-[#4F9BB6]/10"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver completo
            </Button>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Visualización del Formulario Único de Atención (FUA) para revisar y aprobar o agregar observaciones.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 relative">
          {loadingPdf && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
              <Loader2 className="w-8 h-8 animate-spin text-[#4F9BB6] mb-2" />
              <p className="text-gray-500">Cargando PDF firmado...</p>
            </div>
          )}
          <iframe
            src={`${iframePdfUrl}#zoom=125`}
            className="w-full h-full"
            title={`FUA ${citaId}`}
            allow="fullscreen"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {requireRevert && (
          <div className="flex gap-4 pt-4 border-t">
            <Button
              onClick={() => setShowRevisionReadOnly(true)}
              variant="outline"
              className="flex-1 h-12 text-base font-medium border-2 border-[#4F9BB6] text-[#4F9BB6] hover:bg-[#4F9BB6]/10"
            >
              <FileSearch className="w-5 h-5 mr-2" />
              Ver Atención
            </Button>
          </div>
        )}

        {!requireRevert && (
          <div className="flex gap-4 pt-4 border-t">
            {canVerAtencion && (
              <Button
                onClick={() => setShowRevisionReadOnly(true)}
                variant="outline"
                className="flex-1 h-12 text-base font-medium border-2 border-[#4F9BB6] text-[#4F9BB6] hover:bg-[#4F9BB6]/10"
              >
                <FileSearch className="w-5 h-5 mr-2" />
                Ver Atención
              </Button>
            )}
            
            <Button
              onClick={handleObservar}
              disabled={loading || isAprobado || isCompletado}
              variant="outline"
              className="flex-1 h-12 text-base font-medium border-2 border-orange-500 text-orange-600 hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
              disabled={loading || isAprobado || isObservado || isCompletado}
              className="flex-1 h-12 text-base font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5 mr-2" />
              )}
              Aprobar
            </Button>
          </div>
        )}
      </DialogContent>

      {/* Modal de Revisión de Atención */}
      <RevisionAtencionModal
        open={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        citaId={citaId}
        citaContext={citaContext}
        onSave={handleSaveObservations}
        onRefresh={onRefresh}
        citaEstado={estadoAuditoria}
      />

      {/* Modal de Consulta de Atención (solo lectura) */}
      <RevisionAtencionModal
        open={showRevisionReadOnly}
        onClose={() => setShowRevisionReadOnly(false)}
        citaId={citaId}
        citaContext={citaContext}
        citaEstado={estadoAuditoria}
        readOnly
      />

    </Dialog>
  )
}
