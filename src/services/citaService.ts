import { format } from "date-fns"

const API_CITAS_URL = import.meta.env.VITE_API_CITAS_URL

/**
 * Convierte el estado de auditoría string a número
 */
function getEstadoNumero(estadoAuditoria: string): number {
  switch (estadoAuditoria) {
    case "PENDIENTE":
      return 1
    case "EN_REVISION":
      return 2
    case "APROBADO":
      return 3
    case "OBSERVADO":
      return 4
    case "SUBSANADO":
      return 5
    case "COMPLETADO":
      return 6
    case "OBSERVADO_SIS":
      return 7
    case "ENVIADO":
      return 8
    default:
      return 1
  }
}

/**
 * Convierte el estado de auditoría numérico a string
 * Acepta tanto números como strings
 */
export function getEstadoString(estadoAuditoria: number | string | null | undefined): string {
  // Convertir a número si es string
  const estado = typeof estadoAuditoria === 'string' ? parseInt(estadoAuditoria, 10) : estadoAuditoria
  
  if (estado === null || estado === undefined || isNaN(estado) || estado === 1) {
    return "PENDIENTE"
  }
  switch (estado) {
    case 2:
      return "EN_REVISION"
    case 3:
      return "APROBADO"
    case 4:
      return "OBSERVADO"
    case 5:
      return "SUBSANADO"
    case 6:
      return "COMPLETADO"
    case 7:
      return "OBSERVADO_SIS"
    case 8:
      return "ENVIADO"
    default:
      return "PENDIENTE"
  }
}

export interface Especialidad {
  idEspecialidad: string
  nombre: string
  cantidad?: number
}

export interface CitaResponse {
  content: Cita[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export interface Cita {
  citaId: string
  paciente: string
  pacienteId?: string // ID del paciente desde vista auditoría
  nombre: string
  consultorio: string
  consultorioNombre: string
  medico: string
  medicoNombre: string
  fecha: string
  hora: string
  estado: string // Estado de la API (4 = Atendido)
  estadoAuditoria?: string // Estado de auditoría (PENDIENTE, EN_REVISION, APROBADO, OBSERVADO)
  especialidad?: string
  firmado?: boolean // Indica si el FUA está firmado digitalmente
  auditorApepaterno?: string | null
  auditorApematerno?: string | null
  auditorNombres?: string | null
  numAtencion?: string // N° FUA de la atención (ej: "000059472600041488")
  numeroFua?: string   // Alias alternativo del n° FUA, por compat
  historia?: string    // N° historia clínica (formato antiguo)
  numeroHistoria?: string // N° historia clínica desde vista auditoría
  // Campos adicionales que pueda tener la API
  [key: string]: any
}

export interface BuscarCitasParams {
  desde: Date
  hasta: Date
  especialidad?: string
  especialidades?: string[] // Múltiples especialidades (usa especialidadSolicitudArray)
  medico?: string
  turnoConsulta?: string
  estadoAuditoria?: string // Filtro por estado de auditoría
  sis?: boolean // Filtrar solo seguros SIS (por defecto true)
  page?: number
  size?: number
}

/**
 * Busca citas en el sistema con los filtros especificados
 */
export async function buscarCitas(params: BuscarCitasParams): Promise<CitaResponse> {
  const {
    desde,
    hasta,
    especialidad,
    especialidades,
    medico,
    turnoConsulta,
    estadoAuditoria,
    sis = true,
    page = 0,
    size = 20
  } = params

  // Formatear fechas como DD/MM/YYYY
  const desdeStr = format(desde, "dd/MM/yyyy")
  const hastaStr = format(hasta, "dd/MM/yyyy")

  // Construcción explícita del query string para soportar
  // especialidadSolicitudArray como parámetros repetidos
  const parts: string[] = [
    `desde=${encodeURIComponent(desdeStr)}`,
    `hasta=${encodeURIComponent(hastaStr)}`,
    `estado=4`, // Siempre 4 = Atendido
    `sis=${sis.toString()}`,
    `page=${page.toString()}`,
    `size=${size.toString()}`,
  ]

  // Si se provee array de especialidades, usar especialidadSolicitudArray
  // (parámetros repetidos). Si no, caer al parámetro singular.
  const especialidadesValidas = (especialidades || [])
    .filter(e => e && e.trim() !== "" && e !== "todos")
    .map(e => e.padStart(4, "0"))

  if (especialidadesValidas.length > 0) {
    for (const esp of especialidadesValidas) {
      parts.push(`especialidadSolicitudArray=${encodeURIComponent(esp)}`)
    }
  } else if (especialidad && especialidad !== "todos") {
    parts.push(`especialidadSolicitud=${encodeURIComponent(especialidad.padStart(4, "0"))}`)
  }

  // Agregar parámetros opcionales si existen
  if (medico && medico !== "todos") {
    parts.push(`medico=${encodeURIComponent(medico)}`)
  }
  if (turnoConsulta && turnoConsulta !== "TODOS") {
    parts.push(`turnoConsulta=${encodeURIComponent(turnoConsulta)}`)
  }
  if (estadoAuditoria && estadoAuditoria !== "todos") {
    // Convertir el estado string a número para el API
    const estadoNum = getEstadoNumero(estadoAuditoria)
    parts.push(`estadoAuditoria=${estadoNum.toString()}`)
  }

  const url = `${API_CITAS_URL}/cita-auditoria/buscar?${parts.join("&")}`
  console.log("[buscarCitas] (vista auditoría) especialidades:", especialidadesValidas, "URL:", url)

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "application/json"
      }
    })

    if (!response.ok) {
      throw new Error(`Error al buscar citas: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // Asignar estadoAuditoria PENDIENTE a las citas que no lo tengan
    if (data.content) {
      data.content = data.content.map((cita: Cita) => ({
        ...cita,
        estadoAuditoria: cita.estadoAuditoria || "PENDIENTE"
      }))
    }
    
    return data
  } catch (error) {
    console.error("Error en buscarCitas:", error)
    throw error
  }
}

/**
 * Obtiene el detalle de una cita específica
 */
export async function obtenerDetalleCita(citaId: string): Promise<any> {
  const url = `${API_CITAS_URL}/cita/${citaId}`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "application/json"
      }
    })

    if (!response.ok) {
      throw new Error(`Error al obtener detalle de cita: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error en obtenerDetalleCita:", error)
    throw error
  }
}

