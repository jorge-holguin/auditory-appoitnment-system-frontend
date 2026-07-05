import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  FileText,
  User,
} from "lucide-react"
import type {
  FhirBundle,
  FhirComposition,
  FhirCondition,
  FhirPatient,
  FhirResource,
} from "@/services/fhirIpsService"

interface BundleDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedBundle: FhirBundle | null
  loadingBundle: boolean
  errorBundle: string | null
}

function extractResourcesByType<T extends FhirResource>(
  bundle: FhirBundle,
  type: string
): T[] {
  if (!bundle.entry) return []
  return bundle.entry
    .map((e) => e.resource)
    .filter((r): r is T => r?.resourceType === type)
}

function getPatientFullName(patient: FhirPatient): string {
  if (!patient.name || patient.name.length === 0) return "Sin nombre"
  const name = patient.name[0]
  if (name.text) return name.text
  const given = (name.given ?? []).join(" ")
  const family = name.family ?? ""
  return `${given} ${family}`.trim() || "Sin nombre"
}

function getPatientDocumento(patient: FhirPatient): string {
  if (!patient.identifier || patient.identifier.length === 0) return "Sin documento"
  const dniId = patient.identifier.find(
    (id) =>
      id.system?.toLowerCase().includes("dni") ||
      id.type?.coding?.some(
        (c) =>
          c.code === "NI" ||
          c.code === "DNI" ||
          c.display?.toUpperCase().includes("DNI")
      )
  )
  return dniId?.value ?? patient.identifier[0]?.value ?? "Sin documento"
}

function getGenderLabel(gender?: string): string {
  switch (gender) {
    case "male":
      return "Masculino"
    case "female":
      return "Femenino"
    case "other":
      return "Otro"
    default:
      return "No especificado"
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—"
  try {
    return new Date(dateStr).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  } catch {
    return dateStr
  }
}

function DataField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#114C5F]/45 uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className="text-sm text-[#114C5F] font-medium">{value}</p>
    </div>
  )
}

