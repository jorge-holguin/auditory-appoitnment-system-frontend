import { useState, useEffect, useRef } from "react"
import { ComboboxSelect } from "@/components/ui/ComboboxSelect"

interface Medico {
  nombre: string // Código del médico
  medicoId: string // Nombre completo del médico
}

interface MedicoSelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  fechaInicio?: Date
  fechaFin?: Date
  idEspecialidad?: string
  idEspecialidadSolicitud?: string 
}

const API_CITAS_URL = import.meta.env.VITE_API_CITAS_URL

async function obtenerMedicosPorFecha(fechaInicio: Date, fechaFin: Date, idEspecialidadSolicitud: string): Promise<Medico[]> {
  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const url = `${API_CITAS_URL}/cita/medicos?fechaInicio=${formatDate(fechaInicio)}&fechaFin=${formatDate(fechaFin)}&idEspecialidadSolicitud=${idEspecialidadSolicitud}`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "application/json"
      }
    })

    if (!response.ok) {
      throw new Error(`Error al obtener médicos: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error en obtenerMedicosPorFecha:", error)
    throw error
  }
}

export function MedicoSelector({ 
  value, 
  onChange, 
  label = "Médico",
  fechaInicio,
  fechaFin,
  idEspecialidadSolicitud = "1091"
}: MedicoSelectorProps) {
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastFetchRef = useRef<string>('')

  const cargarMedicos = async () => {
    if (!fechaInicio || !fechaFin || !idEspecialidadSolicitud) return

    // Crear una clave única para esta petición
    const fetchKey = `${fechaInicio.toISOString()}-${fechaFin.toISOString()}-${idEspecialidadSolicitud}`
    
    // Si ya se hizo esta petición, no la repetimos
    if (lastFetchRef.current === fetchKey) {
      return
    }
    
    lastFetchRef.current = fetchKey
    setLoading(true)
    setError(null)

    try {
      const data = await obtenerMedicosPorFecha(fechaInicio, fechaFin, idEspecialidadSolicitud)
      setMedicos(data)
    } catch (err) {
      setError("Error al cargar médicos")
      console.error("Error al cargar médicos:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (fechaInicio && fechaFin && idEspecialidadSolicitud) {
      // Pequeño delay para evitar múltiples llamadas rápidas
      const timer = setTimeout(() => {
        cargarMedicos()
      }, 100)
      
      return () => clearTimeout(timer)
    } else {
      setMedicos([])
      setError(null)
      lastFetchRef.current = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaInicio, fechaFin, idEspecialidadSolicitud])

  const options = [
    { value: "todos", label: "Todos los médicos" },
    ...medicos.map(m => ({
      value: m.nombre, // Código del médico
      label: `${m.medicoId} (${m.nombre})` // Nombre completo (código)
    }))
  ]

  return (
    <ComboboxSelect
      options={options}
      value={value}
      onChange={onChange}
      label={label}
      placeholder={loading ? "Cargando médicos..." : error ? "Error al cargar" : "Seleccione un médico"}
      disabled={loading || !!error || !fechaInicio || !fechaFin}
    />
  )
}
