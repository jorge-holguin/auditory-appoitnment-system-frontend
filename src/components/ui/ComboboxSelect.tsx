"use client"

import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  value: string
  label: string
  description?: string
}

interface ComboboxSelectProps {
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  label?: string
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export function ComboboxSelect({
  value,
  onChange,
  options,
  label,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "No se encontraron resultados.",
  required = false,
  disabled = false,
  className
}: ComboboxSelectProps) {
  const [open, setOpen] = useState(false)

  const selectedOption = options.find(option => option.value === value)

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium text-[#114C5F]">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal h-[38px] border-[#9CD2D3] hover:border-[#4F9BB6] hover:bg-white focus:ring-2 focus:ring-[#4F9BB6] focus:border-[#4F9BB6] transition-all rounded-md text-[#114C5F]"
            disabled={disabled}
          >
            {selectedOption ? (
              <span className="font-normal truncate text-sm">{selectedOption.label}</span>
            ) : (
              <span className="text-muted-foreground font-normal text-sm">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-[#4F9BB6]" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white border-[#9CD2D3] shadow-lg rounded-lg" align="start">
          <Command className="bg-white rounded-lg">
            <CommandInput 
              placeholder={searchPlaceholder}
              className="h-9 text-sm border-b border-[#9CD2D3]/30"
            />
            <CommandList className="bg-white max-h-[300px]">
              <CommandEmpty className="py-6 text-center text-sm text-[#6b7280]">
                {emptyMessage}
              </CommandEmpty>
              <CommandGroup className="bg-white p-1">
                {options.map((option, idx) => (
                  <CommandItem
                    key={`${String(option.value)}-${idx}`}
                    value={String(option.value)}
                    keywords={[
                      String(option.label ?? ""),
                      String(option.value ?? "")
                    ].concat(option.description ? [String(option.description)] : [])}
                    onSelect={(currentValue) => {
                      onChange(currentValue === value ? "" : currentValue)
                      setOpen(false)
                    }}
                    className="cursor-pointer rounded-md hover:bg-[#f0f9ff] data-[selected=true]:bg-[#4F9BB6]/10 transition-colors my-0.5 text-sm"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 text-[#4F9BB6]",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-normal text-[#114C5F]">{option.label}</span>
                      {option.description && (
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
