import { useState, useEffect, useRef } from "react"
import { ComboboxSelect, type ComboboxOption } from "@/components/ui/ComboboxSelect"
import { obtenerEspecialidadesPorFecha, type Especialidad } from "@/services/citaService"

interface EspecialidadSelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  fechaInicio?: Date
  fechaFin?: Date
}

export function EspecialidadSelector({ 
  value, 
  onChange, 
  label = "Especialidad",
  fechaInicio,
  fechaFin
}: EspecialidadSelectorProps) {
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastFetchRef = useRef<string>('')

  const cargarEspecialidades = async () => {
    if (!fechaInicio || !fechaFin) return

    // Crear una clave única para esta petición
    const fetchKey = `${fechaInicio.toISOString()}-${fechaFin.toISOString()}`
    
    // Si ya se hizo esta petición, no la repetimos
    if (lastFetchRef.current === fetchKey) {
      return
    }
    
    lastFetchRef.current = fetchKey
    setLoading(true)
    setError(null)

    try {
      const data = await obtenerEspecialidadesPorFecha(fechaInicio, fechaFin)
      setEspecialidades(data)
    } catch (err) {
      setError("Error al cargar especialidades")
      console.error("Error al cargar especialidades:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (fechaInicio && fechaFin) {
      // Pequeño delay para evitar múltiples llamadas rápidas
      const timer = setTimeout(() => {
        cargarEspecialidades()
      }, 100)
      
      return () => clearTimeout(timer)
    } else {
      setEspecialidades([])
      setError(null)
      lastFetchRef.current = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaInicio, fechaFin])

  const options: ComboboxOption[] = [
    { value: "todos", label: "Todas" },
    ...Array.from(
      new Map(
        especialidades
          .filter(e => e && e.idEspecialidad && e.nombre)
          .map((e) => {
            const val = String(e.idEspecialidad).trim()
            const label = String(e.nombre).trim() + (e.cantidad ? ` (${e.cantidad})` : "")
            return [val, { value: val, label } as ComboboxOption]
          })
      ).values()
    )
  ]

  const getPlaceholder = () => {
    if (!fechaInicio || !fechaFin) {
      return "Primero seleccione un rango de fechas"
    }
    if (loading) {
      return "Cargando especialidades..."
    }
    if (error) {
      return error
    }
    return "Seleccione especialidad"
  }

  return (
    <ComboboxSelect
      value={value}
      onChange={onChange}
      options={options}
      label={label}
      placeholder={getPlaceholder()}
      searchPlaceholder="Buscar especialidad..."
      disabled={!fechaInicio || !fechaFin || loading || !!error || options.length <= 1}
    />
  )
}
