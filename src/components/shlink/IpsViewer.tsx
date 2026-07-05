import { useEffect, useRef, useState } from "react"
import { AlertCircle, Loader2 } from "lucide-react"

interface IpsViewerProps {
  viewerUrl: string | null
  expiresInSeconds?: number
  onExpired?: () => void
}

/** Cache de HTML y promesas a nivel de módulo: evita re-fetch en React Strict Mode y errores 410 por keyId ya consumido */
const htmlCache = new Map<string, string>()
const fetchCache = new Map<string, Promise<string>>()

async function fetchViewerHtml(viewerUrl: string): Promise<string> {
  const response = await fetch(viewerUrl, { credentials: "include" })
  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`Error ${response.status}: ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`)
  }
  let html = await response.text()
  // Forzar scroll interno del body dentro del iframe
  html = html.replace(
    /<body/,
    '<body style="overflow:auto;height:100%;"'
  )
  return html
}

export function IpsViewer({ viewerUrl, expiresInSeconds = 1500, onExpired }: IpsViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const releaseBlob = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setBlobUrl(null)
  }

  const mountBlob = (html: string) => {
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    objectUrlRef.current = url
    setBlobUrl(url)
    setLoading(false)
    timerRef.current = setTimeout(() => {
      releaseBlob()
      setError("Sesión expirada. Solicite un nuevo QR al usuario de salud.")
      onExpired?.()
    }, expiresInSeconds * 1000)
  }

  useEffect(() => {
    if (!viewerUrl) return

    let isActive = true

    const loadHtml = async () => {
      const cached = htmlCache.get(viewerUrl)
      if (cached) {
        releaseBlob()
        mountBlob(cached)
        return
      }

      setLoading(true)
      setError(null)
      releaseBlob()

      try {
        let promise = fetchCache.get(viewerUrl)
        if (!promise) {
          promise = fetchViewerHtml(viewerUrl)
          fetchCache.set(viewerUrl, promise)
        }
        const html = await promise
        htmlCache.set(viewerUrl, html)
        if (!isActive) return
        mountBlob(html)
      } catch (err) {
        if (!isActive) return
        const msg = err instanceof Error ? err.message : "No se pudo cargar el resumen clínico."
        setError(msg)
        setLoading(false)
      }
    }

    loadHtml()
    return () => {
      isActive = false
      releaseBlob()
    }
  }, [viewerUrl])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-[#00A591]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm text-slate-500">Cargando resumen clínico…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-slate-600 text-center max-w-xs">{error}</p>
      </div>
    )
  }

  if (!blobUrl) return null

  return (
    <div
      className="relative w-full h-full min-h-[400px] overflow-hidden select-none"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <iframe
        src={blobUrl}
        className="absolute inset-0 w-full h-full min-h-[400px] border-none"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-popups allow-modals allow-downloads"
        title="Resumen de Salud del Paciente - RENHICE"
      />
    </div>
  )
}
