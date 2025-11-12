import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

interface DateRangePickerProps {
  from: Date | undefined
  to: Date | undefined
  onSelect: (range: { from: Date | undefined; to: Date | undefined }) => void
  label?: string
  placeholder?: string
  className?: string
}

export function DateRangePicker({
  from,
  to,
  onSelect,
  label = "Fecha",
  placeholder = "Seleccione rango de fechas",
  className
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempFrom, setTempFrom] = useState<Date | undefined>(from)
  const [tempTo, setTempTo] = useState<Date | undefined>(to)

  const handleSelect = (date: Date | undefined) => {
    if (!tempFrom || (tempFrom && tempTo)) {
      // Primera selección o reiniciar
      setTempFrom(date)
      setTempTo(undefined)
    } else if (tempFrom && !tempTo) {
      // Segunda selección
      if (date && date < tempFrom) {
        // Si la segunda fecha es anterior, invertir
        setTempTo(tempFrom)
        setTempFrom(date)
      } else {
        setTempTo(date)
      }
    }
  }

  const handleApply = () => {
    onSelect({ from: tempFrom, to: tempTo })
    setIsOpen(false)
  }

  const handleClear = () => {
    setTempFrom(undefined)
    setTempTo(undefined)
    onSelect({ from: undefined, to: undefined })
    setIsOpen(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setTempFrom(from)
      setTempTo(to)
    }
    setIsOpen(open)
  }

  const formatDateRange = () => {
    if (from && to) {
      return `${format(from, "dd/MM/yyyy", { locale: es })} - ${format(to, "dd/MM/yyyy", { locale: es })}`
    }
    if (from) {
      return format(from, "dd/MM/yyyy", { locale: es })
    }
    return placeholder
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white" align="start">
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-[#114C5F]">Seleccione rango de fechas</h4>
              <p className="text-xs text-gray-500">
                {tempFrom && !tempTo && "Seleccione la fecha final"}
                {tempFrom && tempTo && `${format(tempFrom, "dd/MM/yyyy")} - ${format(tempTo, "dd/MM/yyyy")}`}
                {!tempFrom && "Seleccione la fecha inicial"}
              </p>
            </div>
            <Calendar
              mode="single"
              selected={tempFrom}
              onSelect={handleSelect}
              locale={es}
              className="rounded-md border bg-white"
              modifiers={{
                start: tempFrom ? [tempFrom] : [],
                end: tempTo ? [tempTo] : [],
                range: tempFrom && tempTo ? {
                  from: tempFrom,
                  to: tempTo
                } : undefined
              }}
              modifiersStyles={{
                start: {
                  backgroundColor: "#4F9BB6",
                  color: "white",
                  fontWeight: "bold"
                },
                end: {
                  backgroundColor: "#4F9BB6",
                  color: "white",
                  fontWeight: "bold"
                },
                range: {
                  backgroundColor: "#9CD2D3",
                  color: "#114C5F"
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleClear}
                variant="outline"
                className="flex-1 border-[#9CD2D3] text-[#114C5F] hover:bg-[#9CD2D3]/10"
              >
                Limpiar
              </Button>
              <Button
                onClick={handleApply}
                className="flex-1 bg-[#4F9BB6] hover:bg-[#4A6EB0] text-white"
                disabled={!tempFrom}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
