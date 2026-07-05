import { getAuthToken } from "@/lib/auth"

// ============================================================
// Supporting FHIR Primitive / Backbone Types
// ============================================================

export interface FhirMeta {
  lastUpdated?: string
  profile?: string[]
  tag?: FhirCoding[]
  versionId?: string
}

export interface FhirCoding {
  system?: string
  code?: string
  display?: string
  version?: string
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[]
  text?: string
}

export interface FhirIdentifier {
  use?: string
  system?: string
  value?: string
  type?: FhirCodeableConcept
}

export interface FhirHumanName {
  use?: string
  text?: string
  family?: string
  given?: string[]
  prefix?: string[]
  suffix?: string[]
}

export interface FhirReference {
  reference?: string
  type?: string
  display?: string
}

export interface FhirAddress {
  use?: string
  text?: string
  line?: string[]
  city?: string
  district?: string
  state?: string
  postalCode?: string
  country?: string
}

export interface FhirContactPoint {
  system?: string
  value?: string
  use?: string
}

export interface FhirAttachment {
  contentType?: string
  language?: string
  url?: string
  size?: number
  hash?: string
  title?: string
  creation?: string
}

export interface FhirLink {
  relation: string
  url: string
}

export interface FhirNarrative {
  status?: string
  div?: string
}

// ============================================================
// FHIR Resource Interfaces
// ============================================================

export interface FhirPatient {
  resourceType: "Patient"
  id?: string
  meta?: FhirMeta
  identifier?: FhirIdentifier[]
  active?: boolean
  name?: FhirHumanName[]
  telecom?: FhirContactPoint[]
  gender?: "male" | "female" | "other" | "unknown"
  birthDate?: string
  address?: FhirAddress[]
  text?: FhirNarrative
}

export interface FhirCompositionSection {
  title?: string
  code?: FhirCodeableConcept
  text?: FhirNarrative
  entry?: FhirReference[]
  section?: FhirCompositionSection[]
  emptyReason?: FhirCodeableConcept
}

export interface FhirComposition {
  resourceType: "Composition"
  id?: string
  meta?: FhirMeta
  status?: string
  type?: FhirCodeableConcept
  subject?: FhirReference
  date?: string
  author?: FhirReference[]
  title?: string
  confidentiality?: string
  section?: FhirCompositionSection[]
  text?: FhirNarrative
}

export interface FhirCondition {
  resourceType: "Condition"
  id?: string
  meta?: FhirMeta
  clinicalStatus?: FhirCodeableConcept
  verificationStatus?: FhirCodeableConcept
  category?: FhirCodeableConcept[]
  severity?: FhirCodeableConcept
  code?: FhirCodeableConcept
  subject?: FhirReference
  onsetDateTime?: string
  onsetString?: string
  abatementDateTime?: string
  recordedDate?: string
  note?: Array<{ text?: string }>
}

export interface FhirOrganization {
  resourceType: "Organization"
  id?: string
  meta?: FhirMeta
  identifier?: FhirIdentifier[]
  name?: string
  telecom?: FhirContactPoint[]
  address?: FhirAddress[]
}

export interface FhirPractitioner {
  resourceType: "Practitioner"
  id?: string
  meta?: FhirMeta
  identifier?: FhirIdentifier[]
  name?: FhirHumanName[]
  telecom?: FhirContactPoint[]
  qualification?: Array<{ code?: { text?: string } }>
}

export interface FhirDocumentContent {
  attachment?: FhirAttachment
  format?: FhirCoding
}

export interface FhirDocumentContext {
  period?: { start?: string; end?: string }
  practiceSetting?: FhirCodeableConcept
  facilityType?: FhirCodeableConcept
  sourcePatientInfo?: FhirReference
}

export type FhirResource =
  | FhirPatient
  | FhirComposition
  | FhirCondition
  | FhirOrganization
  | FhirPractitioner
  | FhirDocumentReference
  | { resourceType: string; id?: string; [key: string]: unknown }

export interface FhirBundleEntry {
  fullUrl?: string
  resource?: FhirResource
  search?: { mode?: string; score?: number }
}

