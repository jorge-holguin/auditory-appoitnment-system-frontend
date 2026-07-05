import { useState, useCallback, useRef, useEffect } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { Html5Qrcode } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IpsViewer } from "@/components/shlink/IpsViewer"
import { PasscodeDialog } from "@/components/shlink/PasscodeDialog"
import { QrCameraScanner } from "@/components/qr/QrCameraScanner"
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
  nombreCompleto: "",
  ipressId: "",
  ipressName: "",
  system: "sihce-angular",
}

const QR_IMG_ID = "resumen-clinico-qr-img"

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
  const [imageError, setImageError] = useState<string | null>(null)
  const [loadingImage, setLoadingImage] = useState(false)
  const [patient, setPatient] = useState<PatientInfo | null>(null)
  const [pendingRaw, setPendingRaw] = useState<string | null>(null)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)

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
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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
  }, [searchParams])

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

  // ── QR Camera ─────────────────────────────────────────────

  const onQrDecoded = (raw: string) => {
    setCameraActive(false)
    setPendingRaw(raw)
    setShowSuccessOverlay(true)
  }

  // Process scanned QR after showing success overlay
  useEffect(() => {
    if (!pendingRaw || !showSuccessOverlay) return
    const timeout = globalThis.window.setTimeout(() => {
      const info = parseQrPayload(pendingRaw)
      if (info.shlinkToken) {
        const urlDoc = searchParams.get("documento") || info.dni || ""
        setPatient({ ...info, dni: urlDoc })
        // Auto-trigger viewer generation
        setTimeout(() => handleVerShlink(info), 100)
      } else if (info.dni?.trim()) {
        setPatient(info)
        setSearchParams({ documento: info.dni.trim() }, { replace: true })
      } else {
        setPatient(info)
      }
      setPendingRaw(null)
      setShowSuccessOverlay(false)
    }, 1200) as unknown as number
    return () => globalThis.window.clearTimeout(timeout)
  }, [pendingRaw, showSuccessOverlay, searchParams, setSearchParams, handleVerShlink])

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

      {/* Body: adaptive layout
          - idle / processing: single column with large scanner as main content
          - patient detected: two columns (patient card + right panel)
          - viewer ready: full width viewer
      */}
      <div className={`grid gap-4 flex-1 min-h-0 ${
        panel === "shlink_ready" || panel === "shlink_validating" || panel === "shlink_loading"
          ? "grid-cols-1"
          : patient
            ? "grid-cols-1 lg:grid-cols-[320px_1fr]"
            : "grid-cols-1"
      }`}>

        {/* ── Left Panel: Patient card only (when available) ── */}
        {patient && panel !== "shlink_ready" && panel !== "shlink_validating" && panel !== "shlink_loading" && (
          <div className="flex flex-col gap-3 animate-in fade-in zoom-in slide-in-from-bottom-4 duration-500">
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
          </div>
        )}

        {/* ── Main Panel: scanner / processing / viewer ── */}
        <div className={`bg-white rounded-2xl border border-[#9CD2D3]/30 shadow-sm overflow-hidden flex flex-col h-full ${
          patient ? "min-h-[420px]" : "min-h-[600px]"
        }`}>

          {panel === "idle" && !patient && !showSuccessOverlay && (
            <div className="flex-1 flex flex-col h-full">
              <div className="px-5 py-4 border-b border-[#9CD2D3]/20">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-[#4F9BB6]" />
                  <p className="text-sm font-semibold text-[#114C5F]">Leer código QR</p>
                </div>
                <p className="text-xs text-[#114C5F]/50 mt-0.5">Escanee el QR del paciente para ver su resumen clínico</p>
              </div>
              <div className="flex-1 px-5 py-4 min-h-0">
                <Tabs value={scanTab} onValueChange={(v) => setScanTab(v as "camara" | "imagen")} className="h-full flex flex-col">
                  <TabsList className="grid grid-cols-2 bg-slate-100 h-8 w-full sm:w-64">
                    <TabsTrigger value="camara" className="text-xs gap-1.5 h-7"><Camera className="w-3 h-3" /> Cámara</TabsTrigger>
                    <TabsTrigger value="imagen" className="text-xs gap-1.5 h-7"><ImageIcon className="w-3 h-3" /> Imagen</TabsTrigger>
                  </TabsList>

                  <TabsContent value="camara" className="mt-3 flex-1 min-h-0">
                    <div className="h-full min-h-[420px] sm:min-h-[540px] lg:min-h-[620px]">
                      <QrCameraScanner
                        active={cameraActive && scanTab === "camara"}
                        onResult={onQrDecoded}
                        onActivate={() => setCameraActive(true)}
                        onDeactivate={() => setCameraActive(false)}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="imagen" className="mt-3 space-y-2 flex-1">
                    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors py-10 sm:py-16" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-8 h-8 text-slate-300" />
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

          {(showSuccessOverlay || (patient?.shlinkToken && panel === "idle")) && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-5 py-8 animate-in zoom-in fade-in duration-300">
              <div className="rounded-full bg-[#00B09B]/10 p-5 animate-pulse">
                <QrCode className="w-12 h-12 text-[#00B09B]" />
              </div>
              <div>
                <p className="text-lg font-bold text-[#114C5F]">QR detectado</p>
                <p className="text-xs text-[#114C5F]/60 mt-0.5">Procesando información del paciente…</p>
              </div>
              <div className="w-32 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#00B09B] w-2/3 animate-pulse rounded-full" />
              </div>
            </div>
          )}

          {patient && panel === "idle" && !patient.shlinkToken && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-5 py-8 animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#EBF6FA] to-[#EEF0FA] flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-[#114C5F] text-sm">DNI identificado</p>
                <p className="text-xs text-[#114C5F]/50 mt-1 max-w-xs">Paciente: <span className="font-mono font-medium">{patient.dni}</span></p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate(`/documentos-ips?documento=${patient.dni}`)}
                className="bg-gradient-to-r from-[#4F9BB6] to-[#4A6EB0] hover:from-[#3d8aa5] hover:to-[#3a5da0] text-white text-xs h-8 gap-1.5"
              >
                <ClipboardList className="w-3.5 h-3.5" /> Ver documentos IPS
              </Button>
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
              <div className="px-5 py-3 border-b border-[#9CD2D3]/20 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <FileCheck className="w-4 h-4 text-[#00A591]" />
                  <span className="text-sm font-semibold text-[#114C5F]">Resumen SHLink</span>
                  {currentDni && <span className="text-xs text-[#114C5F]/50 font-mono">· DNI {currentDni}</span>}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPanel("idle")
                    setPatient(null)
                    setViewerUrl(null)
                    setShowPasscode(false)
                    setPasscodeError(null)
                    setPasscodeLoading(false)
                    pendingSession.current = null
                  }}
                  className="gap-1.5 text-xs h-7 border-[#9CD2D3]/40 text-[#114C5F]/70 hover:bg-[#EBF6FA]"
                >
                  <QrCode className="w-3 h-3" /> Nuevo escaneo
                </Button>
              </div>
              <div className="flex-1 min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]">
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
