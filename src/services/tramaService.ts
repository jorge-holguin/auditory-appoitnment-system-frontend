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
}

export interface ListarFuasParams {
  fechaInicial: string // formato DD-MM-YYYY
  fechaFinal: string   // formato DD-MM-YYYY
  idOrigen: string
  idEstado: number
  idEspecialidad?: string
  turnoConsulta?: string // M = Mañana, T = Tarde
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
 * Lista FUAs con los filtros especificados
 */
export async function listarFuas(params: ListarFuasParams): Promise<Fua[]> {
  const queryParams = new URLSearchParams({
    fechaInicial: params.fechaInicial,
    fechaFinal: params.fechaFinal,
    idOrigen: params.idOrigen,
    idEstado: params.idEstado.toString()
  })

  // Agregar especialidad solo si está definida y no es "todos"
  if (params.idEspecialidad && params.idEspecialidad !== "todos") {
    queryParams.append("idEspecialidad", params.idEspecialidad)
  }

  // Agregar turno solo si está definido y no es "TODOS"
  if (params.turnoConsulta && params.turnoConsulta !== "TODOS") {
    queryParams.append("turnoConsulta", params.turnoConsulta)
  }

  const url = `${API_INTEROP_URL}/fua/listarFuas?${queryParams.toString()}`

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
