import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  Loader2,
  Lock,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Stethoscope,
} from "lucide-react"
import { IpsViewer } from "@/components/shlink/IpsViewer"
import { PasscodeDialog } from "@/components/shlink/PasscodeDialog"
import {
  extractSessionId,
  extractExpiration,
  requiresPasscode,
  validateToken,
  generateViewer,
  buildViewerUrl,
} from "@/hooks/useTokenAnalyzer"
import type { ProfessionalContext, ViewerState } from "@/models/viewerModels"

// ── Constants ─────────────────────────────────────────────────────────────────

const DOC_TYPES = [
  { label: "DNI", value: "DNI" },
  { label: "Carné de Extranjería", value: "CE" },
  { label: "Pasaporte", value: "PAS" },
]

const DEFAULT_PROF: ProfessionalContext = {
  tipoDocumento: "DNI",
  numeroDocumento: "",
  nombreCompleto: "",
  ipressId: "",
  ipressName: "",
  system: "sihce-react",
}

const STATE_LABELS: Record<ViewerState, string> = {
  idle: "En espera",
  validating: "Validando",
  passcode_required: "Requiere código",
  loading: "Cargando",
  ready: "Activo",
  expired: "Expirado",
  revoked: "Revocado",
  error: "Error",
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

// ── State sub-components (HJATCH style) ───────────────────────────────────────

function IdleState() {
  const steps = ["Pegar JWT", "Datos profesional", "Ver resumen"]
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-10 text-center">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00A591]/10 to-[#4A6EB0]/10 border border-[#00A591]/20 flex items-center justify-center">
        <ScanLine className="w-9 h-9 text-[#00A591]" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-[#114C5F] mb-1">Visualizador IPS · RENHICE</h2>
        <p className="text-sm text-[#114C5F]/50 max-w-sm leading-relaxed">
          Pegue el JWT del QR del paciente y complete los datos del profesional para visualizar el resumen clínico.
        </p>
      </div>
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-2">
          {steps.map((step, i) => (
            <span key={i} className="text-[11px] font-medium text-[#114C5F]/60">{step}</span>
          ))}
        </div>
        <div className="h-2 rounded-full bg-[#9CD2D3]/20 overflow-hidden flex">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`flex-1 ${i > 0 ? "ml-1" : ""} rounded-full ${
                i === 0 ? "bg-gradient-to-r from-[#00A591] to-[#4A6EB0]" : "bg-[#9CD2D3]/30"
              }`}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-[#00A591] bg-[#00A591]/5 border border-[#00A591]/20 rounded-full px-4 py-2">
        <Lock className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Cifrado AES-256-GCM · No persistente · Uso único</span>
      </div>
    </div>
  )
}

function SpinnerState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-[#00A591]/20 animate-ping" />
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00A591]/10 to-[#4A6EB0]/10 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-[#00A591] animate-spin" />
        </div>
      </div>
      <div className="text-center">
        <p className="font-semibold text-[#114C5F]">{title}</p>
        <p className="text-sm text-[#114C5F]/50 mt-1">{subtitle}</p>
      </div>
    </div>
  )
}

