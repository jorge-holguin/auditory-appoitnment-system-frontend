import { useState, useCallback, useEffect, useRef } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { Html5Qrcode } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IpsViewer } from "@/components/shlink/IpsViewer"
import { PasscodeDialog } from "@/components/shlink/PasscodeDialog"
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileCheck,
  ImageIcon,
  KeyRound,
  Loader2,
  QrCode,
  RefreshCw,
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
  requiresPasscode as tokenRequiresPasscode,
  validateToken,
  generateViewer,
  buildViewerUrl,
} from "@/hooks/useTokenAnalyzer"
import type { ProfessionalContext } from "@/models/viewerModels"

// ── Types ──────────────────────────────────────────────────────────────────────

type RightPanel =
  | "idle"
  | "shlink_validating"
  | "shlink_loading"
  | "shlink_ready"
  | "error"

interface PatientInfo {
  dni: string
  raw: string
  shlinkToken?: string
  sessionId?: string | null
  expiration?: Date | null
  needsPasscode?: boolean
  isExpired?: boolean
}

// ── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_PROF: ProfessionalContext = {
  tipoDocumento: "DNI",
  numeroDocumento: "12345678",
  ipressId: "20",
  ipressName: "Hospital José Agurto Tello",
  system: "sihce-angular",
}

const QR_CAM_ID = "resumen-clinico-qr-cam"
const QR_IMG_ID = "resumen-clinico-qr-img"

const isCameraAllowed =
  typeof window !== "undefined" &&
  (window.location.protocol === "https:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1")

// ── Helper ────────────────────────────────────────────────────────────────────

function parseQrPayload(raw: string): PatientInfo {
  const trimmed = raw.trim()
  const shlinkToken = extractShlinkToken(trimmed)
  if (shlinkToken) {
    const expiration = extractExpiration(shlinkToken)
    return {
      dni: extractPatientRef(shlinkToken) ?? shlinkToken,
      raw: trimmed,
      shlinkToken,
      sessionId: extractSessionId(shlinkToken),
      expiration,
      needsPasscode: tokenRequiresPasscode(shlinkToken),
      isExpired: expiration ? expiration < new Date() : false,
    }
  }
  const numMatch = trimmed.match(/\b\d{8}\b/)
  return { dni: numMatch ? numMatch[0] : trimmed, raw: trimmed }
}


// ── Page ──────────────────────────────────────────────────────────────────────

