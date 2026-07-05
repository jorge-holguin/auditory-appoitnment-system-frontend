// Respuesta de generación del viewer cifrado
export interface ViewerResponse {
  viewerUrl: string
  keyId: string
  expiresInSeconds: number
}

// Contexto del profesional de salud (SIHCE)
export interface ProfessionalContext {
  tipoDocumento: string
  numeroDocumento: string
  nombreCompleto?: string
  ipressId: string
  ipressName: string
  system: string
}

// Estado del viewer
export type ViewerState =
  | "idle"
  | "validating"
  | "passcode_required"
  | "loading"
  | "ready"
  | "expired"
  | "revoked"
  | "error"

// Request para generar el viewer
export interface GenerateViewerRequest {
  sessionId: string
  token: string
  professionalContext: ProfessionalContext
  passcode?: string
}

// Validación del JWT del QR
export interface JwtValidationResponse {
  valid: boolean
  reason?: string
  sessionId?: string
  docRefs?: string[]
  consentId?: string
  expiresAt?: string
  scope?: string
}

// Payload decodificado del JWT del SHLink
export interface ShlinkJwtPayload {
  patient_ref?: string
  sub?: string
  aud?: string
  flag?: string
  max_uses?: number
  scope?: string
  iss?: string
  exp?: number
  iat?: number
  jti?: string
  doc_refs?: string[]
  consent_id?: string
}