function ErrorState({
  icon: Icon, bgClass, iconColor, title, message, onReset, resetLabel,
}: {
  icon: React.ElementType
  bgClass: string
  iconColor: string
  title: string
  message: string
  onReset: () => void
  resetLabel: string
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-10 text-center">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${bgClass}`}>
        <Icon className={`w-7 h-7 ${iconColor}`} />
      </div>
      <div>
        <h3 className="font-bold text-[#114C5F] mb-1">{title}</h3>
        <p className="text-sm text-[#114C5F]/50 max-w-sm leading-relaxed">{message}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        className="gap-2 border-[#9CD2D3]/60 text-[#114C5F] hover:bg-[#9CD2D3]/10"
      >
        <RefreshCw className="w-3.5 h-3.5" /> {resetLabel}
      </Button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ShlinkViewerPage() {
  const [searchParams] = useSearchParams()
  const [viewerState, setViewerState] = useState<ViewerState>("idle")
  const [qrToken, setQrToken] = useState(searchParams.get("token") ?? "")
  const [prof, setProf] = useState<ProfessionalContext>(DEFAULT_PROF)
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [viewerExpiry, setViewerExpiry] = useState<number>(1500)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [sessionExpiry, setSessionExpiry] = useState<Date | null>(null)
  const [expirySeconds, setExpirySeconds] = useState(0)
  const [showPasscode, setShowPasscode] = useState(false)
  const [passcodeError, setPasscodeError] = useState<string | null>(null)
  const [passcodeLoading, setPasscodeLoading] = useState(false)
  const pendingSession = useRef<{ sessionId: string; token: string } | null>(null)

  useEffect(() => {
    if (!sessionExpiry) return
    const id = setInterval(() => {
      const secs = Math.max(0, Math.floor((sessionExpiry.getTime() - Date.now()) / 1000))
      setExpirySeconds(secs)
      if (secs === 0 && viewerState === "ready") setViewerState("expired")
    }, 1000)
    return () => clearInterval(id)
  }, [sessionExpiry, viewerState])

  const canLoad = qrToken.trim().length > 10

  const runGenerateViewer = useCallback(async (
    sessionId: string, token: string, passcode?: string
  ) => {
    setViewerState("loading")
    setShowPasscode(false)
    setPasscodeLoading(false)
    try {
      const resp = await generateViewer(sessionId, token, prof, passcode)
      setViewerUrl(buildViewerUrl(resp.viewerUrl))
      setViewerExpiry(resp.expiresInSeconds)
      setViewerState("ready")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error generando viewer"
      if (msg.includes("revocad")) {
        setViewerState("revoked")
      } else if (msg.includes("expirad")) {
        setViewerState("expired")
      } else if (msg.toLowerCase().includes("passcode")) {
        pendingSession.current = { sessionId, token }
        setPasscodeError("Código incorrecto, intente nuevamente.")
        setPasscodeLoading(false)
        setShowPasscode(true)
        setViewerState("passcode_required")
      } else {
        setErrorMessage(msg)
        setViewerState("error")
      }
    }
  }, [prof])

  const handleLoadViewer = useCallback(async () => {
    const token = qrToken.trim()
    const sessionId = extractSessionId(token)
    if (!sessionId) {
      setErrorMessage("Token inválido — no se pudo extraer el ID de sesión.")
      setViewerState("error")
      return
    }
    setSessionExpiry(extractExpiration(token))
    setErrorMessage(null)
    setViewerState("validating")
    try {
      const validation = await validateToken(token)
      if (!validation.valid) {
        setErrorMessage(validation.reason ?? "Token inválido.")
        setViewerState("error")
        return
      }
      if (requiresPasscode(token)) {
        pendingSession.current = { sessionId, token }
        setPasscodeError(null)
        setShowPasscode(true)
        setViewerState("passcode_required")
        return
      }
      await runGenerateViewer(sessionId, token)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error validando token.")
      setViewerState("error")
    }
  }, [qrToken, runGenerateViewer])

  const handlePasscodeConfirm = useCallback((passcode: string) => {
    if (!pendingSession.current) return
    setPasscodeLoading(true)
    setPasscodeError(null)
    const { sessionId, token } = pendingSession.current
    runGenerateViewer(sessionId, token, passcode)
  }, [runGenerateViewer])

  const handlePasscodeCancel = useCallback(() => {
    setShowPasscode(false)
    setPasscodeError(null)
    setPasscodeLoading(false)
    pendingSession.current = null
    setViewerState("idle")
  }, [])

  const handleReset = useCallback(() => {
    setViewerState("idle")
    setQrToken("")
    setViewerUrl(null)
    setErrorMessage(null)
    setSessionExpiry(null)
    setPasscodeError(null)
    setShowPasscode(false)
    pendingSession.current = null
  }, [])

  const isLoading = ["validating", "loading"].includes(viewerState)

  return (
    <div className="space-y-4">

      {/* ── Cabecera ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border-l-[5px] border-[#9CD2D3]/30 border-l-[#00A591] px-6 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00A591] to-[#4A6EB0] flex items-center justify-center shadow-sm">
            <ScanLine className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#114C5F] leading-tight">Visualizador IPS · RENHICE</h1>
            <p className="text-xs text-[#114C5F]/50">Interoperabilidad · MINSA Perú · SHLink</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {sessionExpiry && viewerState !== "idle" && (
            <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
              expirySeconds < 120
                ? "bg-red-50 text-red-600 animate-pulse"
                : "bg-[#00A591]/10 text-[#00A591]"
            }`}>
              <Clock className="w-3 h-3" /> {formatCountdown(expirySeconds)}
            </span>
          )}
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
            viewerState === "ready"
              ? "bg-green-50 text-green-700"
              : viewerState === "error" || viewerState === "revoked" || viewerState === "expired"
              ? "bg-red-50 text-red-600"
              : "bg-[#00A591]/10 text-[#00A591]"
          }`}>
            {viewerState === "ready"
              ? <CheckCircle2 className="w-3 h-3" />
              : isLoading
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <ShieldCheck className="w-3 h-3" />}
            {STATE_LABELS[viewerState]}
          </span>
        </div>
      </div>

      {/* ── Cuerpo: configuración + viewer ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 items-stretch">

        {/* Config card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#9CD2D3]/20 border-l-[4px] border-l-[#00A591] overflow-hidden">

          {/* Token section */}
          <div className="px-5 pt-5 pb-4 space-y-3">
            <p className="text-xs font-semibold text-[#114C5F]/50 uppercase tracking-wider flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5" /> Token QR
            </p>
            <Textarea
              value={qrToken}
              onChange={(e) => setQrToken(e.target.value)}
              placeholder="Pega aquí el JWT extraído del QR…"
              rows={4}
              disabled={isLoading || viewerState === "ready"}
              className="text-[11px] font-mono resize-none border-[#9CD2D3]/50 focus-visible:ring-[#4F9BB6]/30"
            />
            {qrToken.trim().length > 10 && (
              <div className="flex items-center gap-1.5 text-[10px] text-[#00A591]">
                <ShieldCheck className="w-3 h-3" />
                <span className="font-mono">Session: {extractSessionId(qrToken)?.substring(0, 12)}…</span>
              </div>
            )}
          </div>

          <Separator className="bg-[#9CD2D3]/20" />

          {/* Professional section */}
          <div className="px-5 py-4 space-y-3">
            <p className="text-xs font-semibold text-[#114C5F]/50 uppercase tracking-wider flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5" /> Profesional de Salud</span>
              <span className="text-[10px] font-normal text-[#114C5F]/30 normal-case tracking-normal">opcional</span>
            </p>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-[#114C5F]/70">Tipo Documento</Label>
              <Select
                value={prof.tipoDocumento}
                onValueChange={(v) => setProf((p) => ({ ...p, tipoDocumento: v }))}
                disabled={viewerState === "ready"}
              >
                <SelectTrigger className="h-9 text-sm border-[#9CD2D3]/60 focus:ring-[#4F9BB6]/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {[
              { label: "N° Documento", key: "numeroDocumento", placeholder: "12345678" },
              { label: "Nombre completo", key: "nombreCompleto", placeholder: "Dr. Juan Pérez García" },
              { label: "IPRESS", key: "ipressName", placeholder: "Hospital José Agurto Tello" },
              { label: "ID IPRESS", key: "ipressId", placeholder: "28" },
            ].map(({ label, key, placeholder }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs font-medium text-[#114C5F]/70">{label}</Label>
                <Input
                  value={prof[key as keyof ProfessionalContext]}
                  onChange={(e) => setProf((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  disabled={viewerState === "ready"}
                  className="h-9 text-sm border-[#9CD2D3]/60 focus-visible:ring-[#4F9BB6]/30"
                />
              </div>
            ))}
          </div>

          <Separator className="bg-[#9CD2D3]/20" />

          {/* Action */}
          <div className="px-5 py-4 space-y-3">
            {viewerState === "ready" ? (
              <Button
                variant="outline"
                className="w-full gap-2 border-[#00A591]/70 text-[#00A591] hover:bg-[#00A591]/10"
                onClick={handleReset}
              >
                <RefreshCw className="w-4 h-4" /> Nueva Sesión
              </Button>
            ) : (
              <Button
                className="w-full gap-2 bg-gradient-to-r from-[#00A591] to-[#4A6EB0] hover:from-[#007a6d] hover:to-[#3a5da0] text-white"
                onClick={handleLoadViewer}
                disabled={!canLoad || isLoading}
              >
                {isLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</>
                  : <><Eye className="w-4 h-4" /> Cargar Resumen Clínico</>}
              </Button>
            )}

            {errorMessage && viewerState === "error" && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Security info (only when ready) */}
          {viewerState === "ready" && (
            <>
              <Separator className="bg-[#9CD2D3]/20" />
              <div className="px-5 py-4 space-y-2">
                <p className="text-xs font-semibold text-[#114C5F]/50 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Seguridad activa
                </p>
                {[
                  { icon: Lock, label: "Cifrado AES-256-GCM" },
                  { icon: FileCheck, label: "Sesión de uso único" },
                  { icon: Clock, label: `Expiración: ${viewerExpiry}s` },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 text-xs text-[#114C5F]/60">
                    <Icon className="w-3.5 h-3.5 text-[#00A591]" /> {label}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Viewer card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#9CD2D3]/20 border-t-[4px] border-t-[#00A591] overflow-hidden"
          style={{ minHeight: 520 }}>

          {/* Idle */}
          {viewerState === "idle" && <IdleState />}

          {/* Spinners */}
          {viewerState === "validating" && (
            <SpinnerState
              title="Validando autorización…"
              subtitle="Verificando firma RS256 y permisos del paciente"
            />
          )}
          {(viewerState === "loading" || viewerState === "passcode_required") && (
            <SpinnerState
              title="Generando resumen clínico…"
              subtitle="Recuperando datos del RENHICE y cifrando con AES-256-GCM"
            />
          )}

          {/* Ready: toolbar + iframe */}
          {viewerState === "ready" && (
            <div className="flex flex-col h-full min-h-0">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#9CD2D3]/20 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#00A591] to-[#4A6EB0]" />
                  <FileCheck className="w-4 h-4 text-[#00A591]" />
                  <span className="text-sm font-semibold text-[#114C5F]">
                    Resumen de Salud del Paciente · RENHICE
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[11px] flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Sesión activa
                  </span>
                  <span className="text-[11px] flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#4A6EB0]/5 border border-[#4A6EB0]/20 text-[#4A6EB0] font-medium">
                    <Lock className="w-3 h-3" /> No persistente
                  </span>
                </div>
              </div>
              <div className="flex-1 min-h-[500px] overflow-hidden">
                <IpsViewer
                  viewerUrl={viewerUrl}
                  expiresInSeconds={viewerExpiry}
                  onExpired={() => setViewerState("expired")}
                />
              </div>
            </div>
          )}

          {/* Expired */}
          {viewerState === "expired" && (
            <ErrorState
              icon={Clock}
              bgClass="bg-yellow-50 border border-yellow-200"
              iconColor="text-yellow-600"
              title="QR Expirado"
              message="El tiempo de acceso ha vencido. Solicite al paciente que genere un nuevo código QR."
              onReset={handleReset}
              resetLabel="Intentar de nuevo"
            />
          )}

          {/* Revoked */}
          {viewerState === "revoked" && (
            <ErrorState
              icon={Ban}
              bgClass="bg-red-50 border border-red-200"
              iconColor="text-red-500"
              title="Autorización Revocada"
              message="El paciente ha revocado el acceso a su información clínica."
              onReset={handleReset}
              resetLabel="Volver"
            />
          )}

          {/* Error */}
          {viewerState === "error" && (
            <ErrorState
              icon={AlertTriangle}
              bgClass="bg-red-50 border border-red-200"
              iconColor="text-red-500"
              title="Error al cargar"
              message={errorMessage ?? "No se pudo procesar la solicitud."}
              onReset={handleReset}
              resetLabel="Reintentar"
            />
          )}
        </div>
      </div>

      {/* Passcode dialog */}
      <PasscodeDialog
        open={showPasscode}
        loading={passcodeLoading}
        error={passcodeError}
        onConfirm={handlePasscodeConfirm}
        onCancel={handlePasscodeCancel}
      />
    </div>
  )
}