/**
 * Busca una cita específica por su ID
 * Usa el endpoint: /api/cita/{citaId}
 */
export async function buscarCitaPorId(citaId: string): Promise<Cita> {
  const url = `${API_CITAS_URL}/cita/${citaId}`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "application/json"
      }
    })

    if (!response.ok) {
      throw new Error(`Error al buscar cita por ID: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    // Asignar estadoAuditoria PENDIENTE si no lo tiene
    return {
      ...data,
      estadoAuditoria: data.estadoAuditoria || "PENDIENTE"
    }
  } catch (error) {
    console.error("Error en buscarCitaPorId:", error)
    throw error
  }
}

/**
 * Obtiene el DNI del usuario desde el token JWT
 */
function obtenerUsuarioDNI(): string {
  try {
    const authToken = localStorage.getItem('authToken')
    if (!authToken) {
      console.warn('No se encontró authToken en localStorage')
      return ''
    }
    
    const tokenParts = authToken.split('.')
    if (tokenParts.length !== 3) {
      console.warn('Token JWT no tiene el formato correcto')
      return ''
    }
    
    const payload = JSON.parse(atob(tokenParts[1]))
    return payload.sub || ''
  } catch (error) {
    console.error('Error al extraer el DNI del token:', error)
    return ''
  }
}

/**
 * Cambia el estado de auditoría de una cita
 * Estados:
 * - null o 1: PENDIENTE
 * - 2: EN REVISION
 * - 3: APROBADO
 * - 4: OBSERVADO
 * - 5: SUBSANADO
 */
async function cambiarEstadoAuditoria(citaId: string, estadoAuditoria: string): Promise<any> {
  const usuario = obtenerUsuarioDNI()
  if (!usuario) {
    throw new Error('No se pudo obtener el DNI del usuario del token')
  }

  const url = `${API_CITAS_URL}/cita/${citaId}/auditoria-estado?estadoAuditoria=${estadoAuditoria}&usuario=${usuario}`

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "accept": "application/json"
      }
    })

    if (!response.ok) {
      throw new Error(`Error al cambiar estado de auditoría: ${response.status} ${response.statusText}`)
    }

    return { success: true, estadoAuditoria }
  } catch (error) {
    console.error("Error en cambiarEstadoAuditoria:", error)
    throw error
  }
}

/**
 * Marca una cita como APROBADA (estado 3)
 */
export async function aprobarCita(citaId: string): Promise<any> {
  return cambiarEstadoAuditoria(citaId, "3")
}

/**
 * Marca una cita como OBSERVADA (estado 4)
 */
export async function observarCita(citaId: string): Promise<any> {
  return cambiarEstadoAuditoria(citaId, "4")
}

/**
 * Revierte una cita a PENDIENTE (estado 1)
 */
export async function revertirCita(citaId: string): Promise<any> {
  return cambiarEstadoAuditoria(citaId, "1")
}

/**
 * Marca una cita como EN_REVISION (estado 2)
 */
export async function marcarEnRevision(citaId: string): Promise<any> {
  return cambiarEstadoAuditoria(citaId, "2")
}

/**
 * Marca una cita como SUBSANADA (estado 5)
 */
export async function subsanarCita(citaId: string): Promise<any> {
  return cambiarEstadoAuditoria(citaId, "5")
}

/**
 * Interface para especialidad por solicitud
 */
export interface EspecialidadSolicitud {
  idEspecialidad: string
  nombre: string
}

/**
 * Obtiene las especialidades disponibles para un rango de fechas
 * GET /api/cita/especialidades-solicitud?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD
 */
export async function obtenerEspecialidadesPorFecha(fechaInicio: string, fechaFin: string): Promise<EspecialidadSolicitud[]> {
  const url = `${API_CITAS_URL}/cita/especialidades-solicitud?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "*/*"
      }
    })

    if (!response.ok) {
      throw new Error(`Error al obtener especialidades: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error("Error en obtenerEspecialidadesPorFecha:", error)
    throw error
  }
}

/**
 * Obtiene los datos del paciente con foto
 */
export async function obtenerPacienteConFoto(codigoPaciente: string): Promise<any> {
  const url = `${API_CITAS_URL}/cita/paciente-foto/${codigoPaciente}`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "application/json"
      }
    })

    if (!response.ok) {
      throw new Error(`Error al obtener paciente: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error en obtenerPacienteConFoto:", error)
    throw error
  }
}

