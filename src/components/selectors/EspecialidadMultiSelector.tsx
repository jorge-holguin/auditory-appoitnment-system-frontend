import { useState, useEffect, useRef } from "react"
import { ChevronDown, Search, X } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

const API_INTEROP_URL = import.meta.env.VITE_API_INTEROP_URL || "http://192.168.0.252:9004/interoperabilidadsis/api/v1"

interface Especialidad {
  id: string
  descripcion: string
  idEspecialidadSgh: string
}

interface EspecialidadMultiSelectorProps {
  value: string[]
  onChange: (value: string[]) => void
  label?: string
  selectAllByDefault?: boolean
}

export function EspecialidadMultiSelector({
  value,
  onChange,
  label = "Especialidades",
  selectAllByDefault = true
}: EspecialidadMultiSelectorProps) {
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true

    const fetchEspecialidades = async () => {
      setLoading(true)
      try {
        const response = await fetch(`${API_INTEROP_URL}/especialidad`)
        if (!response.ok) throw new Error(`Error: ${response.status}`)
        const result = await response.json()

        const lista: Especialidad[] = Array.isArray(result?.data) ? result.data : []
        if (lista.length === 0) {
          console.warn("[EspecialidadMultiSelector v2] Catálogo vacío:", result)
          return
        }

        setEspecialidades(lista)
        const allIds = lista.map(e => e.idEspecialidadSgh)
        const validValue = value.filter(v => allIds.includes(v))
        const hasInvalidSelection = validValue.length !== value.length

        // Decisión única:
        //   1) Si selectAllByDefault y (vacío o todo inválido) -> auto-selecciona TODAS
        //   2) Si hay IDs inválidos mezclados -> filtra solo los válidos
        //   3) Si todo está OK -> no hace nada
        if (selectAllByDefault && (value.length === 0 || validValue.length === 0)) {
          console.log("[EspecialidadMultiSelector v2] Auto-seleccionando todas:", allIds)
          onChange(allIds)
        } else if (hasInvalidSelection) {
          console.log("[EspecialidadMultiSelector v2] Filtrando IDs inválidos:", value, "→", validValue)
          onChange(validValue)
        }
      } catch (err) {
        console.error("[EspecialidadMultiSelector v2] Error cargando especialidades:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchEspecialidades()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredEspecialidades = especialidades.filter(esp =>
    esp.descripcion.toLowerCase().includes(search.toLowerCase())
  )

  const isAllSelected = value.length === especialidades.length && especialidades.length > 0

  const handleToggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter(v => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  const handleSelectAll = () => {
    if (isAllSelected) {
      onChange([])
    } else {
      onChange(especialidades.map(e => e.idEspecialidadSgh))
    }
  }

  const getDisplayText = () => {
    if (loading) return "Cargando..."
    if (value.length === 0) return "Seleccione especialidad..."
    if (isAllSelected) return "Todas las especialidades"
    if (value.length === 1) {
      const esp = especialidades.find(e => e.idEspecialidadSgh === value[0])
      return esp?.descripcion || value[0]
    }
    return `${value.length} especialidades`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-[#114C5F] mb-2">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 border border-[#9CD2D3] rounded-md bg-white text-sm text-[#114C5F] hover:border-[#4F9BB6] transition-all h-[38px]"
      >
        <span className="truncate">{getDisplayText()}</span>
        <ChevronDown className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-72 overflow-hidden">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar especialidad..."
                className="w-full pl-7 pr-7 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#4F9BB6]"
                autoFocus
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>
          <div className="p-1 border-b">
            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm font-medium text-[#114C5F]">
              <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} />
              Seleccionar todas
            </label>
          </div>
          <div className="overflow-y-auto max-h-48 p-1">
            {filteredEspecialidades.map(esp => (
              <label
                key={esp.idEspecialidadSgh}
                className={`flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm ${
                  value.includes(esp.idEspecialidadSgh) ? 'bg-blue-50' : ''
                }`}
              >
                <Checkbox
                  checked={value.includes(esp.idEspecialidadSgh)}
                  onCheckedChange={() => handleToggle(esp.idEspecialidadSgh)}
                />
                <span className="truncate">{esp.descripcion}</span>
              </label>
            ))}
            {filteredEspecialidades.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-2">Sin resultados</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
