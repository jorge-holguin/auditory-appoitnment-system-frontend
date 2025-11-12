'use client'

import * as React from 'react'
import { Calendar } from '@/components/ui/calendar'
import { format, isToday, isWithinInterval, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface AvailabilityCalendarProps {
  availableDates: string[] // Lista de fechas disponibles en formato YYYY-MM-DD (con totalDisponibles > 0)
  unavailableDates?: string[] // Lista de fechas sin disponibilidad en formato YYYY-MM-DD (totalDisponibles = 0)
  onSelectDate: (date: Date | undefined) => void
  selectedDate?: Date
  className?: string
  fromDate?: Date
  toDate?: Date
  month?: Date // Mes a mostrar en el calendario
  onMonthChange?: (month: Date) => void // Callback cuando cambia el mes
}

export function AvailabilityCalendar({
  availableDates,
  unavailableDates = [],
  onSelectDate,
  selectedDate,
  className,
  fromDate = new Date(),
  toDate,
  month,
  onMonthChange,
}: AvailabilityCalendarProps) {
  // Convertir las fechas disponibles de string a objetos Date
  const availableDateObjects = availableDates.map(dateStr => parseISO(dateStr))
  const unavailableDateObjects = unavailableDates.map(dateStr => parseISO(dateStr))
  
  // Debug: mostrar las fechas disponibles
  React.useEffect(() => {
  }, [availableDates, month])
  
  // Deshabilitar días que no están en las fechas disponibles O no disponibles
  const disabledDays = (date: Date) => {
    // Normalizar la fecha a medianoche para comparación
    const dateNormalized = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    // Si se proporciona fromDate y la fecha es anterior, deshabilitar
    if (fromDate) {
      const fromNormalized = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
      if (dateNormalized < fromNormalized) {
        return true
      }
    }
    
    // Si se proporciona toDate y la fecha es posterior, deshabilitar
    if (toDate) {
      const toNormalized = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate())
      if (dateNormalized > toNormalized) {
        return true
      }
    }
    
    // Verificar si está en fechas disponibles (verde)
    const isAvailable = availableDateObjects.some(availableDate => 
      availableDate.getDate() === date.getDate() &&
      availableDate.getMonth() === date.getMonth() &&
      availableDate.getFullYear() === date.getFullYear()
    )
    
    // Verificar si está en fechas no disponibles (rojo)
    const isUnavailable = unavailableDateObjects.some(unavailableDate => 
      unavailableDate.getDate() === date.getDate() &&
      unavailableDate.getMonth() === date.getMonth() &&
      unavailableDate.getFullYear() === date.getFullYear()
    )
    
    // Solo deshabilitar si NO está en ninguna de las dos listas (fechas grises)
    return !isAvailable && !isUnavailable
  }

  // Modificador para resaltar las fechas disponibles y no disponibles
  const modifiers = {
    available: availableDateObjects,
    unavailable: unavailableDateObjects,
    today: new Date(),
  }

  // Estilos para los modificadores
  const modifiersStyles = {
    available: {
      fontWeight: 'bold',
      color: '#3e92cc',
    },
    unavailable: {
      fontWeight: 'bold',
      color: '#ef4444', // red-500
      backgroundColor: '#fee2e2', // red-100
    },
    today: {
      fontWeight: 'bold',
      border: '2px solid #3e92cc',
    },
  }

  return (
    <div className={cn("p-0", className)}>
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={onSelectDate}
        disabled={disabledDays}
        modifiers={modifiers}
        modifiersStyles={modifiersStyles}
        locale={es}
        showOutsideDays={false}
        className="rounded-md border-0"
        fromDate={fromDate}
        toDate={toDate}
        month={month}
        onMonthChange={onMonthChange}
        captionLayout="label"
        classNames={{
          month: "space-y-2",
          caption: "hidden", // Ocultamos el caption completo ya que tenemos nuestro propio encabezado
          caption_label: "hidden",
          nav: "hidden", // Ocultamos la navegación del calendario ya que tenemos nuestra propia navegación
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside: "text-muted-foreground opacity-50",
          day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
        }}
      />
    </div>
  )
}