/**
 * Obtiene la atención completa por su ID
 */
export async function obtenerAtencionCompleta(atencionId: string): Promise<any> {
  const url = `${API_CITAS_URL}/cexterna/atencion/atencion-completa/${atencionId}`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "application/json"
      }
    })

    if (!response.ok) {
      throw new Error(`Error al obtener atención completa: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error en obtenerAtencionCompleta:", error)
    throw error
  }
}

/**
 * Interfaz para el detalle de liquidación
 */
export interface DetalleLiquidacion {
  item: string
  cuentaId: number
  itemNombre: string
  clasificador: string
  fecha: string
  estado: string
  precio: number
  cpms: string | null
  cantidad: number
  total: number
  importe: number
  descuento: number
  codcpt: string | null
  cpt: string | null
  clasificadorNombre: string
  ordenId?: string
}

/**
 * Obtiene el número de cuenta asociado a una cita
 */
export async function obtenerCuentaPorCita(citaId: string): Promise<number> {
  const url = `${API_CITAS_URL}/transversal/cuentadet/cuenta/cita/${citaId}`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "*/*"
      }
    })

    if (!response.ok) {
      throw new Error(`Error al obtener cuenta: ${response.status} ${response.statusText}`)
    }

    const cuentaId = await response.json()
    return cuentaId
  } catch (error) {
    console.error("Error en obtenerCuentaPorCita:", error)
    throw error
  }
}

/**
 * Obtiene el detalle de liquidación de una cuenta
 */
export async function obtenerDetalleLiquidacion(cuentaId: number): Promise<DetalleLiquidacion[]> {
  const url = `${API_CITAS_URL}/transversal/cuentadet/cuenta/${cuentaId}/detallado`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "*/*"
      }
    })

    if (!response.ok) {
      throw new Error(`Error al obtener detalle de liquidación: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error en obtenerDetalleLiquidacion:", error)
    throw error
  }
}

/**
 * Elimina un item de la liquidación
 * DELETE /api/transversal/cuentadet?cuentaid=X&item=Y&ordenid=Z
 */
