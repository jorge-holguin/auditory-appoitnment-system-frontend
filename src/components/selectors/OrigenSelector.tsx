import { ComboboxSelect, type ComboboxOption } from "@/components/ui/ComboboxSelect"
import { useCatalogos } from "@/contexts/CatalogosContext"

interface Origen {
  id: string
  nombre: string
}

interface OrigenSelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

export function OrigenSelector({ value, onChange, label = "Origen" }: OrigenSelectorProps) {
  const { origenes, loadingOrigenes: loading, errorOrigenes: error } = useCatalogos()

  const options: ComboboxOption[] = [
    { value: "todos", label: "Todos" },
    ...origenes.map(origen => ({
      value: origen.id,
      label: origen.nombre
    }))
  ]

  return (
    <ComboboxSelect
      value={value}
      onChange={onChange}
      options={options}
      label={label}
      placeholder={loading ? "Cargando..." : error || "Seleccione origen"}
      searchPlaceholder="Buscar origen..."
      disabled={loading || !!error}
    />
  )
}
