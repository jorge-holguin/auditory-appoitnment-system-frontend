import { format } from "date-fns"

const API_CITAS_URL = import.meta.env.VITE_API_CITAS_URL

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
  // Campos adicionales que pueda tener la API
  [key: string]: any
}

export interface BuscarCitasParams {
  desde: Date
  hasta: Date
  especialidad?: string
  medico?: string
  turnoConsulta?: string
  estadoAuditoria?: string // Filtro por estado de auditoría
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
    especialidad = "0019",
    medico,
    turnoConsulta,
    estadoAuditoria,
    page = 0,
    size = 20
  } = params

  // Formatear fechas como DD/MM/YYYY
  const desdeStr = format(desde, "dd/MM/yyyy")
  const hastaStr = format(hasta, "dd/MM/yyyy")

  // Agregar ceros al inicio de la especialidad si es necesario
  const especialidadFormatted = especialidad && especialidad !== "todos" 
    ? especialidad.padStart(4, "0") 
    : "0019"

  // Construir URL con parámetros
  // Siempre usar estado=4 (Atendido) para obtener citas que ya fueron atendidas
  const queryParams = new URLSearchParams({
    desde: desdeStr,
    hasta: hastaStr,
    especialidad: especialidadFormatted,
    estado: '4', // Siempre 4 = Atendido
    page: page.toString(),
    size: size.toString()
  })

  // Agregar parámetros opcionales si existen
  if (medico && medico !== "todos") {
    queryParams.append("medico", medico)
  }
  if (turnoConsulta && turnoConsulta !== "TODOS") {
    queryParams.append("turnoConsulta", turnoConsulta)
  }

  const url = `${API_CITAS_URL}/cita/buscar?${queryParams.toString()}`

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
    
    // Filtrar por estadoAuditoria si se especifica
    if (estadoAuditoria && estadoAuditoria !== "todos" && data.content) {
      data.content = data.content.filter((cita: Cita) => {
        // Si la cita no tiene estadoAuditoria, asumimos que es PENDIENTE
        const estado = cita.estadoAuditoria || "PENDIENTE"
        return estado === estadoAuditoria
      })
      data.totalElements = data.content.length
      data.totalPages = Math.ceil(data.content.length / size)
    }
    
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
 * Obtiene las especialidades disponibles en un rango de fechas
 */
export async function obtenerEspecialidadesPorFecha(fechaInicio: Date, fechaFin: Date): Promise<Especialidad[]> {
  // Formatear fechas como YYYY-MM-DD
  const fechaInicioStr = format(fechaInicio, "yyyy-MM-dd")
  const fechaFinStr = format(fechaFin, "yyyy-MM-dd")

  const url = `${API_CITAS_URL}/cita/especialidades?fechaInicio=${fechaInicioStr}&fechaFin=${fechaFinStr}`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "application/json"
      }
    })

    if (!response.ok) {
      throw new Error(`Error al obtener especialidades: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data
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
  clasificadorNombre: string
}

/**
 * Obtiene el número de cuenta asociado a una cita
 */
export async function obtenerCuentaPorCita(citaId: string): Promise<number> {
  const url = `${API_CITAS_URL}/trasnsversal/cuentadet/cuenta/cita/${citaId}`

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
  const url = `${API_CITAS_URL}/trasnsversal/cuentadet/cuenta/${cuentaId}/detallado`

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
 */
export async function eliminarItemLiquidacion(cuentaId: number, item: string, citaId: string): Promise<void> {
  const url = `${API_CITAS_URL}/trasnsversal/cuentadet/${cuentaId}/${item}/${citaId}`

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