export default function VerResumenClinicoPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // ── Left panel ────────────────────────────────────────────
  const [scanTab, setScanTab] = useState<"camara" | "imagen">("camara")
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [loadingImage, setLoadingImage] = useState(false)
  const [patient, setPatient] = useState<PatientInfo | null>(null)

  // ── Right panel ───────────────────────────────────────────
  const [panel, setPanel] = useState<RightPanel>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [currentDni, setCurrentDni] = useState<string | null>(null)

  // SHLink viewer
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [viewerExpiry, setViewerExpiry] = useState(1500)
  const [showPasscode, setShowPasscode] = useState(false)
  const [passcodeError, setPasscodeError] = useState<string | null>(null)
  const [passcodeLoading, setPasscodeLoading] = useState(false)
  const pendingSession = useRef<{ sessionId: string; token: string } | null>(null)

  // Refs
  const html5QrRef = useRef<Html5Qrcode | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => () => { stopCamera() }, [])
  useEffect(() => { if (scanTab !== "camara") stopCamera() }, [scanTab])

  // ── QR Camera ─────────────────────────────────────────────

  const stopCamera = async () => {
    if (html5QrRef.current) {
      try { if (cameraActive) await html5QrRef.current.stop() } catch { /* ignore */ }
      html5QrRef.current = null
    }
    setCameraActive(false)
  }

  const onQrDecoded = (raw: string) => {
    const info = parseQrPayload(raw)
    stopCamera()
    if (info.shlinkToken) {
      const urlDoc = searchParams.get("documento")
      setPatient({ ...info, dni: urlDoc || info.dni })
    } else {
      setSearchParams({ documento: info.dni }, { replace: true })
    }
  }

  const handleActivarCamara = async () => {
    setCameraError(null)
    if (!isCameraAllowed) { setCameraError("La cámara requiere HTTPS o localhost."); return }
    try {
      const qr = new Html5Qrcode(QR_CAM_ID)
      html5QrRef.current = qr
      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        onQrDecoded,
        () => { /* silent */ }
      )
      setCameraActive(true)
    } catch (err) {
      const msg = (err instanceof Error ? err.message : "").toLowerCase()
      setCameraError(
        msg.includes("permission") || msg.includes("denied")
          ? "Acceso denegado. Autorice la cámara en su navegador."
          : "No se pudo acceder a la cámara."
      )
    }
  }

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageError(null)
    setLoadingImage(true)
    try {
      const result = await new Html5Qrcode(QR_IMG_ID).scanFile(file, false)
      onQrDecoded(result)
    } catch {
      setImageError("No se detectó un QR válido en la imagen.")
    } finally {
      setLoadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // ── SHLink inline flow ────────────────────────────────────

  const runGenerateViewer = useCallback(async (sessionId: string, token: string, passcode?: string) => {
    setPanel("shlink_loading")
    setShowPasscode(false)
    setPasscodeLoading(false)
    const prof = { ...DEFAULT_PROF, numeroDocumento: searchParams.get("documento") ?? DEFAULT_PROF.numeroDocumento }
    try {
      const resp = await generateViewer(sessionId, token, prof, passcode)
      setViewerUrl(buildViewerUrl(resp.viewerUrl))
      setViewerExpiry(resp.expiresInSeconds)
      setPanel("shlink_ready")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error generando viewer"
      if (msg.toLowerCase().includes("passcode") || msg.includes("Passcode")) {
        pendingSession.current = { sessionId, token }
        setPasscodeError("Código incorrecto, intente nuevamente.")
        setPasscodeLoading(false)
        setShowPasscode(true)
        setPanel("shlink_loading")
      } else {
        setErrorMessage(msg)
        setPanel("error")
      }
    }
  }, [patient])

  const handleVerShlink = useCallback(async (info: PatientInfo) => {
    if (!info.shlinkToken || info.isExpired) return
    if (!info.sessionId) { setErrorMessage("No se pudo extraer el ID de sesión."); setPanel("error"); return }
    if (info.needsPasscode) {
      pendingSession.current = { sessionId: info.sessionId, token: info.shlinkToken }
      setShowPasscode(true)
      return
    }
    setCurrentDni(info.dni)
    setPanel("shlink_validating")
    try {
      const validation = await validateToken(info.shlinkToken)
      if (!validation.valid) { setErrorMessage(validation.reason ?? "Token inválido."); setPanel("error"); return }
      await runGenerateViewer(info.sessionId, info.shlinkToken)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error validando token")
      setPanel("error")
    }
  }, [runGenerateViewer])

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#9CD2D3]/30 px-6 py-4 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F9BB6] to-[#4A6EB0] flex items-center justify-center shadow-sm">
            <ClipboardList className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#114C5F] leading-tight">Resumen Clínico IPS</h1>
            <p className="text-xs text-[#114C5F]/50">INTEROPERABILIDAD · IHE MHD · HL7 FHIR R4</p>
          </div>
        </div>
      </div>

      {/* Body: two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 flex-1 min-h-0 items-start">

        {/* ── Left Panel ──────────────────────────────── */}
        <div className="flex flex-col gap-3">

          {/* Patient card (post-scan) */}
          {patient ? (
            <div className="bg-white rounded-2xl border border-[#9CD2D3]/30 shadow-sm overflow-hidden">
              <div className={`px-4 py-2.5 flex items-center justify-between border-b ${patient.isExpired ? "bg-red-50 border-red-200/60" : "bg-gradient-to-r from-[#EBF6FA] to-[#EEF0FA] border-[#9CD2D3]/20"}`}>
                <div className="flex items-center gap-1.5">
                  {patient.isExpired
                    ? <><AlertCircle className="w-3.5 h-3.5 text-red-500" /><span className="text-xs font-semibold text-red-600">QR expirado</span></>
                    : <><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /><span className="text-xs font-semibold text-green-700">{patient.shlinkToken ? "SHLink detectado" : "QR detectado"}</span></>}
                </div>
                <button onClick={() => setPatient(null)} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="px-4 py-4 space-y-3">
                <div>
                  <p className="text-[10px] text-[#114C5F]/50 mb-0.5">N° Documento</p>
                  <p className="text-2xl font-bold font-mono text-[#114C5F] tracking-wider">{patient.dni}</p>
                </div>
                {patient.shlinkToken && (
                  <div className="space-y-1 text-[10px] text-[#114C5F]/60">
                    {patient.sessionId && (
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3 flex-shrink-0" />
                        <span className="font-mono truncate">{patient.sessionId.substring(0, 20)}…</span>
                      </div>
                    )}
                    {patient.expiration && (
                      <div className={`flex items-center gap-1.5 ${patient.isExpired ? "text-red-500" : ""}`}>
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span>{patient.isExpired ? "Expiró" : "Expira"}: {patient.expiration.toLocaleString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    )}
                    {patient.needsPasscode && (
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <KeyRound className="w-3 h-3 flex-shrink-0" />
                        <span>Requiere código verbal</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-col gap-2 pt-1">
                  {patient.shlinkToken && !patient.isExpired && (
                    <Button size="sm" onClick={() => handleVerShlink(patient)} className="w-full bg-gradient-to-r from-[#00A591] to-[#00866E] hover:from-[#007a6d] hover:to-[#006656] text-white text-xs h-8 gap-1.5">
                      <FileCheck className="w-3.5 h-3.5" /> Ver Resumen SHLink
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => navigate(`/documentos-ips?documento=${patient.dni}`)}
                    className="w-full bg-gradient-to-r from-[#4F9BB6] to-[#4A6EB0] hover:from-[#3d8aa5] hover:to-[#3a5da0] text-white text-xs h-8 gap-1.5"
                  >
                    <ClipboardList className="w-3.5 h-3.5" /> Ver documentos IPS
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* QR Scanner card */
            <div className="bg-white rounded-2xl border border-[#9CD2D3]/30 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#9CD2D3]/20">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-[#4F9BB6]" />
                  <p className="text-sm font-semibold text-[#114C5F]">Leer código QR</p>
                </div>
                <p className="text-xs text-[#114C5F]/50 mt-0.5">Escanee el QR del paciente para identificarlo</p>
              </div>
              <div className="px-5 py-4">
                <Tabs value={scanTab} onValueChange={(v) => setScanTab(v as "camara" | "imagen")}>
                  <TabsList className="grid grid-cols-2 bg-slate-100 h-8 w-full">
                    <TabsTrigger value="camara" className="text-xs gap-1.5 h-7"><Camera className="w-3 h-3" /> Cámara</TabsTrigger>
                    <TabsTrigger value="imagen" className="text-xs gap-1.5 h-7"><ImageIcon className="w-3 h-3" /> Imagen</TabsTrigger>
                  </TabsList>

                  <TabsContent value="camara" className="mt-3 space-y-2">
                    <div id={QR_CAM_ID} className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center" style={{ minHeight: 180 }}>
                      {!cameraActive && (
                        <div className="flex flex-col items-center gap-2 text-slate-400 py-6 text-center">
                          <VideoOff className="w-7 h-7 opacity-30" />
                          <p className="text-xs">{isCameraAllowed ? "Clic en Activar para escanear" : "⚠️ Cámara no disponible en HTTP"}</p>
                        </div>
                      )}
                    </div>
                    {cameraError && (
                      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /><span>{cameraError}</span>
                      </div>
                    )}
                    <Button size="sm" className={`w-full gap-1.5 text-xs h-8 ${cameraActive ? "bg-red-500 hover:bg-red-600" : "bg-[#00B09B] hover:bg-[#00957f]"} text-white`} onClick={cameraActive ? stopCamera : handleActivarCamara}>
                      <Camera className="w-3.5 h-3.5" />{cameraActive ? "Detener cámara" : "Activar cámara"}
                    </Button>
                  </TabsContent>

                  <TabsContent value="imagen" className="mt-3 space-y-2">
                    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors py-8" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-7 h-7 text-slate-300" />
                      <p className="text-xs text-slate-500 font-medium">Subir imagen del QR</p>
                      <p className="text-[10px] text-slate-400">PNG, JPG, WEBP</p>
                    </div>
                    {imageError && (
                      <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /><span>{imageError}</span>
                      </div>
                    )}
                    <Button size="sm" className="w-full gap-1.5 text-xs h-8 bg-[#4F9BB6] hover:bg-[#3d8aa5] text-white" onClick={() => fileInputRef.current?.click()} disabled={loadingImage}>
                      {loadingImage ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {loadingImage ? "Procesando…" : "Seleccionar imagen"}
                    </Button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                    <div id={QR_IMG_ID} className="hidden" />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}

        </div>

        {/* ── Right Panel ─────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#9CD2D3]/30 shadow-sm overflow-hidden flex flex-col min-h-[420px]">

          {panel === "idle" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8 py-16">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#EBF6FA] to-[#EEF0FA] flex items-center justify-center">
                <QrCode className="w-8 h-8 text-[#4F9BB6]/50" />
              </div>
              <div>
                <p className="font-semibold text-[#114C5F] text-sm">Identifique al paciente</p>
                <p className="text-xs text-[#114C5F]/50 mt-1 max-w-xs">Escanee el QR del paciente o busque por número de documento para ver su historial clínico.</p>
              </div>
            </div>
          )}

          {(panel === "shlink_validating" || panel === "shlink_loading") && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 text-[#00A591] animate-spin" />
              <p className="text-sm text-slate-500">{panel === "shlink_validating" ? "Validando token SHLink…" : "Generando resumen cifrado…"}</p>
            </div>
          )}

          {panel === "error" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8">
              <AlertCircle className="w-7 h-7 text-red-400" />
              <p className="text-sm text-slate-600 text-center max-w-xs">{errorMessage}</p>
              <Button size="sm" variant="outline" onClick={() => setPanel("idle")} className="gap-1.5 text-xs">
                <RefreshCw className="w-3.5 h-3.5" /> Volver
              </Button>
            </div>
          )}

          {panel === "shlink_ready" && (
            <div className="flex flex-col h-full">
              <div className="px-5 py-3 border-b border-[#9CD2D3]/20 flex items-center gap-2.5 flex-shrink-0">
                <FileCheck className="w-4 h-4 text-[#00A591]" />
                <span className="text-sm font-semibold text-[#114C5F]">Resumen SHLink</span>
                {currentDni && <span className="text-xs text-[#114C5F]/50 font-mono">· DNI {currentDni}</span>}
              </div>
              <div className="flex-1 min-h-[500px]">
                <IpsViewer viewerUrl={viewerUrl} expiresInSeconds={viewerExpiry} onExpired={() => { setPanel("error"); setErrorMessage("Sesión expirada. Solicite un nuevo QR.") }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Passcode Dialog */}
      <PasscodeDialog
        open={showPasscode}
        loading={passcodeLoading}
        error={passcodeError}
        onConfirm={(code) => {
          if (!pendingSession.current) return
          setPasscodeLoading(true)
          runGenerateViewer(pendingSession.current.sessionId, pendingSession.current.token, code)
        }}
        onCancel={() => setShowPasscode(false)}
      />


    </div>
  )
}
