const API_INTEROP_URL = import.meta.env.VITE_API_INTEROP_URL

export interface Fua {
  id: string
  idCuenta?: string
  numeroFua: string
  paciente: string
  hc: string
  tipoAtencion: string
  especialidad: string
  idEspecialidadSgh?: string
  nombreEspecialidad?: string
  estado: string
  fechaAtencion: string
  medico?: string // Nombre del médico
  firmado?: boolean // Indica si el FUA está firmado digitalmente
  auditorApepaterno?: string | null
  auditorApematerno?: string | null
  auditorNombres?: string | null
}

export interface ListarFuasParams {
  fechaInicial: string // formato DD-MM-YYYY
  fechaFinal: string   // formato DD-MM-YYYY
  idOrigen: string
  idEstado: number
  idEspecialidades?: string[]        // forma nueva (preferida): array de IDs
  idEspecialidad?: string | string[] // legacy: acepta string único o array por compat con código viejo
  turnoConsulta?: string // M = Mañana, T = Tarde
  firmado?: string // FIRMADO, NO_FIRMADO, TODOS
  usuarioAuditoria?: string // DNI del auditor
}

export interface DescargarZipRequest {
  idsAtencion: string[]
  idPaqueteSis: string
  crearPaqueteDb: boolean
  fechaInicio: string // formato DD-MM-YYYY
  fechaFin: string     // formato DD-MM-YYYY
  especialidad: string
}

/**
 * Normaliza cualquier entrada de especialidades a un array limpio de strings únicos.
 * Acepta: string, string[], undefined, null.
 */
function normalizeEspecialidades(
  idEspecialidades?: string[],
  idEspecialidad?: string | string[]
): string[] {
  const resultado: string[] = []

  const push = (valor: unknown) => {
    if (typeof valor === "string" && valor.trim() !== "" && !resultado.includes(valor)) {
      resultado.push(valor.trim())
    }
  }

  if (Array.isArray(idEspecialidades)) {
    idEspecialidades.forEach(push)
  }
  if (Array.isArray(idEspecialidad)) {
    idEspecialidad.forEach(push)
  } else {
    push(idEspecialidad)
  }

  return resultado
}

/**
 * Lista FUAs con los filtros especificados.
 * Acepta tanto `idEspecialidades` (array) como `idEspecialidad` (legacy) y normaliza
 * para enviar siempre como `idEspecialidades=XXX&idEspecialidades=YYY` (parámetros repetidos).
 */
