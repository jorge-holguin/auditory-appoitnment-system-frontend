const API_CITAS_URL = import.meta.env.VITE_API_CITAS_URL

export interface CitaReporte {
  citaId: string
  fecha: string
  hora: string
  paciente: string
  pacienteNombre: string
  numeroHistoria: string
  turnoConsulta: string
  estado: string
  usuario: string
  estadoAuditoria: string
  usuarioAuditoria: string | null
  consultorio: string
  consultorioNombre: string
  medicoNombre: string
  especialidadNombre: string
  auditorNombre: string
  atencionSeguroId?: string
  numeroFua: string
}

export interface ListarCitasReporteParams {
  fechaInicio: string  // formato dd/MM/yyyy
  fechaFin: string     // formato dd/MM/yyyy
  especialidades?: string  // separadas por coma: "1091,1092"
  estadosAuditoria?: string // separados por coma: "6"
}

/**
 * Lista citas por rango de fechas para reportes
 */
export async function listarCitasReporte(params: ListarCitasReporteParams): Promise<CitaReporte[]> {
  const queryParams = new URLSearchParams({
    fechaInicio: params.fechaInicio,
    fechaFin: params.fechaFin,
  })

  if (params.especialidades && params.especialidades.trim() !== "") {
    queryParams.append("especialidades", params.especialidades)
  }

  if (params.estadosAuditoria && params.estadosAuditoria.trim() !== "") {
    queryParams.append("estadosAuditoria", params.estadosAuditoria)
  }

  const url = `${API_CITAS_URL}/seguros/atenciones/citas-por-fecha?${queryParams.toString()}`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "*/*"
      }
    })

    if (!response.ok) {
      throw new Error(`Error al listar citas: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()

    if (result.success && Array.isArray(result.data)) {
      return result.data
    } else if (Array.isArray(result)) {
      return result
    } else {
      console.warn("Respuesta de reporte no es un array:", result)
      return []
    }
  } catch (error) {
    console.error("Error en listarCitasReporte:", error)
    throw error
  }
}

/**
 * Descarga el reporte de citas en formato Excel
 */
export async function descargarExcelReporte(params: ListarCitasReporteParams): Promise<void> {
  const queryParams = new URLSearchParams({
    fechaInicio: params.fechaInicio,
    fechaFin: params.fechaFin,
  })

  if (params.especialidades && params.especialidades.trim() !== "") {
    queryParams.append("especialidades", params.especialidades)
  }

  if (params.estadosAuditoria && params.estadosAuditoria.trim() !== "") {
    queryParams.append("estadosAuditoria", params.estadosAuditoria)
  }

  const url = `${API_CITAS_URL}/seguros/atenciones/citas-por-fecha/excel?${queryParams.toString()}`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }
    })

    if (!response.ok) {
      throw new Error(`Error al descargar Excel: ${response.status} ${response.statusText}`)
    }

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `reporte_citas_${params.fechaInicio.replace(/\//g, '-')}_${params.fechaFin.replace(/\//g, '-')}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(downloadUrl)
  } catch (error) {
    console.error("Error en descargarExcelReporte:", error)
    throw error
  }
}
