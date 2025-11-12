import { useState, useEffect } from "react"
import { ComboboxSelect, type ComboboxOption } from "@/components/ui/ComboboxSelect"

interface EstadoPaquete {
  id: number
  nombre: string
}

interface EstadoPaqueteSelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

export function EstadoPaqueteSelector({ value, onChange, label = "Estado del Paquete" }: EstadoPaqueteSelectorProps) {
  const [estados, setEstados] = useState<EstadoPaquete[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEstados = async () => {
      try {
        setLoading(true)
        const response = await fetch("http://192.168.0.252:9004/interoperabilidadsis/api/v1/estadoPaquete")
        const result = await response.json()
        
        if (result.success) {
          setEstados(result.data)
        } else {
          setError("Error al cargar estados de paquete")
        }
      } catch (err) {
        setError("Error de conexión")
        console.error("Error fetching estados paquete:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchEstados()
  }, [])

  const options: ComboboxOption[] = [
    { value: "todos", label: "Todos" },
    ...estados.map(estado => ({
      value: estado.id.toString(),
      label: estado.nombre
    }))
  ]

  return (
    <ComboboxSelect
      value={value}
      onChange={onChange}
      options={options}
      label={label}
      placeholder={loading ? "Cargando..." : error || "Seleccione estado"}
      searchPlaceholder="Buscar estado..."
      disabled={loading || !!error}
    />
  )
}
