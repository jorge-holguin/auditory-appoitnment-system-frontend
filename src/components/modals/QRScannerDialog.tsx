import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Camera,
  ImageIcon,
  VideoOff,
  User,
  ScanLine,
  AlertCircle,
  CheckCircle2,
  Upload,
} from "lucide-react"

interface QRScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onResult: (dni: string) => void
}

interface PatientInfo {
  dni: string
  raw: string
}

function parseQrResult(raw: string): PatientInfo {
  const trimmed = raw.trim()
  const numMatch = trimmed.match(/\b\d{8}\b/)
  return {
    dni: numMatch ? numMatch[0] : trimmed,
    raw: trimmed,
  }
}

const CAMERA_DIV_ID = "qr-camera-reader"

export function QRScannerDialog({ open, onOpenChange, onResult }: QRScannerDialogProps) {
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
      } catch {
        /* ignore */
      }
      html5QrRef.current = null
    }
    setCameraActive(false)
  }

  useEffect(() => {
    if (!open) {
      stopCamera()
      setPatientInfo(null)
      setCameraError(null)
      setImageError(null)
    }
  }, [open])

  useEffect(() => {
    if (activeTab !== "camara") stopCamera()
  }, [activeTab])

  const handleActivarCamara = async () => {
    setCameraError(null)
    try {
      const qr = new Html5Qrcode(CAMERA_DIV_ID)
      html5QrRef.current = qr
      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          const info = parseQrResult(decodedText)
          setPatientInfo(info)
          stopCamera()
        },
        () => { /* scan error – ignore */ }
      )
      setCameraActive(true)
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo acceder a la cámara"
      setCameraError(
        msg.toLowerCase().includes("permission")
          ? "Permiso de cámara denegado. Autorice el acceso en su navegador."
          : msg
      )
    }
  }

  const handleDetenerCamara = () => stopCamera()

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageError(null)
    setLoadingImage(true)
    try {
      const qr = new Html5Qrcode("qr-image-reader-hidden")
      const result = await qr.scanFile(file, false)
      const info = parseQrResult(result)
      setPatientInfo(info)
    } catch {
      setImageError("No se detectó un código QR válido en la imagen seleccionada.")
    } finally {
      setLoadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleUsarDni = () => {
    if (!patientInfo) return
    onResult(patientInfo.dni)
    onOpenChange(false)
  }

  const handleClose = () => {
    stopCamera()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl w-full p-0 gap-0 bg-white overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-[#114C5F] to-[#4A6EB0]">
          <div className="flex items-center gap-3">
            <ScanLine className="w-5 h-5 text-white" />
            <DialogTitle className="text-white text-base font-semibold">
              Leer Código QR
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex h-[420px]">
          {/* ── Panel izquierdo: escáner ─────────────────────── */}
          <div className="flex-1 flex flex-col border-r border-slate-100">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "camara" | "imagen")}
              className="flex flex-col flex-1"
            >
              <TabsList className="mx-4 mt-4 mb-2 grid grid-cols-2 bg-slate-100">
                <TabsTrigger value="camara" className="gap-1.5 text-sm">
                  <Camera className="w-3.5 h-3.5" />
                  Cámara
                </TabsTrigger>
                <TabsTrigger value="imagen" className="gap-1.5 text-sm">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Imagen
                </TabsTrigger>
              </TabsList>

              {/* Tab: Cámara */}
              <TabsContent value="camara" className="flex flex-col flex-1 px-4 pb-4 mt-0">
                <p className="text-xs font-semibold text-[#114C5F]/60 mb-2 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" />
                  Escanear con Cámara
                </p>

                {/* Viewport */}
                <div
                  id={CAMERA_DIV_ID}
                  className="flex-1 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center"
                  style={{ minHeight: 220 }}
                >
                  {!cameraActive && (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <VideoOff className="w-10 h-10 opacity-40" />
                      <p className="text-xs">La cámara se activará al hacer clic en el botón</p>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{cameraError}</span>
                  </div>
                )}

                <Button
                  className={`mt-3 gap-2 text-sm font-medium ${
                    cameraActive
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-[#00B09B] hover:bg-[#00957f] text-white"
                  }`}
                  onClick={cameraActive ? handleDetenerCamara : handleActivarCamara}
                >
                  <Camera className="w-4 h-4" />
                  {cameraActive ? "Detener Cámara" : "Activar Cámara"}
                </Button>
              </TabsContent>

              {/* Tab: Imagen */}
              <TabsContent value="imagen" className="flex flex-col flex-1 px-4 pb-4 mt-0">
                <p className="text-xs font-semibold text-[#114C5F]/60 mb-2 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Subir Imagen con Código QR
                </p>

                <div
                  className="flex-1 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-10 h-10 text-slate-300" />
                  <div className="text-center">
                    <p className="text-sm text-slate-500 font-medium">
                      Haga clic para seleccionar una imagen
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      PNG, JPG, GIF, WEBP
                    </p>
                  </div>
                </div>

                {imageError && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{imageError}</span>
                  </div>
                )}

                <Button
                  className="mt-3 gap-2 text-sm font-medium bg-[#4F9BB6] hover:bg-[#3d8aa5] text-white"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loadingImage}
                >
                  {loadingImage ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {loadingImage ? "Procesando…" : "Seleccionar Imagen"}
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFile}
                />
                {/* Hidden element required by html5-qrcode scanFile */}
                <div id="qr-image-reader-hidden" className="hidden" />
              </TabsContent>
            </Tabs>
          </div>

          {/* ── Panel derecho: resultado ──────────────────────── */}
          <div className="w-72 flex flex-col px-5 py-4">
            <p className="text-xs font-semibold text-[#114C5F]/60 mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Información del Paciente
            </p>

            {!patientInfo ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-3">
                <ScanLine className="w-12 h-12 opacity-40" />
                <p className="text-xs text-center text-slate-400">
                  Escanee un código QR para ver la información del paciente
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 flex-1">
                <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-medium">QR leído correctamente</span>
                </div>

                <div className="rounded-xl border border-[#9CD2D3]/40 overflow-hidden">
                  <div className="px-3 py-2 bg-gradient-to-r from-[#EBF6FA] to-[#EEF0FA] border-b border-[#9CD2D3]/25">
                    <p className="text-xs font-semibold text-[#114C5F]">N° Documento detectado</p>
                  </div>
                  <div className="px-3 py-3">
                    <p className="text-xl font-bold font-mono text-[#114C5F] tracking-wider">
                      {patientInfo.dni}
                    </p>
                  </div>
                </div>

                {patientInfo.raw !== patientInfo.dni && (
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                      <p className="text-xs text-slate-500 font-medium">Contenido completo del QR</p>
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-xs font-mono text-slate-600 break-all leading-relaxed">
                        {patientInfo.raw}
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleUsarDni}
                  className="mt-auto bg-gradient-to-r from-[#4F9BB6] to-[#4A6EB0] hover:from-[#3d8aa5] hover:to-[#3a5da0] text-white gap-2"
                >
                  Usar este N° de Documento
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-slate-200 text-slate-600 hover:bg-slate-100"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
