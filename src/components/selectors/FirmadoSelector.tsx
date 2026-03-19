import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface FirmadoSelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

export function FirmadoSelector({ value, onChange, label = "Firmado" }: FirmadoSelectorProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-[#114C5F] mb-2">
          {label}
        </label>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full border-[#9CD2D3] hover:border-[#4F9BB6] focus:ring-[#4F9BB6] text-[#114C5F]">
          <SelectValue placeholder="Seleccione..." />
        </SelectTrigger>
        <SelectContent className="bg-white border-[#9CD2D3]">
          <SelectItem value="FIRMADO" className="text-[#114C5F] hover:bg-[#9CD2D3]/20 cursor-pointer">
            Firmado
          </SelectItem>
          <SelectItem value="NO_FIRMADO" className="text-[#114C5F] hover:bg-[#9CD2D3]/20 cursor-pointer">
            No Firmado
          </SelectItem>
          <SelectItem value="TODOS" className="text-[#114C5F] hover:bg-[#9CD2D3]/20 cursor-pointer">
            Todos
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
