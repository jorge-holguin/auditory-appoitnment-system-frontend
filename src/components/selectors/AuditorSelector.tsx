import { Search, X } from "lucide-react"

interface AuditorSelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

export function AuditorSelector({ value, onChange, label = "Auditor" }: AuditorSelectorProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-[#114C5F] mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Buscar por DNI de auditor..."
          className="w-full px-3 py-2 pl-9 pr-8 border border-[#9CD2D3] rounded-md bg-white text-sm text-[#114C5F] focus:ring-2 focus:ring-[#4F9BB6] focus:border-[#4F9BB6] transition-all"
        />
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
