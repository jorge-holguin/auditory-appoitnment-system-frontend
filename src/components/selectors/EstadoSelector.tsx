import { ComboboxSelect, type ComboboxOption } from "@/components/ui/ComboboxSelect"

interface EstadoSelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

export function EstadoSelector({ value, onChange, label = "Estado" }: EstadoSelectorProps) {
  // Estados específicos para auditoría
  const estadosAuditoria: ComboboxOption[] = [
    { value: "todos", label: "Todos" },
    { value: "PENDIENTE", label: "Pendiente" },
    { value: "EN_REVISION", label: "En Revisión" },
    { value: "APROBADO", label: "Aprobado" },
    { value: "OBSERVADO", label: "Observado" },
    { value: "SUBSANADO", label: "Subsanado" },
    { value: "COMPLETADO", label: "Completado" },
    { value: "OBSERVADO_SIS", label: "Observado SIS" },
    { value: "ENVIADO", label: "Enviado" }
  ]

  return (
    <ComboboxSelect
      value={value}
      onChange={onChange}
      options={estadosAuditoria}
      label={label}
      placeholder="Seleccione estado"
      searchPlaceholder="Buscar estado..."
    />
  )
}
