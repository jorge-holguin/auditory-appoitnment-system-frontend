import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle, Loader2, Download, ExternalLink, FileX } from "lucide-react"

export type TipoDocumentoFirmado = 9 | 10 | 11

interface DocumentoFirmadoModalProps {
  open: boolean
  onClose: () => void
  idDocumento: string
  idTipoDocumento: TipoDocumentoFirmado
  titulo?: string
}

const TIPO_LABEL: Record<TipoDocumentoFirmado, string> = {
  9: "Atención",
  10: "FUA",
  11: "Liquidación",
}

const FIRMA_URL = import.meta.env.VITE_FIRMA_URL

/**
 * Modal que muestra un documento firmado digitalmente (PDF) obtenido desde
 * el backend de firma. Si el PDF llega vacío (size 0) o con un content-type
 * inválido, se muestra el mensaje "PDF vacío o inválido".
 */
export function DocumentoFirmadoModal({
  open,
  onClose,
  idDocumento,
  idTipoDocumento,
  titulo,
}: DocumentoFirmadoModalProps) {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  const documentoLabel = TIPO_LABEL[idTipoDocumento]
  const urlRemota = `${FIRMA_URL}/descargarDocumentoFirmado/2/${idTipoDocumento}?idDocumento=${encodeURIComponent(idDocumento)}&idTipoDocumento=${idTipoDocumento}`

  useEffect(() => {
    if (!open) return

    let cancelled = false
    let createdUrl: string | null = null

    setLoading(true)
    setErrorMsg(null)
    setBlobUrl(null)

    const cargar = async () => {
      try {
        const response = await fetch(urlRemota, {
          method: "GET",
          headers: { accept: "application/pdf,*/*" },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const blob = await response.blob()

        // Detectar PDF vacío o con content-type inválido
        const contentType = blob.type || response.headers.get("content-type") || ""
        const esPdf = contentType.includes("pdf") || contentType === "application/octet-stream"

        if (blob.size === 0 || !esPdf) {
          throw new Error("PDF vacío o inválido")
        }

        // Re-envolver como application/pdf para que el iframe lo muestre inline
        const pdfBlob = contentType.includes("pdf")
          ? blob
          : new Blob([await blob.arrayBuffer()], { type: "application/pdf" })

        createdUrl = URL.createObjectURL(pdfBlob)
        if (!cancelled) setBlobUrl(createdUrl)
      } catch (err) {
        console.error("[DocumentoFirmadoModal] Error al cargar PDF:", err)
        if (!cancelled) {
          setErrorMsg(
            err instanceof Error && err.message === "PDF vacío o inválido"
              ? "PDF vacío o inválido"
              : "No se pudo cargar el documento. PDF vacío o inválido."
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    cargar()

    return () => {
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [open, urlRemota])

  const handleDownload = () => {
    if (!blobUrl) return
    const a = document.createElement("a")
    a.href = blobUrl
    a.download = `${documentoLabel}_${idDocumento}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-white sm:max-w-5xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-[#114C5F]">
            {titulo || `Documento firmado: ${documentoLabel}`}
          </DialogTitle>
          <DialogDescription>
            ID Documento: <span className="font-mono">{idDocumento}</span>
            {" · "}
            Tipo: <span className="font-semibold">{documentoLabel}</span> ({idTipoDocumento})
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-[60vh] border border-gray-200 rounded-md overflow-hidden bg-gray-50 relative">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#114C5F]">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Cargando documento...</p>
            </div>
          )}

          {!loading && errorMsg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
              <div className="rounded-full bg-red-100 p-3">
                <FileX className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <p className="text-base font-semibold text-red-700">{errorMsg}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Es posible que el documento aún no esté disponible o no haya sido firmado correctamente.
                </p>
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-500 bg-red-50 border border-red-200 rounded p-3 max-w-md">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                <span>
                  Verifique que la atención haya completado el proceso de firma digital para el
                  tipo de documento <strong>{documentoLabel}</strong>.
                </span>
              </div>
            </div>
          )}

          {!loading && !errorMsg && blobUrl && (
            <iframe
              src={blobUrl}
              title={`Documento firmado ${documentoLabel}`}
              className="w-full h-full min-h-[60vh]"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          {!errorMsg && blobUrl && (
            <>
              <Button
                variant="outline"
                onClick={handleDownload}
                className="border-[#4F9BB6] text-[#4F9BB6] hover:bg-[#4F9BB6]/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(urlRemota, "_blank", "noopener,noreferrer")}
                className="border-[#114C5F] text-[#114C5F] hover:bg-[#114C5F]/10"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir en nueva pestaña
              </Button>
            </>
          )}
          <Button onClick={onClose} className="bg-[#4F9BB6] hover:bg-[#4A6EB0] text-white">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
