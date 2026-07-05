import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  ImageIcon,
  KeyRound,
  ShieldCheck,
  Upload,
  VideoOff,
  X,
} from "lucide-react"
import {
  extractShlinkToken,
  extractPatientRef,
  extractSessionId,
  extractExpiration,
  requiresPasscode,
} from "@/hooks/useTokenAnalyzer"

export interface QRScannerPanelProps {
  onResult: (dni: string) => void
  onBuscar?: (dni?: string) => void
}

interface PatientInfo {
  dni: string
  raw: string
  shlinkToken?: string
  sessionId?: string | null
  expiration?: Date | null
  needsPasscode?: boolean
  isExpired?: boolean
}

function parseQrResult(raw: string): PatientInfo {
  const trimmed = raw.trim()

  // Detectar URL SHLink
  const shlinkToken = extractShlinkToken(trimmed)
  if (shlinkToken) {
    const patientRef = extractPatientRef(shlinkToken)
    const expiration = extractExpiration(shlinkToken)
    return {
      dni: patientRef ?? shlinkToken,
      raw: trimmed,
      shlinkToken,
      sessionId: extractSessionId(shlinkToken),
      expiration,
      needsPasscode: requiresPasscode(shlinkToken),
      isExpired: expiration ? expiration < new Date() : false,
    }
  }

  // Fallback: buscar un número de 8 dígitos
  const numMatch = trimmed.match(/\b\d{8}\b/)
  return { dni: numMatch ? numMatch[0] : trimmed, raw: trimmed }
}

const isCameraAllowed =
  typeof window !== "undefined" &&
  (window.location.protocol === "https:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1")

const CAMERA_DIV_ID = "qr-panel-camera-reader"

