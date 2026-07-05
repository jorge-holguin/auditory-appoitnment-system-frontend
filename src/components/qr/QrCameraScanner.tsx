import { useRef, useEffect, useState, useCallback } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Camera, VideoOff, ScanLine } from "lucide-react"
import { Button } from "@/components/ui/button"

interface QrCameraScannerProps {
  onResult: (data: string) => void
  active: boolean
  onActivate: () => void
  onDeactivate: () => void
}

export function QrCameraScanner({ onResult, active, onActivate, onDeactivate }: QrCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const html5QrRef = useRef<Html5Qrcode | null>(null)
  const intervalRef = useRef<number>(0)
  const scanningRef = useRef(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detected, setDetected] = useState(false)

  const isCameraAllowed =
    typeof globalThis.window !== "undefined" &&
    (globalThis.window.location.protocol === "https:" ||
      globalThis.window.location.hostname === "localhost" ||
      globalThis.window.location.hostname === "127.0.0.1")

  const stopCamera = useCallback(() => {
    clearInterval(intervalRef.current)
    intervalRef.current = 0
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setDetected(false)
    scanningRef.current = false
  }, [])

  const notifyDetection = useCallback((data: string) => {
    setDetected(true)
    stopCamera()
    onResult(data)
  }, [onResult, stopCamera])

  const canvasToFile = (canvas: HTMLCanvasElement, video: HTMLVideoElement): Promise<File> => {
    return new Promise((resolve, reject) => {
      const ctx = canvas.getContext("2d")
      if (!ctx) { reject(new Error("No se pudo procesar la imagen")); return }
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("No se pudo generar la imagen")); return }
        resolve(new File([blob], "qr-capture.png", { type: "image/png" }))
      }, "image/png", 1)
    })
  }

  const scanCurrentFrame = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const qr = html5QrRef.current
    if (!video || !canvas || !qr || video.readyState !== video.HAVE_ENOUGH_DATA) return
    if (scanningRef.current) return
    scanningRef.current = true
    try {
      const file = await canvasToFile(canvas, video)
      const result = await qr.scanFile(file, false)
      if (result) {
        notifyDetection(result)
      }
    } catch {
      // No QR in this frame; keep scanning
    } finally {
      scanningRef.current = false
    }
  }, [notifyDetection])

  const startCamera = useCallback(async () => {
    if (loading) return
    setError(null)
    setLoading(true)
    setDetected(false)

    if (!isCameraAllowed) {
      setError("La cámara requiere HTTPS o localhost.")
      setLoading(false)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        // Scan frequently (100ms) for faster detection
        scanCurrentFrame()
        intervalRef.current = globalThis.window.setInterval(scanCurrentFrame, 100) as unknown as number
      }
    } catch (err) {
      const msg = (err instanceof Error ? err.message : "").toLowerCase()
      setError(
        msg.includes("permission") || msg.includes("denied")
          ? "Acceso denegado. Autorice la cámara en su navegador."
          : "No se pudo acceder a la cámara."
      )
    } finally {
      setLoading(false)
    }
  }, [loading, isCameraAllowed, scanCurrentFrame])

  useEffect(() => {
    html5QrRef.current = new Html5Qrcode("__qr-scanner-reader__")
    return () => {
      stopCamera()
      html5QrRef.current?.clear()
      html5QrRef.current = null
    }
  }, [])

  useEffect(() => {
    if (active) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [active])

  const buttonLabel = loading ? "Iniciando…" : "Activar cámara"

  return (
    <div className="space-y-2 h-full flex flex-col">
      {/* Camera viewport */}
      <div className="relative flex-1 rounded-xl border-2 border-dashed border-slate-200 bg-black overflow-hidden min-h-[360px] sm:min-h-[480px] lg:min-h-[560px]">
        {/* Native video element */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover ${active ? "block" : "hidden"}`}
          playsInline
          muted
        />

        {/* Hidden canvas for frame analysis */}
        <canvas ref={canvasRef} className="hidden" />
        <div id="__qr-scanner-reader__" className="hidden" />

        {/* Scan frame overlay */}
        {active && !detected && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Dark overlay with transparent center */}
            <div className="absolute inset-0 bg-black/30" />
            <div className="relative w-[240px] h-[240px] sm:w-[300px] sm:h-[300px] lg:w-[360px] lg:h-[360px] z-10">
              {/* Clear center */}
              <div className="absolute inset-0 bg-transparent" style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)" }} />
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-10 h-10 sm:w-12 sm:h-12 border-t-[4px] border-l-[4px] border-[#00B09B] rounded-tl-md" />
              <div className="absolute top-0 right-0 w-10 h-10 sm:w-12 sm:h-12 border-t-[4px] border-r-[4px] border-[#00B09B] rounded-tr-md" />
              <div className="absolute bottom-0 left-0 w-10 h-10 sm:w-12 sm:h-12 border-b-[4px] border-l-[4px] border-[#00B09B] rounded-bl-md" />
              <div className="absolute bottom-0 right-0 w-10 h-10 sm:w-12 sm:h-12 border-b-[4px] border-r-[4px] border-[#00B09B] rounded-br-md" />
              {/* Scan line animation */}
              <div className="absolute left-2 right-2 h-[3px] bg-[#00B09B] animate-pulse" style={{ top: "50%" }} />
            </div>
            <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-white/80 font-medium z-10">
              Enfoca el código QR dentro del marco
            </p>
          </div>
        )}

        {/* Detected flash */}
        {detected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#00B09B]/90 text-white pointer-events-none animate-in zoom-in fade-in duration-300">
            <div className="rounded-full bg-white/20 p-4 animate-pulse">
              <ScanLine className="w-10 h-10 text-white" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">QR detectado</p>
              <p className="text-xs text-white/80">Procesando información…</p>
            </div>
          </div>
        )}

        {/* Idle state */}
        {!active && !detected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 bg-slate-50 pointer-events-none">
            <VideoOff className="w-8 h-8 opacity-30" />
            <p className="text-xs">{isCameraAllowed ? "Clic en Activar para escanear" : "⚠️ Cámara no disponible en HTTP"}</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
          <span>{error}</span>
        </div>
      )}

      {/* Buttons */}
      {active ? (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 gap-1.5 text-xs h-10 bg-red-500 hover:bg-red-600 text-white"
            onClick={onDeactivate}
          >
            <Camera className="w-4 h-4" /> Detener
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          disabled={loading}
          className="w-full gap-1.5 text-xs h-10 bg-[#00B09B] hover:bg-[#00957f] text-white disabled:opacity-60"
          onClick={onActivate}
        >
          <Camera className="w-4 h-4" />{buttonLabel}
        </Button>
      )}
    </div>
  )
}