export async function listarFuas(params: ListarFuasParams): Promise<Fua[]> {
  const especialidades = normalizeEspecialidades(params.idEspecialidades, params.idEspecialidad)

  const parts: string[] = [
    `fechaInicial=${encodeURIComponent(params.fechaInicial)}`,
    `fechaFinal=${encodeURIComponent(params.fechaFinal)}`,
    `idOrigen=${encodeURIComponent(params.idOrigen)}`,
  ]

  // idEspecialidades como parámetros repetidos: ?idEspecialidades=1091&idEspecialidades=0904
  for (const esp of especialidades) {
    parts.push(`idEspecialidades=${encodeURIComponent(esp)}`)
  }

  parts.push(`idEstado=${encodeURIComponent(params.idEstado.toString())}`)

  if (params.turnoConsulta && params.turnoConsulta !== "TODOS") {
    parts.push(`turnoConsulta=${encodeURIComponent(params.turnoConsulta)}`)
  }

  if (params.firmado && params.firmado !== "TODOS") {
    parts.push(`firmado=${params.firmado === "FIRMADO" ? "true" : "false"}`)
  }

  if (params.usuarioAuditoria && params.usuarioAuditoria.trim() !== "") {
    parts.push(`usuarioAuditoria=${encodeURIComponent(params.usuarioAuditoria.trim())}`)
  }

  const url = `${API_INTEROP_URL}/fua/listarFuas?${parts.join("&")}`

  // DEBUG: log de normalización para verificar que siempre se envía correctamente
  console.log("[listarFuas v5] params recibidos:", {
    idEspecialidades: params.idEspecialidades,
    idEspecialidad: params.idEspecialidad,
  })
  console.log("[listarFuas v5] especialidades normalizadas:", especialidades)
  console.log("[listarFuas v5] URL final:", url)

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "application/json"
      }
    })

    if (!response.ok) {
      throw new Error(`Error al listar FUAs: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // Asegurarse de que siempre devolvemos un array
    if (Array.isArray(data)) {
      return data
    } else if (data && Array.isArray(data.content)) {
      return data.content
    } else if (data && Array.isArray(data.data)) {
      return data.data
    } else {
      console.warn("Respuesta de API no es un array:", data)
      return []
    }
  } catch (error) {
    console.error("Error en listarFuas:", error)
    throw error
  }
}

export interface DescargarZipResponse {
  blob: Blob
  idPaquete: string
  nombreArchivo: string
}

// ===== NUEVO FLUJO: /trama/procesar-lote =====
// Reemplaza a descargarZip + enviarPaqueteAlSis. El backend expone un
// procesamiento asíncrono con un idProceso que se consulta por polling.

export interface ProcesarLoteRequest {
  idsAtencion: string[]
  fechaInicio: string // DD-MM-YYYY
  fechaFin: string    // DD-MM-YYYY
  crearPaqueteDb: boolean
  especialidad: string
  idPaqueteSis: string
  subirASis: boolean
  usuario: string // documento obtenido del JWT
}

export interface ProcesoEstadoResponse {
  idProceso: string
  estado: string            // PENDIENTE | EN_PROCESO | COMPLETADO | ERROR | etc.
  mensaje: string | null
  error: string | null
  idPaqueteSis: string | null
  numeroPaquete: string | null
  nombreArchivo: string | null
  etapaActual: string | null
  porcentaje: number        // 0..100
  totalIds: number
  procesados: number
  observados: number
  listoParaDescargar: boolean
  enviadoASis: boolean
  // Campos opcionales que el backend puede incluir al completar
  errores?: ErrorDetalle[]
  detalleErrores?: ErrorDetalle[]
}

/**
 * Inicia el procesamiento asíncrono de un lote de atenciones.
 * Retorna un idProceso con el cual se consulta el avance.
 */
export async function procesarLote(request: ProcesarLoteRequest): Promise<ProcesoEstadoResponse> {
  const url = `${API_INTEROP_URL}/trama/procesar-lote`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "accept": "*/*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  })

  const text = await response.text()
  let data: ProcesoEstadoResponse
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Respuesta inválida del servidor al iniciar proceso: ${text.substring(0, 200)}`)
  }

  if (!response.ok) {
    const msg = data?.error || data?.mensaje || `HTTP ${response.status}`
    throw new Error(`Error al iniciar procesamiento: ${msg}`)
  }

  return data
}

/**
 * Consulta el estado/avance de un proceso de lote por su idProceso.
 */
