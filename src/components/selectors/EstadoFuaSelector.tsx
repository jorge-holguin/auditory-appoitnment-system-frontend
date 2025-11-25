import { ComboboxSelect, type ComboboxOption } from "@/components/ui/ComboboxSelect"
import { useCatalogos } from "@/contexts/CatalogosContext"

interface EstadoFuaSelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

export function EstadoFuaSelector({ 
  value, 
  onChange, 
  label = "Estado"
}: EstadoFuaSelectorProps) {
  const { estadosAtencion, loadingEstados: loading, errorEstados: error } = useCatalogos()

  const options: ComboboxOption[] = [
    { value: "todos", label: "Todos" },
    ...estadosAtencion.map((e) => ({
      value: String(e.id),
      label: e.nombre
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
