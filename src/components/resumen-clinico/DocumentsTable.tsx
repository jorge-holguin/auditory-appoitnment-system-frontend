import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Building2, Eye, FileText } from "lucide-react"
import type {
  FhirDocumentReference,
  FhirOrganization,
  FhirPractitioner,
} from "@/services/fhirIpsService"

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "—"
  try {
    return new Date(dateStr).toLocaleString("es-PE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateStr
  }
}

function getStatusBadgeClass(status?: string): string {
  switch (status?.toLowerCase()) {
    case "current":
      return "bg-green-100 text-green-800 border border-green-300"
    case "superseded":
      return "bg-yellow-100 text-yellow-800 border border-yellow-300"
    case "entered-in-error":
      return "bg-red-100 text-red-800 border border-red-300"
    default:
      return "bg-gray-100 text-gray-700 border border-gray-300"
  }
}

function getStatusLabel(status?: string): string {
  switch (status?.toLowerCase()) {
    case "current": return "Vigente"
    case "superseded": return "Reemplazado"
    case "entered-in-error": return "Error"
    default: return status ?? "—"
  }
}

function getContainedPractitioner(doc: FhirDocumentReference): FhirPractitioner | null {
  return (doc.contained?.find((r) => r.resourceType === "Practitioner") as FhirPractitioner | undefined) ?? null
}

function getContainedOrganization(doc: FhirDocumentReference): FhirOrganization | null {
  return (doc.contained?.find((r) => r.resourceType === "Organization") as FhirOrganization | undefined) ?? null
}

function getPractitionerName(p: FhirPractitioner | null): string {
  if (!p?.name?.length) return "—"
  const n = p.name[0]
  if (n.text) return n.text
  return `${(n.given ?? []).join(" ")} ${n.family ?? ""}`.trim() || "—"
}

function getPractitionerLabel(p: FhirPractitioner | null): string {
  if (!p?.identifier?.length) return ""
  const id = p.identifier[0]
  return `${id.type?.coding?.[0]?.display ?? "Doc"}: ${id.value ?? "—"}`
}

function getConsultorio(doc: FhirDocumentReference): string {
  return doc.context?.practiceSetting?.coding?.[0]?.display ?? "—"
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface DocumentsTableProps {
  documentos: FhirDocumentReference[]
  loading: boolean
  hasSearched: boolean
  totalDocs: number
  numeroDocumento: string
  onVerIps: (doc: FhirDocumentReference) => void
  onVerOrg: (org: FhirOrganization) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DocumentsTable({
  documentos,
  loading,
  hasSearched,
  totalDocs,
  numeroDocumento,
  onVerIps,
  onVerOrg,
}: DocumentsTableProps) {
  if (!hasSearched && !loading) return null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#9CD2D3]/30 overflow-hidden">
      {/* Cabecera */}
      <div className="px-6 py-4 border-b border-[#9CD2D3]/20 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#114C5F]">Documentos Clínicos</h2>
          {!loading && hasSearched && (
            <p className="text-xs text-[#114C5F]/50 mt-0.5">
              {totalDocs > 0
                ? `${totalDocs} documento${totalDocs !== 1 ? "s" : ""} encontrado${totalDocs !== 1 ? "s" : ""}`
                : "Sin resultados"}
            </p>
          )}
        </div>
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && documentos.length === 0 && hasSearched && (
        <div className="flex flex-col items-center justify-center py-16 text-[#114C5F]/40">
          <FileText className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">Sin documentos registrados</p>
          <p className="text-xs mt-1 opacity-75">
            No se encontraron DocumentReferences para{" "}
            <span className="font-mono">{numeroDocumento}</span>.
          </p>
        </div>
      )}

      {/* Tabla */}
      {!loading && documentos.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F8FAFB] border-b border-[#9CD2D3]/20 hover:bg-[#F8FAFB]">
                {["ID", "Paciente", "Médico", "Hospital de Origen", "Consultorio", "Estado", "Últ. Actualización", "Acciones"].map((col, i) => (
                  <TableHead
                    key={col}
                    className={`text-[#114C5F] font-semibold text-xs uppercase tracking-wider py-3 ${
                      i === 0 ? "pl-6 w-16" : i === 7 ? "text-center pr-6" : ""
                    } whitespace-nowrap`}
                  >
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentos.map((doc, idx) => {
                const practitioner = getContainedPractitioner(doc)
                const org = getContainedOrganization(doc)
                return (
                  <TableRow
                    key={doc.id ?? idx}
                    className="border-b border-[#9CD2D3]/10 hover:bg-[#9CD2D3]/5 transition-colors"
                  >
                    {/* ID */}
                    <TableCell className="py-3 pl-6">
                      <span className="text-sm font-mono font-semibold text-[#114C5F]">
                        {doc.id ?? "—"}
                      </span>
                    </TableCell>

                    {/* Paciente */}
                    <TableCell className="py-3">
                      <p className="text-sm font-medium text-[#114C5F] whitespace-nowrap">
                        {doc.subject?.display ?? "—"}
                      </p>
                      {doc.subject?.reference && (
                        <p className="text-xs text-[#114C5F]/40 mt-0.5 font-mono">
                          {doc.subject.reference}
                        </p>
                      )}
                    </TableCell>

                    {/* Médico */}
                    <TableCell className="py-3">
                      {practitioner ? (
                        <>
                          <p className="text-sm text-[#114C5F] font-medium whitespace-nowrap">
                            {getPractitionerName(practitioner)}
                          </p>
                          {getPractitionerLabel(practitioner) && (
                            <p className="text-xs text-[#114C5F]/50 mt-0.5">
                              {getPractitionerLabel(practitioner)}
                            </p>
                          )}
                          {practitioner.qualification?.[0]?.code?.text && (
                            <p className="text-xs text-[#4F9BB6]/70 mt-0.5">
                              {practitioner.qualification[0].code.text}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-[#114C5F]/30">—</span>
                      )}
                    </TableCell>

                    {/* Hospital */}
                    <TableCell className="py-3">
                      {org ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="text-sm text-[#114C5F]/80 truncate max-w-[140px]"
                            title={org.name}
                          >
                            {org.name ?? "—"}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 text-xs text-[#4F9BB6] hover:bg-[#4F9BB6]/10 flex-shrink-0 gap-1"
                            onClick={() => onVerOrg(org)}
                          >
                            <Building2 className="w-3 h-3" />
                            Ver más
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-[#114C5F]/30">
                          {doc.custodian?.display ?? "—"}
                        </span>
                      )}
                    </TableCell>

                    {/* Consultorio */}
                    <TableCell className="py-3">
                      <span
                        className="text-sm text-[#114C5F]/75 max-w-[140px] block truncate"
                        title={getConsultorio(doc)}
                      >
                        {getConsultorio(doc)}
                      </span>
                    </TableCell>

                    {/* Estado */}
                    <TableCell className="py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(doc.status)}`}
                      >
                        {getStatusLabel(doc.status)}
                      </span>
                    </TableCell>

                    {/* Última actualización */}
                    <TableCell className="py-3 text-sm text-[#114C5F]/75 whitespace-nowrap">
                      {formatDateTime(doc.meta?.lastUpdated)}
                    </TableCell>

                    {/* Acciones */}
                    <TableCell className="py-3 text-center pr-6">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#4F9BB6]/50 text-[#4F9BB6] hover:bg-[#4F9BB6]/10 hover:text-[#4F9BB6] gap-1.5 text-xs h-8 whitespace-nowrap"
                        onClick={() => onVerIps(doc)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver IPS
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