export async function obtenerEstadoProceso(idProceso: string): Promise<ProcesoEstadoResponse> {
  const url = `${API_INTEROP_URL}/trama/procesar-lote/${encodeURIComponent(idProceso)}`

  const response = await fetch(url, {
    method: "GET",
    headers: { "accept": "*/*" },
  })

  const text = await response.text()
  let data: ProcesoEstadoResponse
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Respuesta inválida del servidor al consultar proceso: ${text.substring(0, 200)}`)
  }

  if (!response.ok) {
    const msg = data?.error || data?.mensaje || `HTTP ${response.status}`
    throw new Error(`Error al consultar estado del proceso: ${msg}`)
  }

  return data
}

/**
 * Indica si un estado de proceso es terminal (no habrá más polling).
 */
export function esEstadoTerminal(estado: string | undefined): boolean {
  if (!estado) return false
  const e = estado.toUpperCase()
  return (
    e === "COMPLETADO" ||
    e === "COMPLETED" ||
    e === "FINALIZADO" ||
    e === "TERMINADO" ||
    e === "ERROR" ||
    e === "FALLIDO" ||
    e === "FAILED" ||
    e === "OBSERVADO" ||
    e === "CANCELADO"
  )
}

/**
 * Descarga un archivo ZIP con las tramas de los FUAs seleccionados
 */
export async function descargarZip(request: DescargarZipRequest): Promise<DescargarZipResponse> {
  const url = `${API_INTEROP_URL}/trama/descargar-zip`

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`Error al descargar ZIP: ${response.status} ${response.statusText}`)
    }

    // Extraer nombre del archivo desde content-disposition
    const contentDisposition = response.headers.get('content-disposition')
    let nombreArchivo = 'paquete.zip'
    let idPaquete = 'UNKNOWN'
    
    if (contentDisposition) {
      // Formato: attachment; filename=0000594720251100036.zip
      const matches = /filename=([^\s;]+)/.exec(contentDisposition)
      if (matches?.[1]) {
        nombreArchivo = matches[1]
        
        // Extraer idPaquete del nombre del archivo
        // Formato: 00005947{idPaquete}.zip
        // Ejemplo: 0000594720251100036.zip -> idPaquete = 20251100036
        const fileNameMatch = /00005947(\d+)\.zip/.exec(nombreArchivo)
        if (fileNameMatch?.[1]) {
          idPaquete = fileNameMatch[1]
        }
      }
    }
    
    const blob = await response.blob()
    
    return {
      blob,
      idPaquete,
      nombreArchivo
    }
  } catch (error) {
    console.error("Error en descargarZip:", error)
    throw error
  }
}

export interface ErrorDetalle {
  id: string
  errores: string[]
}

export interface RespuestaSis {
  estado: string
  mensaje: string
  errores?: ErrorDetalle[]
}

/**
 * Envía un paquete ZIP al SIS usando FormData
 */
export async function enviarPaqueteAlSis(blob: Blob, nombreArchivo: string): Promise<RespuestaSis> {
  const url = `${API_INTEROP_URL}/conecta-sis/cargar-zip`

  try {
    // Crear FormData y agregar el archivo como binario
    const formData = new FormData()
    const file = new File([blob], nombreArchivo, { type: 'application/zip' })
    formData.append('archivoZip', file)

    const response = await fetch(url, {
      method: "POST",
      body: formData
      // No establecer Content-Type, fetch lo hará automáticamente con el boundary correcto
    })

    // Obtener el texto de la respuesta primero
    const responseText = await response.text()
    
    // Intentar parsear como JSON
    try {
      // Primero intentar parsear directamente
      const data: RespuestaSis = JSON.parse(responseText)
      
      // Si el servidor responde con error, devolver la respuesta con errores
      if (!response.ok || data.estado === 'error') {
        return data
      }

      return data
    } catch (jsonError) {
      // Si no se puede parsear directamente, intentar extraer JSON del texto
      console.error("Error al parsear respuesta JSON directamente:", jsonError)
      console.error("Respuesta del servidor:", responseText)
      
      // Buscar un objeto JSON dentro del texto (puede tener prefijo como "Error al subir paquete: ")
      const jsonMatch = responseText.match(/\{.*\}$/s)
      if (jsonMatch) {
        try {
          const extractedData: RespuestaSis = JSON.parse(jsonMatch[0])
          console.log("JSON extraído exitosamente:", extractedData)
          
          // Si el servidor responde con error, devolver la respuesta con errores
          if (!response.ok || extractedData.estado === 'error') {
            return extractedData
          }
          
          return extractedData
        } catch (extractError) {
          console.error("Error al parsear JSON extraído:", extractError)
        }
      }
      
      // Si no se puede extraer JSON válido, devolver un objeto de error estructurado
      return {
        estado: 'error',
        mensaje: `Error al procesar la respuesta del servidor: ${responseText.substring(0, 200)}`,
        errores: []
      }
    }
  } catch (error) {
    console.error("Error en enviarPaqueteAlSis:", error)
    // Devolver un objeto de error estructurado en lugar de lanzar
    return {
      estado: 'error',
      mensaje: error instanceof Error ? error.message : 'Error desconocido al enviar el paquete',
      errores: []
    }
  }
}

/**
 * Actualiza el estado de un paquete en el SIS
 */
export async function actualizarEstadoPaqueteSis(idPaquete: string, nuevoEstado: string = 'ENVIADO'): Promise<void> {
  const url = `${API_INTEROP_URL}/paquete-sis/estado/${idPaquete}?nuevoEstado=${nuevoEstado}`

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      }
    })

    if (!response.ok) {
      throw new Error(`Error al actualizar estado del paquete: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error("Error en actualizarEstadoPaqueteSis:", error)
    throw error
  }
}

