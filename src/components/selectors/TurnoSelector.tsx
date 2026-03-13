import { Sun, Moon, Calendar } from "lucide-react"

interface TurnoSelectorProps {
  value: "M" | "T" | "TODOS"
  onChange: (value: "M" | "T" | "TODOS") => void
  label?: string
}

export function TurnoSelector({ value, onChange, label = "Turno" }: TurnoSelectorProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-[#114C5F] mb-2">
          {label}
        </label>
      )}
      <div className="flex items-center bg-white border border-[#9CD2D3] rounded-lg p-1 shadow-sm w-full">
        <button
          type="button"
          onClick={() => onChange("M")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            value === "M"
              ? "bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
          }`}
        >
          <Sun className="w-4 h-4" />
          <span>Mañana</span>
        </button>
        <button
          type="button"
          onClick={() => onChange("T")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            value === "T"
              ? "bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
          }`}
        >
          <Moon className="w-4 h-4" />
          <span>Tarde</span>
        </button>
        <button
          type="button"
          onClick={() => onChange("TODOS")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            value === "TODOS"
              ? "bg-gradient-to-r from-[#4F9BB6] to-[#114C5F] text-white shadow-md"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Todos</span>
        </button>
      </div>
    </div>
  )
}
