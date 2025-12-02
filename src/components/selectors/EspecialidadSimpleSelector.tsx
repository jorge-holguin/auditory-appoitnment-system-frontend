import { ComboboxSelect, type ComboboxOption } from "@/components/ui/ComboboxSelect"
import { useCatalogos } from "@/contexts/CatalogosContext"

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
  const { especialidades, loadingEspecialidades: loading, errorEspecialidades: error } = useCatalogos()

  const options: ComboboxOption[] = [
    { value: "todos", label: "Todas" },
    ...especialidades.map(esp => ({
      value: esp.id,
      label: esp.descripcion
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
