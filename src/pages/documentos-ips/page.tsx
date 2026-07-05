import { useState, useCallback, useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { HospitalDetailDialog } from "@/components/modals/HospitalDetailDialog"
import { BundleDetailSheet } from "@/components/modals/BundleDetailSheet"
import { DocumentsTable } from "@/components/resumen-clinico/DocumentsTable"
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Search,
  SendHorizonal,
  X,
} from "lucide-react"
import {
  getDocumentos,
  getBundle,
  getPlantillaIti65,
  persistirDocumento,
  type FhirBundle,
  type FhirDocumentReference,
  type FhirDocumentSearchResponse,
  type FhirResource,
  type FhirOrganization,
} from "@/services/fhirIpsService"

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractResourcesByType<T extends FhirResource>(bundle: FhirBundle, type: string): T[] {
  if (!bundle.entry) return []
  return bundle.entry.map((e) => e.resource).filter((r): r is T => r?.resourceType === type)
}

function extractBundleId(url?: string): string | null {
  if (!url) return null
  const match = url.match(/Bundle\/([^/?#]+)/)
  return match ? match[1] : null
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DocumentosIpsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Search form
  const [tipoDoc, setTipoDoc] = useState<"DNI" | "CE">("DNI")
  const [numDoc, setNumDoc] = useState(searchParams.get("documento") || "")

  // Results
  const [documentos, setDocumentos] = useState<FhirDocumentReference[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [totalDocs, setTotalDocs] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Bundle sheet
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedBundle, setSelectedBundle] = useState<FhirBundle | null>(null)
  const [loadingBundle, setLoadingBundle] = useState(false)
  const [errorBundle, setErrorBundle] = useState<string | null>(null)

  // Hospital dialog
  const [selectedOrg, setSelectedOrg] = useState<FhirOrganization | null>(null)

  // ITI-65 dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [plantilla, setPlantilla] = useState("")
  const [loadingPlantilla, setLoadingPlantilla] = useState(false)
  const [persistiendo, setPersistiendo] = useState(false)
  const [persistResult, setPersistResult] = useState<{ ok: boolean; message: string } | null>(null)

  const lastAutoRef = useRef<string | null>(null)

  // Auto-search from URL param
  useEffect(() => {
    const doc = searchParams.get("documento")
    if (!doc?.trim() || lastAutoRef.current === doc) return
    lastAutoRef.current = doc
    setNumDoc(doc)
    buscarDocumentos(doc)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // ── Handlers ──────────────────────────────────────────────

  const buscarDocumentos = useCallback(async (override?: string) => {
    const n = (override ?? numDoc).trim()
    if (!n) return
    setSearchParams({ documento: n }, { replace: true })
    setLoading(true)
    setError(null)
    setDocumentos([])
    setHasSearched(true)
    setTotalDocs(0)
    try {
      const resp = await getDocumentos(n)
      if (!resp.ok) throw new Error(resp.message || "Error al consultar documentos")
      const bundle = (resp.data as FhirDocumentSearchResponse).bundle
      const docs = extractResourcesByType<FhirDocumentReference>(bundle, "DocumentReference")
      setDocumentos(docs)
      setTotalDocs(bundle.total ?? docs.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al buscar documentos")
    } finally {
      setLoading(false)
    }
  }, [numDoc, setSearchParams])

  const handleVerIps = useCallback(async (docRef: FhirDocumentReference) => {
    const bundleId = extractBundleId(docRef.content?.[0]?.attachment?.url)
    setSelectedBundle(null)
    setErrorBundle(null)
    setSheetOpen(true)
    if (!bundleId) { setErrorBundle("No se encontró referencia al Bundle IPS."); return }
    setLoadingBundle(true)
    try {
      const resp = await getBundle(bundleId)
      if (!resp.ok) throw new Error(resp.message || "Error al cargar el Bundle IPS")
      setSelectedBundle(resp.data as FhirBundle)
    } catch (err) {
      setErrorBundle(err instanceof Error ? err.message : "Error al cargar el Bundle")
    } finally {
      setLoadingBundle(false)
    }
  }, [])

  const handleAbrirIti65 = useCallback(async () => {
    setDialogOpen(true)
    setPersistResult(null)
    setPlantilla("")
    setLoadingPlantilla(true)
    try {
      const resp = await getPlantillaIti65()
      setPlantilla(resp.data != null ? JSON.stringify(resp.data, null, 2) : "")
    } catch (err) {
      setPlantilla(`// Error al cargar la plantilla:\n// ${err instanceof Error ? err.message : ""}`)
    } finally {
      setLoadingPlantilla(false)
    }
  }, [])

  const handlePersistir = useCallback(async () => {
    setPersistiendo(true)
    setPersistResult(null)
    try {
      const resp = await persistirDocumento(JSON.parse(plantilla))
      setPersistResult({ ok: resp.ok, message: resp.message || (resp.ok ? "Persistido exitosamente." : "Error al persistir.") })
    } catch (err) {
      setPersistResult({ ok: false, message: err instanceof Error ? err.message : "Error desconocido al persistir." })
    } finally {
      setPersistiendo(false)
    }
  }, [plantilla])

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#9CD2D3]/30 px-6 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F9BB6] to-[#4A6EB0] flex items-center justify-center shadow-sm">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#114C5F] leading-tight">Documentos IPS</h1>
            <p className="text-xs text-[#114C5F]/50">BÚSQUEDA · IHE MHD · HL7 FHIR R4</p>
          </div>
        </div>
        <Button onClick={handleAbrirIti65} variant="outline" size="sm" className="border-[#4F9BB6]/70 text-[#4F9BB6] hover:bg-[#4F9BB6]/10 gap-2 flex-shrink-0">
          <SendHorizonal className="w-3.5 h-3.5" /> Simular ITI-65
        </Button>
      </div>

      {/* Search form */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#9CD2D3]/30 px-6 py-5">
        <p className="text-sm font-semibold text-[#114C5F] mb-4">Buscar por documento del paciente</p>
        <div className="flex gap-3 items-end">
          <div className="w-32 flex-shrink-0">
            <Label className="text-xs font-medium text-[#114C5F]/70 mb-1.5 block">Tipo</Label>
            <Select value={tipoDoc} onValueChange={(v) => setTipoDoc(v as "DNI" | "CE")}>
              <SelectTrigger className="h-10 text-sm border-[#9CD2D3]/60"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DNI">DNI</SelectItem>
                <SelectItem value="CE">Carné de Extranjería</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 max-w-xs">
            <Label className="text-xs font-medium text-[#114C5F]/70 mb-1.5 block">Número de documento</Label>
            <Input
              placeholder="Ej: 46970797"
              value={numDoc}
              onChange={(e) => setNumDoc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscarDocumentos()}
              className="h-10 text-sm border-[#9CD2D3]/60"
            />
          </div>
          <Button
            onClick={() => buscarDocumentos()}
            disabled={loading || !numDoc.trim()}
            className="h-10 bg-gradient-to-r from-[#4F9BB6] to-[#4A6EB0] hover:from-[#3d8aa5] hover:to-[#3a5da0] text-white gap-2 px-6"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Buscando…</> : <><Search className="w-4 h-4" /> Buscar</>}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Results */}
      <DocumentsTable
        documentos={documentos}
        loading={loading}
        hasSearched={hasSearched}
        totalDocs={totalDocs}
        numeroDocumento={numDoc}
        onVerIps={handleVerIps}
        onVerOrg={(org) => setSelectedOrg(org)}
      />

      {/* Bundle Sheet */}
      <BundleDetailSheet open={sheetOpen} onOpenChange={setSheetOpen} selectedBundle={selectedBundle} loadingBundle={loadingBundle} errorBundle={errorBundle} />

      {/* Hospital Dialog */}
      <HospitalDetailDialog open={!!selectedOrg} onOpenChange={(open) => { if (!open) setSelectedOrg(null) }} org={selectedOrg} />

      {/* ITI-65 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!persistiendo) setDialogOpen(o) }}>
        <DialogContent className="max-w-3xl w-full">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F9BB6] to-[#4A6EB0] flex items-center justify-center shadow-sm">
                <SendHorizonal className="w-4 h-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-[#114C5F] text-base leading-tight">Simular Envío ITI-65</DialogTitle>
                <DialogDescription className="text-xs text-[#114C5F]/50 mt-0.5">Provide Document Bundle · IHE MHD Transaction</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {loadingPlantilla ? (
            <div className="flex items-center justify-center py-12 gap-3 text-[#4F9BB6]">
              <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Cargando plantilla ITI-65…</span>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-[#114C5F] text-sm font-medium">Cuerpo del Bundle (JSON editable)</Label>
              <textarea value={plantilla} onChange={(e) => setPlantilla(e.target.value)} className="w-full h-72 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#4F9BB6]/30 resize-none text-slate-700 leading-relaxed" spellCheck={false} />
            </div>
          )}
          {persistResult && (
            <div className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${persistResult.ok ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
              {persistResult.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              <span>{persistResult.message}</span>
            </div>
          )}
          <DialogFooter className="gap-2 pt-1">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={persistiendo} className="border-slate-200 text-slate-600">Cancelar</Button>
            <Button onClick={handlePersistir} disabled={persistiendo || loadingPlantilla || !plantilla.trim()} className="bg-gradient-to-r from-[#4F9BB6] to-[#4A6EB0] hover:from-[#3d8aa5] hover:to-[#3a5da0] text-white gap-2">
              {persistiendo ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</> : <><SendHorizonal className="w-4 h-4" /> Enviar y Persistir</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
