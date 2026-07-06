import { useState, useCallback, useMemo } from "react"
import type {
  JwtValidationResponse,
  ShlinkJwtPayload,
  ViewerResponse,
  ProfessionalContext,
} from "@/models/viewerModels"

const SHLINK_AUTH_URL = import.meta.env.VITE_SHLINK_AUTH_URL ?? ""
const SHLINK_FHIR_URL = import.meta.env.VITE_SHLINK_FHIR_URL ?? ""

// ── Pure helpers ──────────────────────────────────────────────────────────────

/**
 * Decodifica el payload del JWT sin verificar la firma.
 * Usa la misma lógica que el servicio Angular (atob + reemplazo Base64URL).
 */
function decodeJwtPayload(token: string): ShlinkJwtPayload | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64)) as ShlinkJwtPayload
  } catch {
    return null
  }
}

/**
 * Extrae el JWT de una URL de tipo SHLink.
 * Soporta formatos:
 *   - https://...#shlink:/token=JWT&exp=...&flag=...
 *   - shlink:/token=JWT&exp=...
 *   - JWT directo (3 partes base64url separadas por puntos)
 */
export function extractShlinkToken(url: string): string | null {
  try {
    const trimmed = url.trim()

    // 1. Formato completo con #shlink:/token=...
    const hashIdx = trimmed.indexOf("#")
    if (hashIdx !== -1) {
      const fragment = trimmed.slice(hashIdx + 1)
      if (fragment.startsWith("shlink:/")) {
        const params = new URLSearchParams(fragment.replace(/^shlink:\//, ""))
        const token = params.get("token")
        if (token) return token
      }
    }

    // 2. Fragmento shlink:/ sin #
    const shlinkMatch = trimmed.match(/shlink:\/token=([^&\s]+)/)
    if (shlinkMatch?.[1]) return shlinkMatch[1]

    // 3. JWT directo embebido en cualquier parte del string
    const jwtMatch = trimmed.match(/\b([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/)
    if (jwtMatch?.[1]) {
      const parts = jwtMatch[1].split(".")
      if (parts.length === 3 && parts.every((p) => p.length > 0)) return jwtMatch[1]
    }

    return null
  } catch {
    return null
  }
}

/**
 * Extrae el patient_ref (DNI del paciente) del payload del JWT.
 */
export function extractPatientRef(token: string): string | null {
  const payload = decodeJwtPayload(token)
  return payload?.patient_ref ?? null
}

/**
 * Extrae el sessionId del claim sub con formato "session:{sessionId}".
 */
export function extractSessionId(token: string): string | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")))
    const sub = payload.sub as string
    if (sub?.startsWith("session:")) return sub.replace("session:", "")
    return sub || null
  } catch {
    return null
  }
}

/**
 * Devuelve true si el payload del JWT tiene flag === 'LP' (passcode requerido).
 */
export function requiresPasscode(token: string): boolean {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return false
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")))
    return payload.flag === "LP"
  } catch {
    return false
  }
}

/**
 * Extrae el claim exp y lo convierte a Date.
 */
export function extractExpiration(token: string): Date | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")))
    return payload.exp ? new Date(payload.exp * 1000) : null
  } catch {
    return null
  }
}

/**
 * Realiza POST a {authUrl}/shlink/validate con el body { token }.
 */
export async function validateToken(
  token: string,
  authUrl: string = SHLINK_AUTH_URL
): Promise<JwtValidationResponse> {
  const response = await fetch(`${authUrl}/shlink/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ token }),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => "")
    let reason: string | null = null
    try {
      const payload = JSON.parse(text) as { reason?: string; message?: string; error?: string }
      reason = payload.reason ?? payload.message ?? payload.error ?? null
    } catch { /* no JSON body */ }
    throw new Error(
      reason ?? (text ? `Error ${response.status}: ${text.slice(0, 200)}` : `Error validando token (HTTP ${response.status})`)
    )
  }
  return response.json() as Promise<JwtValidationResponse>
}

/**
 * Construye la URL completa del viewer a partir del viewerUrl relativo devuelto
 * por generate-viewer (p.ej. "/viewer?keyId=...").
 */
export function buildViewerUrl(viewerPath: string, fhirUrl: string = SHLINK_FHIR_URL): string {
  const normalizedPath = viewerPath.startsWith("/shlink") ? viewerPath : `/shlink${viewerPath}`
  return `${fhirUrl}${normalizedPath}`
}

/**
 * Rellena valores por defecto en el contexto profesional para que el backend
 * acepte la petición aunque el usuario no haya completado todos los campos.
 */
export function withDefaultProfessionalContext(
  prof: ProfessionalContext
): ProfessionalContext {
  return {
    ...prof,
    numeroDocumento: prof.numeroDocumento.trim() || "12345678",
    system: "sigsalud-react",
  }
}

/**
 * POST a {fhirUrl}/shlink/{sessionId}/generate-viewer con headers de autorización.
 * Equivale a ShlinkService.generateViewer() del servicio Angular.
 */
export async function generateViewer(
  sessionId: string,
  token: string,
  prof: ProfessionalContext,
  passcode?: string,
  fhirUrl: string = SHLINK_FHIR_URL
): Promise<ViewerResponse> {
  const context = withDefaultProfessionalContext(prof)
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "X-Professional-Context": JSON.stringify(context),
  }
  if (passcode) headers["X-Passcode"] = passcode

  const response = await fetch(`${fhirUrl}/shlink/${sessionId}/generate-viewer`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({}),
  })

  if (response.status === 403) throw new Error("QR expirado o autorización revocada")
  if (response.status === 401) throw new Error("Passcode incorrecto")
  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { message?: string }
    throw new Error(err?.message ?? `Error generando viewer (HTTP ${response.status})`)
  }
  return response.json() as Promise<ViewerResponse>
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseTokenAnalyzerResult {
  sessionId: string | null
  patientRef: string | null
  requiresPasscode: boolean
  expiration: Date | null
  isExpired: boolean
  validateToken: () => Promise<JwtValidationResponse>
  loading: boolean
  error: string | null
}

/**
 * Hook para analizar un JWT de SHLink sin verificar la firma.
 * @param token JWT extraído del QR (o null si no se ha escaneado aún)
 * @param authUrl URL base del auth-service (por defecto usa VITE_SHLINK_AUTH_URL)
 */
export function useTokenAnalyzer(
  token: string | null,
  authUrl: string = SHLINK_AUTH_URL
): UseTokenAnalyzerResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sessionId = useMemo(() => (token ? extractSessionId(token) : null), [token])
  const patientRef = useMemo(() => (token ? extractPatientRef(token) : null), [token])
  const needsPasscode = useMemo(() => (token ? requiresPasscode(token) : false), [token])
  const expiration = useMemo(() => (token ? extractExpiration(token) : null), [token])
  const isExpired = useMemo(
    () => (expiration ? expiration < new Date() : false),
    [expiration]
  )

  const handleValidate = useCallback(async (): Promise<JwtValidationResponse> => {
    if (!token) throw new Error("No hay token para validar")
    setLoading(true)
    setError(null)
    try {
      return await validateToken(token, authUrl)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error validando token"
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [token, authUrl])

  return {
    sessionId,
    patientRef,
    requiresPasscode: needsPasscode,
    expiration,
    isExpired,
    validateToken: handleValidate,
    loading,
    error,
  }
}