function ConditionRow({
  condition,
  index,
}: {
  condition: FhirCondition
  index: number
}) {
  const cie10Code = condition.code?.coding?.[0]?.code ?? "—"
  const description =
    condition.code?.coding?.[0]?.display ??
    condition.code?.text ??
    "Sin descripción"
  const clinicalStatusCode = condition.clinicalStatus?.coding?.[0]?.code

  const onset = condition.onsetDateTime ?? condition.onsetString
  const recorded = condition.recordedDate

  return (
    <div className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50/60 transition-colors">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#4F9BB6]/10 text-[#4F9BB6] text-xs font-bold flex items-center justify-center mt-0.5">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-xs font-mono font-semibold text-[#4F9BB6] bg-[#4F9BB6]/8 px-1.5 py-0.5 rounded">
            {cie10Code}
          </span>
          {clinicalStatusCode && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                clinicalStatusCode === "active"
                  ? "bg-orange-50 text-orange-700 border-orange-200"
                  : clinicalStatusCode === "resolved"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-gray-50 text-gray-600 border-gray-200"
              }`}
            >
              {clinicalStatusCode}
            </span>
          )}
        </div>
        <p className="text-sm text-[#114C5F] leading-snug">{description}</p>
        {(onset ?? recorded) && (
          <p className="text-xs text-[#114C5F]/40 mt-0.5">
            {onset && <>Inicio: {formatDate(onset)}</>}
            {onset && recorded && " · "}
            {recorded && <>Registrado: {formatDate(recorded)}</>}
          </p>
        )}
      </div>
    </div>
  )
}

export function BundleDetailSheet({
  open,
  onOpenChange,
  selectedBundle,
  loadingBundle,
  errorBundle,
}: BundleDetailSheetProps) {
  const patient = selectedBundle
    ? extractResourcesByType<FhirPatient>(selectedBundle, "Patient")[0] ?? null
    : null

  const composition = selectedBundle
    ? extractResourcesByType<FhirComposition>(selectedBundle, "Composition")[0] ??
      null
    : null

  const allConditions = selectedBundle
    ? extractResourcesByType<FhirCondition>(selectedBundle, "Condition")
    : []

  const activeProblemsSection = composition?.section?.find(
    (s) =>
      s.code?.coding?.some((c) => c.code === "11450-4") ||
      s.title?.toLowerCase().includes("problem") ||
      s.title?.toLowerCase().includes("diagnos") ||
      s.title?.toLowerCase().includes("active")
  )

  const sectionConditionRefs =
    activeProblemsSection?.entry?.map((e) => e.reference ?? "") ?? []

  const displayConditions =
    sectionConditionRefs.length > 0
      ? allConditions.filter((c) =>
          sectionConditionRefs.some((ref) => ref.endsWith(c.id ?? "\x00"))
        )
      : allConditions

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 flex flex-col bg-white"
      >
        {/* Sticky header */}
        <SheetHeader className="px-6 py-5 border-b border-slate-100 bg-white sticky top-0 z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F9BB6] to-[#4A6EB0] flex items-center justify-center shadow-sm">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <SheetTitle className="text-[#114C5F] text-base leading-tight">
                Bundle IPS — Resumen del Paciente
              </SheetTitle>
              <SheetDescription className="text-xs text-[#114C5F]/50 mt-0.5">
                HL7 FHIR · International Patient Summary
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable body */}
        <ScrollArea className="flex-1 bg-white">
          <div className="px-6 py-5 space-y-5">
            {/* Loading skeletons */}
            {loadingBundle && (
              <div className="space-y-4">
                <Skeleton className="h-36 w-full rounded-xl" />
                <Skeleton className="h-52 w-full rounded-xl" />
              </div>
            )}

            {/* Error */}
            {!loadingBundle && errorBundle && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorBundle}</span>
              </div>
            )}

            {/* Bundle content */}
            {!loadingBundle && !errorBundle && selectedBundle && (
              <>
                {/* ── Tarjeta: Filiación del Paciente ──────────── */}
                {patient ? (
                  <div className="rounded-xl border border-[#9CD2D3]/40 overflow-hidden bg-white">
                    <div className="px-4 py-3 bg-gradient-to-r from-[#EBF6FA] to-[#EEF0FA] border-b border-[#9CD2D3]/25 flex items-center gap-2">
                      <User className="w-4 h-4 text-[#4F9BB6]" />
                      <h3 className="text-sm font-semibold text-[#114C5F] flex-1">
                        Filiación del Paciente
                      </h3>
                      <span className="text-xs text-[#4F9BB6] bg-[#4F9BB6]/10 px-2 py-0.5 rounded-full font-mono">
                        Patient
                      </span>
                    </div>
                    <div className="px-4 py-4 grid grid-cols-2 gap-x-6 gap-y-4">
                      <DataField
                        label="Nombre Completo"
                        value={getPatientFullName(patient)}
                      />
                      <DataField
                        label="DNI / Identificador"
                        value={getPatientDocumento(patient)}
                      />
                      <DataField
                        label="Género"
                        value={getGenderLabel(patient.gender)}
                      />
                      <DataField
                        label="Fecha de Nacimiento"
                        value={formatDate(patient.birthDate)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[#9CD2D3]/50 px-4 py-5 flex items-center gap-3 text-[#114C5F]/40 text-sm bg-white">
                    <User className="w-4 h-4" />
                    <span>No se encontró recurso Patient en este Bundle.</span>
                  </div>
                )}

                {/* ── Tarjeta: Resumen Clínico / Problemas activos ── */}
                <div className="rounded-xl border border-[#9CD2D3]/40 overflow-hidden bg-white">
                  <div className="px-4 py-3 bg-gradient-to-r from-[#EBF6FA] to-[#EEF0FA] border-b border-[#9CD2D3]/25 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#4F9BB6]" />
                    <h3 className="text-sm font-semibold text-[#114C5F] flex-1">
                      Resumen Clínico — Problemas Activos
                    </h3>
                    <span className="text-xs text-[#4F9BB6] bg-[#4F9BB6]/10 px-2 py-0.5 rounded-full font-mono">
                      Composition
                    </span>
                  </div>

                  {composition && (
                    <div className="px-4 py-2.5 border-b border-[#9CD2D3]/15 bg-slate-50/60">
                      <p className="text-xs text-[#114C5F]/55">
                        <span className="font-medium">Documento: </span>
                        {composition.title ?? "Sin título"}
                        {composition.date && (
                          <>
                            {" · "}
                            <span className="font-medium">Fecha: </span>
                            {formatDate(composition.date)}
                          </>
                        )}
                      </p>
                    </div>
                  )}

                  {!composition && (
                    <div className="px-4 py-3 border-b border-[#9CD2D3]/15 bg-amber-50/60">
                      <p className="text-xs text-amber-600">
                        No se encontró recurso Composition en este Bundle.
                        Mostrando todas las Conditions.
                      </p>
                    </div>
                  )}

                  <div className="divide-y divide-[#9CD2D3]/12">
                    {displayConditions.length === 0 ? (
                      <div className="flex items-center gap-2 px-4 py-8 text-[#114C5F]/35 justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm">
                          Sin problemas activos registrados
                        </span>
                      </div>
                    ) : (
                      displayConditions.map((cond, i) => (
                        <ConditionRow key={cond.id ?? i} condition={cond} index={i} />
                      ))
                    )}
                  </div>
                </div>

                {/* Footer informativo */}
                <p className="text-xs text-[#114C5F]/35 text-center pb-2">
                  Bundle con {selectedBundle.entry?.length ?? 0} recursos FHIR
                  {selectedBundle.total !== undefined &&
                    ` · total declarado: ${selectedBundle.total}`}
                </p>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