export interface FhirBundle {
  resourceType: "Bundle"
  id?: string
  meta?: FhirMeta
  type?: string
  timestamp?: string
  total?: number
  link?: FhirLink[]
  entry?: FhirBundleEntry[]
}

export interface FhirDocumentReference {
  resourceType: "DocumentReference"
  id?: string
  meta?: FhirMeta
  masterIdentifier?: FhirIdentifier
  identifier?: FhirIdentifier[]
  status?: string
  docStatus?: string
  type?: FhirCodeableConcept
  category?: FhirCodeableConcept[]
  subject?: FhirReference
  date?: string
  author?: FhirReference[]
  custodian?: FhirReference
  content?: FhirDocumentContent[]
  context?: FhirDocumentContext
  contained?: FhirResource[]
  text?: FhirNarrative
}

// ============================================================
// Generic API Response Wrapper
// ============================================================

export interface FhirApiResponse<T = unknown> {
  ok: boolean
  operation: string
  message: string
  data: T
}

// ============================================================
// Document Search Response (ITI-67)
// ============================================================

export interface FhirDocumentSearchResponse {
  patientIdentifier?: string
  bundle: FhirBundle
}

// ============================================================
// Persistir Documento Request
// ============================================================

export interface PersistirDocumentoRequest {
  scusUuid?: string
  contentType?: string
  documentContentBase64?: string
  title?: string
  [key: string]: unknown
}

// ============================================================
// Internal HTTP helpers
// ============================================================

const API_FHIR_URL = import.meta.env.VITE_API_FHIR_URL || ""

function buildHeaders(): HeadersInit {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

async function parseResponse<T>(response: Response): Promise<FhirApiResponse<T>> {
  if (!response.ok) {
    let errorDetail = response.statusText
    try {
      const text = await response.text()
      if (text) errorDetail = text
    } catch {
      // ignore
    }
    throw new Error(`HTTP ${response.status}: ${errorDetail}`)
  }
  return response.json() as Promise<FhirApiResponse<T>>
}

// ============================================================
// Public Service Functions
// ============================================================

/**
 * ITI-67 – Busca DocumentReferences de un paciente.
 * GET /api/fhir/ips/documentos?patientIdentifier=...&status=...
 */
export async function getDocumentos(
  patientIdentifier: string,
  status?: string
): Promise<FhirApiResponse<FhirDocumentSearchResponse>> {
  const params = new URLSearchParams({ patientIdentifier })
  if (status) params.append("status", status)
  const response = await fetch(
    `${API_FHIR_URL}/api/fhir/ips/documentos?${params.toString()}`,
    { headers: buildHeaders() }
  )
  return parseResponse<FhirDocumentSearchResponse>(response)
}

/**
 * ITI-68 – Recupera un Bundle IPS por ID.
 * GET /api/fhir/ips/bundles/{id}
 */
export async function getBundle(id: string): Promise<FhirApiResponse<FhirBundle>> {
  const response = await fetch(
    `${API_FHIR_URL}/api/fhir/ips/bundles/${encodeURIComponent(id)}`,
    { headers: buildHeaders() }
  )
  return parseResponse<FhirBundle>(response)
}

/**
 * Obtiene la plantilla ITI-65 del servidor.
 * GET /api/fhir/ips/plantillas/iti65
 */
export async function getPlantillaIti65(): Promise<FhirApiResponse<unknown>> {
  const response = await fetch(
    `${API_FHIR_URL}/api/fhir/ips/plantillas/iti65`,
    { headers: buildHeaders() }
  )
  return parseResponse<unknown>(response)
}

/**
 * ITI-65 – Persiste un Bundle de documentos en el servidor.
 * POST /api/fhir/ips/documentos/persistir
 */
export async function persistirDocumento(
  body: unknown
): Promise<FhirApiResponse<unknown>> {
  const response = await fetch(
    `${API_FHIR_URL}/api/fhir/ips/documentos/persistir`,
    {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    }
  )
  return parseResponse<unknown>(response)
}
