import { useState, useEffect } from "react"
import { ComboboxSelect, type ComboboxOption } from "@/components/ui/ComboboxSelect"
import { obtenerEspecialidadesPorFecha, type EspecialidadSolicitud } from "@/services/citaService"

interface EspecialidadSimpleSelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  defaultOpen?: boolean
  fechaInicio?: string
  fechaFin?: string
}

export function EspecialidadSimpleSelector({ 
  value, 
  onChange, 
  label = "Especialidad",
  defaultOpen = false,
  fechaInicio,
  fechaFin
}: EspecialidadSimpleSelectorProps) {
  const [especialidades, setEspecialidades] = useState<EspecialidadSolicitud[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEspecialidades = async () => {
      if (!fechaInicio || !fechaFin) {
        setEspecialidades([])
        return
      }

      setLoading(true)
      setError(null)
      
      try {
        const data = await obtenerEspecialidadesPorFecha(fechaInicio, fechaFin)
        setEspecialidades(data)
      } catch (err) {
        console.error("Error cargando especialidades:", err)
        setError("Error al cargar especialidades")
        setEspecialidades([])
      } finally {
        setLoading(false)
      }
    }

    fetchEspecialidades()
  }, [fechaInicio, fechaFin])

  const options: ComboboxOption[] = [
    { value: "todos", label: "Todas" },
    ...especialidades.map(esp => ({
      value: esp.idEspecialidad,
      label: esp.nombre
    }))
  ]

  return (
    <ComboboxSelect
      value={value}
      onChange={onChange}
      options={options}
      label={label}
      placeholder={loading ? "Cargando..." : error || "Seleccione especialidad"}
      searchPlaceholder="Buscar especialidad..."
      disabled={loading || !!error}
      defaultOpen={defaultOpen}
    />
  )
}
