import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Edit2 } from "lucide-react"
import { useState } from "react"

interface EditableFieldProps {
  label: string
  value: string
  fieldName: string
  onAddObservation: (fieldName: string, originalValue: string) => void
  hasObservation: boolean
}

export const EditableField = ({ label, value, fieldName, onAddObservation, hasObservation }: EditableFieldProps) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex items-center justify-between p-2 rounded ${hasObservation ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50'}`}>
        <div className="flex-1">
          {label && <span className="text-sm font-medium text-gray-700">{label}:</span>}
          <span className="text-sm text-gray-900 ml-2">{value || 'No especificado'}</span>
        </div>
        {(isHovered || hasObservation) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAddObservation(fieldName, value)}
            className="h-6 w-6 p-0"
          >
            <Edit2 className={`h-3 w-3 ${hasObservation ? 'text-orange-600' : 'text-gray-400'}`} />
          </Button>
        )}
      </div>
    </div>
  )
}

interface SectionObservationProps {
  sectionName: string
  onAddObservation: (fieldName: string, originalValue: string) => void
  hasObservation: boolean
  getObservationText: (fieldName: string) => string
}

export const SectionObservation = ({ sectionName, onAddObservation, hasObservation, getObservationText }: SectionObservationProps) => {
  const [open, setOpen] = useState(false)
  const [observationText, setObservationText] = useState('')

  const handleSave = () => {
    if (observationText.trim()) {
      onAddObservation(sectionName, observationText)
      setOpen(false)
    }
  }

  return (
    <>
      <div className="relative group mt-4">
        <div className={`flex items-center justify-between p-3 rounded-lg border-2 border-dashed ${
          hasObservation ? 'bg-orange-50 border-orange-300' : 'bg-gray-50 border-gray-300 hover:border-gray-400'
        }`}>
          <div className="flex items-center gap-2">
            <Edit2 className={`h-4 w-4 ${hasObservation ? 'text-orange-600' : 'text-gray-400'}`} />
            <div className="text-sm text-gray-700">
              {hasObservation ? (
                <>
                  <span className="font-medium mr-1">Observación:</span>
                  <span className="text-gray-800">
                    {(() => {
                      const txt = getObservationText(sectionName) || ''
                      const trimmed = txt.split(/\s+/).join(' ').trim()
                      return trimmed.length > 100 ? trimmed.slice(0, 100) + '…' : trimmed || '—'
                    })()}
                  </span>
                </>
              ) : (
                <span className="font-medium">Agregar observación de auditoría</span>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant={hasObservation ? "default" : "outline"}
            onClick={() => {
              setObservationText(getObservationText(sectionName) || '')
              setOpen(true)
            }}
            className={hasObservation ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}
          >
            {hasObservation ? 'Editar' : 'Agregar'}
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl bg-white border border-gray-300 shadow-2xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-[#114C5F]">Agregar Observación</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Escriba su observación aquí..."
              value={observationText}
              onChange={(e) => setObservationText(e.target.value)}
              className="min-h-[150px] resize-none"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!observationText.trim()}
              className="bg-[#4F9BB6] hover:bg-[#4A6EB0] text-white"
            >
              Guardar Observación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
