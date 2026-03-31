import { useState, useEffect, useRef } from "react"
import { ComboboxSelect, type ComboboxOption } from "@/components/ui/ComboboxSelect"

const API_INTEROP_URL = import.meta.env.VITE_API_INTEROP_URL || "http://192.168.0.252:9004/interoperabilidadsis/api/v1"

interface Especialidad {
  id: string
  descripcion: string
  idEspecialidadSgh: string
}

interface EspecialidadSimpleSelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  defaultOpen?: boolean
}

export function EspecialidadSimpleSelector({ 
  value, 
  onChange, 
  label = "Especialidad",
  defaultOpen = false
}: EspecialidadSimpleSelectorProps) {
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    // Evitar llamadas duplicadas (StrictMode en desarrollo)
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true

    const fetchEspecialidades = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`${API_INTEROP_URL}/especialidad`)
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`)
        }
        const result = await response.json()
        if (result.success && result.data) {
          setEspecialidades(result.data)
        } else {
          setEspecialidades([])
        }
      } catch (err) {
        console.error("Error cargando especialidades:", err)
        setError("Error al cargar especialidades")
        setEspecialidades([])
      } finally {
        setLoading(false)
      }
    }

    fetchEspecialidades()
  }, [])

  const options: ComboboxOption[] = especialidades.map(esp => ({
    value: esp.idEspecialidadSgh,
    label: esp.descripcion
  }))

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