export function QRScannerPanel({ onResult, onBuscar }: QRScannerPanelProps) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<"camara" | "imagen">("camara")
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null)
  const [loadingImage, setLoadingImage] = useState(false)

  const html5QrRef = useRef<Html5Qrcode | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const stopCamera = async () => {
    if (html5QrRef.current) {
      try {
        if (cameraActive) await html5QrRef.current.stop()
      } catch { /* ignore */ }
      html5QrRef.current = null
    }
    setCameraActive(false)
  }

  useEffect(() => () => { stopCamera() }, [])
  useEffect(() => { if (activeTab !== "camara") stopCamera() }, [activeTab])

  const handleActivarCamara = async () => {
    setCameraError(null)
    if (!isCameraAllowed) {
      setCameraError("La cámara requiere HTTPS o localhost. Use la opción de imagen para escanear desde archivo.")
      return
    }
    try {
      const qr = new Html5Qrcode(CAMERA_DIV_ID)
      html5QrRef.current = qr
      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 180, height: 180 } },
        (decoded) => { setPatientInfo(parseQrResult(decoded)); stopCamera() },
        () => { /* silencioso */ }
      )
      setCameraActive(true)
    } catch (err) {
      const msg = (err instanceof Error ? err.message : "").toLowerCase()
      setCameraError(
        msg.includes("permission") || msg.includes("denied")
          ? "Permiso denegado. Autorice el acceso a la cámara en su navegador."
          : "No se pudo acceder a la cámara. Verifique permisos y que esté en HTTPS."
      )
    }
  }

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageError(null)
    setLoadingImage(true)
    try {
      const result = await new Html5Qrcode("qr-img-hidden").scanFile(file, false)
      setPatientInfo(parseQrResult(result))
    } catch {
      setImageError("No se detectó un QR válido en la imagen.")
    } finally {
      setLoadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "camara" | "imagen")}>
        <TabsList className="grid grid-cols-2 bg-slate-100 h-8 w-56">
          <TabsTrigger value="camara" className="text-xs gap-1.5 h-7">
            <Camera className="w-3 h-3" /> Cámara
          </TabsTrigger>
          <TabsTrigger value="imagen" className="text-xs gap-1.5 h-7">
            <ImageIcon className="w-3 h-3" /> Imagen
          </TabsTrigger>
        </TabsList>

        {/* Tab: Cámara */}
        <TabsContent value="camara" className="mt-3 space-y-3">
          <div
            id={CAMERA_DIV_ID}
            className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center"
            style={{ minHeight: 200 }}
          >
            {!cameraActive && (
              <div className="flex flex-col items-center gap-2 text-slate-400 py-8 px-4 text-center">
                <VideoOff className="w-8 h-8 opacity-40" />
                <p className="text-xs">
                  {isCameraAllowed
                    ? "La cámara se activará al hacer clic en el botón"
                    : "⚠️ Cámara no disponible en HTTP. Use la opción Imagen."}
                </p>
              </div>
            )}
          </div>
          {cameraError && (
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{cameraError}</span>
            </div>
          )}
          <Button
            size="sm"
            className={`gap-1.5 text-xs h-8 ${cameraActive
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-[#00B09B] hover:bg-[#00957f] text-white"}`}
            onClick={cameraActive ? stopCamera : handleActivarCamara}
          >
            <Camera className="w-3.5 h-3.5" />
            {cameraActive ? "Detener" : "Activar Cámara"}
          </Button>
        </TabsContent>

        {/* Tab: Imagen */}
        <TabsContent value="imagen" className="mt-3 space-y-3">
          <div
            className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors py-8"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 text-slate-300" />
            <p className="text-xs text-slate-500 font-medium">Haga clic para subir una imagen</p>
            <p className="text-[10px] text-slate-400">PNG, JPG, WEBP</p>
          </div>
          {imageError && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{imageError}</span>
            </div>
          )}
          <Button
            size="sm"
            className="gap-1.5 text-xs h-8 bg-[#4F9BB6] hover:bg-[#3d8aa5] text-white"
            onClick={() => fileInputRef.current?.click()}
            disabled={loadingImage}
          >
            {loadingImage
              ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Upload className="w-3.5 h-3.5" />}
            {loadingImage ? "Procesando…" : "Seleccionar"}
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
          <div id="qr-img-hidden" className="hidden" />
        </TabsContent>
      </Tabs>

      {/* Resultado */}
      {patientInfo && (
        <div className="rounded-xl border border-[#9CD2D3]/50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-2 bg-gradient-to-r from-[#EBF6FA] to-[#EEF0FA] border-b border-[#9CD2D3]/20 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {patientInfo.isExpired ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs font-medium text-red-600">QR expirado</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-xs font-medium text-green-700">
                    {patientInfo.shlinkToken ? "SHLink detectado" : "QR detectado"}
                  </span>
                </>
              )}
            </div>
            <button
              onClick={() => setPatientInfo(null)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* DNI + acción */}
          <div className="px-4 py-3 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-[#114C5F]/50 mb-0.5">N° Documento (patient_ref)</p>
              <p className="text-xl font-bold font-mono text-[#114C5F] tracking-wider">
                {patientInfo.dni}
              </p>

              {/* Metadata SHLink */}
              {patientInfo.shlinkToken && (
                <div className="mt-2 space-y-1">
                  {patientInfo.sessionId && (
                    <div className="flex items-center gap-1.5 text-[10px] text-[#114C5F]/60">
                      <ShieldCheck className="w-3 h-3 flex-shrink-0" />
                      <span className="font-mono truncate" title={patientInfo.sessionId}>
                        Session: {patientInfo.sessionId}
                      </span>
                    </div>
                  )}
                  {patientInfo.expiration && (
                    <div className={`flex items-center gap-1.5 text-[10px] ${patientInfo.isExpired ? "text-red-500" : "text-[#114C5F]/60"}`}>
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span>
                        {patientInfo.isExpired ? "Expiró" : "Expira"}:{" "}
                        {patientInfo.expiration.toLocaleString("es-PE", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                  {patientInfo.needsPasscode && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-600">
                      <KeyRound className="w-3 h-3 flex-shrink-0" />
                      <span>Requiere passcode verbal</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 flex-shrink-0">
              {patientInfo.shlinkToken && !patientInfo.isExpired && (
                <Button
                  size="sm"
                  onClick={() => navigate(`/shlink/viewer?token=${encodeURIComponent(patientInfo.shlinkToken!)}`)}
                  className="bg-[#00A591] hover:bg-[#007a6d] text-white text-xs h-8 flex-shrink-0 gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" /> Ver Resumen SHLink
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  onResult(patientInfo.dni)
                  onBuscar?.(patientInfo.dni)
                }}
                disabled={patientInfo.isExpired}
                className="bg-gradient-to-r from-[#4F9BB6] to-[#4A6EB0] hover:from-[#3d8aa5] hover:to-[#3a5da0] text-white text-xs h-8 flex-shrink-0 disabled:opacity-50"
              >
                Usar DNI
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
