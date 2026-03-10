const API_CITAS_URL = import.meta.env.VITE_API_CITAS_URL

export interface Observacion {
  idObservacion?: number
  idCita: string
  idSeccion: number
  descripcion: string
  fechaRegistro?: string
  usuarioRegistro: string
  estado?: string // 0=anulada, 1=activa, 2=subsanada
}

export interface CrearObservacionRequest {
  idCita: string
  idSeccion: number
  descripcion: string
  usuarioRegistro: string
}

/**
 * Mapeo de nombres de secciones a IDs de sección del backend
 */
export const SECCION_IDS = {
  OBSERVACION_funciones_vitales: 1,
  OBSERVACION_Atención_Principal_Motivo_Antecedentes: 2,
  OBSERVACION_diagnosticos: 3,
  OBSERVACION_destino: 4,
  OBSERVACION_farmacia: 5,
  OBSERVACION_laboratorio: 6,
  OBSERVACION_rayosx: 7,
  OBSERVACION_ecografia: 8,
  OBSERVACION_procedimientos: 9
} as const

/**
 * Obtiene las observaciones de una cita específica
 */
export async function obtenerObservacionesPorCita(idCita: string): Promise<Observacion[]> {
  const url = `${API_CITAS_URL}/observaciones/cita/${idCita}`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "*/*"
      }
    })

    if (!response.ok) {
      // Si es 404, significa que no hay observaciones aún
      if (response.status === 404) {
        return []
      }
      throw new Error(`Error al obtener observaciones: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error("Error en obtenerObservacionesPorCita:", error)
    // Retornar array vacío en caso de error para no romper el flujo
    return []
  }
}

/**
 * Crea una nueva observación
 */
export async function crearObservacion(request: CrearObservacionRequest): Promise<Observacion> {
  const url = `${API_CITAS_URL}/observaciones`

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "accept": "*/*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`Error al crear observación: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error en crearObservacion:", error)
    throw error
  }
}

/**
 * Edita una observación existente usando PUT
 */
export async function editarObservacion(
  idObservacion: number,
  request: CrearObservacionRequest
): Promise<Observacion> {
  const url = `${API_CITAS_URL}/observaciones/${idObservacion}`

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "accept": "*/*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`Error al editar observación: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error en editarObservacion:", error)
    throw error
  }
}

/**
 * Actualiza una observación existente (si el backend lo soporta)
 * Por ahora, creamos una nueva ya que el endpoint solo tiene POST
 * @deprecated Use editarObservacion instead
 */
export async function actualizarObservacion(
  idCita: string,
  idSeccion: number,
  descripcion: string,
  usuarioRegistro: string
): Promise<Observacion> {
  // Como solo tenemos POST, creamos una nueva observación
  return crearObservacion({
    idCita,
    idSeccion,
    descripcion,
    usuarioRegistro
  })
}

/**
 * Anula una observación (cambia estado a 0)
 * PUT /api/observaciones/{idObservacion}/estado?estado=0&usuario={usuario}
 */
export async function anularObservacion(idObservacion: number, usuario: string): Promise<void> {
  const url = `${API_CITAS_URL}/observaciones/${idObservacion}/estado?estado=0&usuario=${usuario}`

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "accept": "*/*"
      }
    })

    if (!response.ok) {
      throw new Error(`Error al anular observación: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error("Error en anularObservacion:", error)
    throw error
  }
}