/**
 * Obtiene el nombre del archivo desde los headers de respuesta
 */
export function obtenerNombreArchivo(headers: Headers): string {
  const contentDisposition = headers.get('content-disposition')
  let fileName = 'paquete.zip'

  if (contentDisposition) {
    const matches = /filename="?([^"]+)"?/.exec(contentDisposition)
    if (matches?.[1]) {
      fileName = matches[1]
    }
  }

  return fileName
}

/**
 * Descarga un blob como archivo
 */
export function descargarBlob(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

export interface Origen {
  id: string
  descripcion: string
}

export interface EstadoAtencion {
  id: string
  descripcion: string
}

/**
 * Obtiene los orígenes disponibles
 */
export async function obtenerOrigenes(): Promise<Origen[]> {
  const url = `${API_INTEROP_URL}/origen`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "application/json"
      }
    })

    if (!response.ok) {
      throw new Error(`Error al obtener orígenes: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // Asegurarse de que siempre devolvemos un array
    if (Array.isArray(data)) {
      return data
    } else if (data && Array.isArray(data.data)) {
      return data.data
    } else {
      console.warn("Respuesta de orígenes no es un array:", data)
      return []
    }
  } catch (error) {
    console.error("Error en obtenerOrigenes:", error)
    throw error
  }
}

/**
 * Obtiene los estados de atención por fase
 */
export async function obtenerEstadosAtencion(fase: number = 1): Promise<EstadoAtencion[]> {
  const url = `${API_INTEROP_URL}/estadoAtencion/fase?fase=${fase}`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "application/json"
      }
    })

    if (!response.ok) {
      throw new Error(`Error al obtener estados: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // Asegurarse de que siempre devolvemos un array
    if (Array.isArray(data)) {
      return data
    } else if (data && Array.isArray(data.data)) {
      return data.data
    } else {
      console.warn("Respuesta de estados no es un array:", data)
      return []
    }
  } catch (error) {
    console.error("Error en obtenerEstadosAtencion:", error)
    throw error
  }
}

/**
 * Elimina una atención individual del SIS
 * DELETE /api/v1/conecta-sis/atencion/{fua}
 */
export async function eliminarAtencionSis(fua: string): Promise<void> {
  const url = `${API_INTEROP_URL}/conecta-sis/atencion/${fua}`

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "accept": "*/*"
    }
  })

  if (!response.ok) {
    throw new Error(`Error al eliminar atención: ${response.status} ${response.statusText}`)
  }
}

/**
 * Elimina un paquete completo y todas sus atenciones del SIS
 * DELETE /api/v1/conecta-sis/paquete/{numeroPaquete}/atenciones?usuario={usuario}
 */
export async function eliminarPaqueteSis(numeroPaquete: string, usuario: string): Promise<void> {
  const url = `${API_INTEROP_URL}/conecta-sis/paquete/${numeroPaquete}/atenciones?usuario=${usuario}`

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "accept": "*/*"
    }
  })

  if (!response.ok) {
    throw new Error(`Error al eliminar paquete: ${response.status} ${response.statusText}`)
  }
}

/**
 * Reconstruye el ZIP de un paquete ya existente.
 * GET /api/v1/trama/reconstruir-zip/{numeroPaquete}
 */
export async function reconstruirZipPaquete(numeroPaquete: string): Promise<Blob> {
  const url = `${API_INTEROP_URL}/trama/reconstruir-zip/${encodeURIComponent(numeroPaquete)}`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "accept": "*/*"
    }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Error al reconstruir paquete: ${response.status} ${response.statusText} - ${text}`)
  }

  return await response.blob()
}
