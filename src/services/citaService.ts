import { format } from "date-fns"

const API_BASE_URL = "http://192.168.0.252:9011/api"

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

  const url = `${API_BASE_URL}/cita/buscar?${queryParams.toString()}`

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
  const url = `${API_BASE_URL}/cita/${citaId}`

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
 * NOTA: Funciones de estado de auditoría comentadas porque el endpoint no existe
 * El estado se maneja localmente en el frontend
 */

// Funciones stub que no hacen llamadas al API
export async function aprobarCita(citaId: string): Promise<any> {
  console.log(`Cita ${citaId} marcada como APROBADA (local)`)
  return Promise.resolve({ success: true, estadoAuditoria: "APROBADO" })
}

export async function observarCita(citaId: string): Promise<any> {
  console.log(`Cita ${citaId} marcada como OBSERVADA (local)`)
  return Promise.resolve({ success: true, estadoAuditoria: "OBSERVADO" })
}

export async function revertirCita(citaId: string): Promise<any> {
  console.log(`Cita ${citaId} revertida a PENDIENTE (local)`)
  return Promise.resolve({ success: true, estadoAuditoria: "PENDIENTE" })
}

export async function marcarEnRevision(citaId: string): Promise<any> {
  console.log(`Cita ${citaId} marcada como EN_REVISION (local)`)
  return Promise.resolve({ success: true, estadoAuditoria: "EN_REVISION" })
}

/**
 * Obtiene las especialidades disponibles en un rango de fechas
 */
export async function obtenerEspecialidadesPorFecha(fechaInicio: Date, fechaFin: Date): Promise<Especialidad[]> {
  // Formatear fechas como YYYY-MM-DD
  const fechaInicioStr = format(fechaInicio, "yyyy-MM-dd")
  const fechaFinStr = format(fechaFin, "yyyy-MM-dd")

  const url = `${API_BASE_URL}/cita/especialidades?fechaInicio=${fechaInicioStr}&fechaFin=${fechaFinStr}`

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
  const url = `${API_BASE_URL}/cita/paciente-foto/${codigoPaciente}`

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
  const url = `${API_BASE_URL}/cexterna/atencion/atencion-completa/${atencionId}`

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