export async function eliminarItemLiquidacion(cuentaId: number, item: string, ordenId: string): Promise<void> {
  const queryParams = new URLSearchParams({
    cuentaid: cuentaId.toString(),
    item: item.trim(),
    ordenid: ordenId.trim()
  })
  const url = `${API_CITAS_URL}/transversal/cuentadet?${queryParams.toString()}`

  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "accept": "*/*"
      }
    })

    if (!response.ok) {
      throw new Error(`Error al eliminar item de liquidación: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error("Error en eliminarItemLiquidacion:", error)
    throw error
  }
}

/**
 * Obtiene el ID de cita a partir del número de atención (FUA)
 * Usa el endpoint: /api/seguros/atenciones/cita-id?numatencion=XXX
 */
export async function obtenerCitaIdPorNumAtencion(numatencion: string): Promise<string> {
  const url = `${API_CITAS_URL}/seguros/atenciones/cita-id?numatencion=${encodeURIComponent(numatencion)}`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "*/*"
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`No se encontró una cita para el FUA ${numatencion}`)
      }
      throw new Error(`Error al obtener cita ID por numatencion: ${response.status} ${response.statusText}`)
    }

    const text = await response.text()
    const citaId = text.trim()
    if (!citaId) {
      throw new Error(`No se encontró una cita para el FUA ${numatencion}`)
    }
    return citaId
  } catch (error) {
    console.error("Error en obtenerCitaIdPorNumAtencion:", error)
    throw error
  }
}

/**
 * Busca una cita por idcita usando query param (vista auditoría)
 * Usa el endpoint: /api/cita-auditoria/buscar/idcita?idcita=XXX
 *
 * Normaliza la respuesta de la nueva vista (camelCase con campos
 * pacienteId, pacienteNombre, numeroFua, numeroHistoria, auditorNombre, etc.)
 * manteniendo los campos legacy para compatibilidad con el resto del código.
 */
export async function buscarCitaPorIdQuery(idcita: string): Promise<Cita> {
  const url = `${API_CITAS_URL}/cita-auditoria/buscar/idcita?idcita=${encodeURIComponent(idcita)}`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "application/json"
      }
    })

    if (!response.ok) {
      throw new Error(`Error al buscar cita por idcita: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Mapear/normalizar al shape Cita usado en todo el frontend.
    // Se conservan los nombres nuevos y además se exponen aliases legacy
    // (paciente, nombre, historia, numAtencion, medico, consultorio, especialidad)
    // para no romper componentes que aún leen los antiguos.
    const normalized: Cita = {
      ...data,
      // IDs
      citaId: data.citaId,
      paciente: data.pacienteId?.toString().trim() ?? data.paciente ?? "",
      pacienteId: data.pacienteId?.toString().trim() ?? data.pacienteId,
      medico: data.medicoId?.toString().trim() ?? data.medico ?? "",
      consultorio: data.consultorioId?.toString().trim() ?? data.consultorio ?? "",
      especialidad: data.especialidadId?.toString().trim() ?? data.especialidad,
      // Nombres
      nombre: data.pacienteNombre?.toString().trim() ?? data.nombre ?? "",
      medicoNombre: data.medicoNombre?.toString().trim() ?? "",
      consultorioNombre: data.consultorioNombre?.toString().trim() ?? "",
      // Datos de cita
      fecha: data.fecha,
      hora: data.hora?.toString().trim(),
      estado: data.estado?.toString() ?? "",
      estadoAuditoria: data.estadoAuditoria?.toString() || "1",
      // FUA / Historia
      numAtencion: data.numeroFua?.toString().trim() ?? data.numAtencion,
      numeroFua: data.numeroFua?.toString().trim() ?? data.numeroFua,
      historia: data.numeroHistoria?.toString().trim() ?? data.historia,
      numeroHistoria: data.numeroHistoria?.toString().trim() ?? data.numeroHistoria,
      // Auditor: la nueva API entrega un único string concatenado.
      // Lo colocamos en auditorNombres para que la concatenación posterior
      // (apepaterno + apematerno + nombres) siga mostrándolo correctamente.
      auditorNombres: data.auditorNombre ?? data.auditorNombres ?? null,
      auditorApepaterno: data.auditorApepaterno ?? null,
      auditorApematerno: data.auditorApematerno ?? null,
      // Firmado
      firmado: !!data.firmado,
    }

    return normalized
  } catch (error) {
    console.error("Error en buscarCitaPorIdQuery:", error)
    throw error
  }
}

/**
 * Obtiene el ID de cita a partir del ID de atención seguro
 * Usa el endpoint: /api/cita/{idAtencionSeguro}/cita-id-fua
 */
export async function obtenerCitaIdPorAtencion(idAtencionSeguro: string): Promise<string> {
  const url = `${API_CITAS_URL}/cita/${idAtencionSeguro}/cita-id-fua`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "*/*"
      }
    })

    if (!response.ok) {
      throw new Error(`Error al obtener cita ID: ${response.status} ${response.statusText}`)
    }

    const citaId = await response.text()
    return citaId.trim()
  } catch (error) {
    console.error("Error en obtenerCitaIdPorAtencion:", error)
    throw error
  }
}

/**
 * Elimina firmas de documentos observados por auditoría
 * POST /ConsultaExterna/deleteObservados
 */
export async function deleteObservados(
  citaId: string,
  observacion: string,
  usuarioElimina: string
): Promise<void> {
  const API_CONSULTA_EXTERNA_URL = import.meta.env.VITE_CONSULTA_EXTERNA_URL
  const url = `${API_CONSULTA_EXTERNA_URL}/deleteObservados`

  const requestBody = {
    documentos: [
      { idDocumento: citaId, idTipoDocumento: 9 },   // Atención
      { idDocumento: citaId, idTipoDocumento: 10 },  // FUA
      { idDocumento: citaId, idTipoDocumento: 11 }   // Liquidación
    ],
    observacion,
    usuarioElimina
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`Error al eliminar observados: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error("Error en deleteObservados:", error)
    throw error
  }
}
