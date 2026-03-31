// components/revision/tabs/AtencionTab.tsx
import { Card, CardContent } from "@/components/ui/card"
import { SectionObservation } from "../SharedComponents"
import type { AtencionData, AddObservation, HasObservation, GetObservationEstado, DeleteObservation } from "../types"

interface Props {
  atencion: AtencionData
  onAddObservation: AddObservation
  hasObservation: HasObservation
  getObservationText: (fieldName: string) => string
  getObservationEstado?: GetObservationEstado
  onDeleteObservation?: DeleteObservation
}

export default function AtencionTab({ atencion, onAddObservation, hasObservation, getObservationText, getObservationEstado, onDeleteObservation }: Props) {
  return (
    <div className="space-y-4 pr-2">

       <Card>
        <CardContent className="p-5 space-y-4">
          <h3 className="font-semibold text-[#114C5F] text-lg border-b pb-2">
            Atención de Funciones Vitales
          </h3>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 p-3 rounded-lg border text-center">
              <span className="font-semibold text-gray-600 block text-xs mb-1">TEMPERATURA</span>
              <p className="text-gray-900 text-base font-medium">{atencion.temperatura || '-'}°C</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border text-center">
              <span className="font-semibold text-gray-600 block text-xs mb-1">PRESIÓN ARTERIAL</span>
              <p className="text-gray-900 text-base font-medium">{atencion.presionArterial || '-'}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border text-center">
              <span className="font-semibold text-gray-600 block text-xs mb-1">FREC. CARDÍACA</span>
              <p className="text-gray-900 text-base font-medium">{atencion.frecuenciaCardiaca || '-'}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border text-center">
              <span className="font-semibold text-gray-600 block text-xs mb-1">PESO</span>
              <p className="text-gray-900 text-base font-medium">{atencion.peso || '-'} kg</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border text-center">
              <span className="font-semibold text-gray-600 block text-xs mb-1">TALLA</span>
              <p className="text-gray-900 text-base font-medium">{atencion.talla || '-'} cm</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border text-center">
              <span className="font-semibold text-gray-600 block text-xs mb-1">IMC</span>
              <p className="text-gray-900 text-base font-medium">{atencion.imc || '-'}</p>
            </div>
          </div>

          <SectionObservation
            sectionName="OBSERVACION_funciones_vitales"
            onAddObservation={onAddObservation}
            hasObservation={hasObservation('OBSERVACION_funciones_vitales')}
            getObservationText={getObservationText}
            estado={getObservationEstado?.('OBSERVACION_funciones_vitales')}
            onDelete={onDeleteObservation ? () => onDeleteObservation('OBSERVACION_funciones_vitales') : undefined}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <h3 className="font-semibold text-[#114C5F] text-lg border-b pb-2">
            Información Clínica
          </h3>

          <div className="space-y-2">
            <div className="p-2 rounded">
              <span className="text-sm font-medium text-gray-700">Motivo de Consulta:</span>
              <span className="text-sm text-gray-900 ml-2">{atencion.Motivo || 'No especificado'}</span>
            </div>
            <div className="p-2 rounded">
              <span className="text-sm font-medium text-gray-700">Tiempo de Enfermedad:</span>
              <span className="text-sm text-gray-900 ml-2">{atencion.TiempoEnfermedad || 'No especificado'}</span>
            </div>
            <div className="p-2 rounded">
              <span className="text-sm font-medium text-gray-700">Antecedentes:</span>
              <span className="text-sm text-gray-900 ml-2">{atencion.Antecedente || 'No especificado'}</span>
            </div>
            <div className="p-2 rounded">
              <span className="text-sm font-medium text-gray-700">Relato de Anamnesis:</span>
              <span className="text-sm text-gray-900 ml-2">{atencion.RelatoAnamnesis || 'No especificado'}</span>
            </div>
            <div className="p-2 rounded">
              <span className="text-sm font-medium text-gray-700">Examen Físico:</span>
              <span className="text-sm text-gray-900 ml-2">{atencion.ExamenFisico || 'No especificado'}</span>
            </div>
          </div>
        </CardContent>

         <CardContent className="p-5 space-y-4">
          <h3 className="font-semibold text-[#114C5F] text-lg border-b pb-2">
            Funciones Biológicas
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 rounded">
              <span className="text-sm font-medium text-gray-700">Apetito:</span>
              <span className="text-sm text-gray-900 ml-2">{atencion.Apetito || 'No especificado'}</span>
            </div>
            <div className="p-2 rounded">
              <span className="text-sm font-medium text-gray-700">Sed:</span>
              <span className="text-sm text-gray-900 ml-2">{atencion.Sed || 'No especificado'}</span>
            </div>
            <div className="p-2 rounded">
              <span className="text-sm font-medium text-gray-700">Sueño:</span>
              <span className="text-sm text-gray-900 ml-2">{atencion.Sueño || 'No especificado'}</span>
            </div>
            <div className="p-2 rounded">
              <span className="text-sm font-medium text-gray-700">Estado de Ánimo:</span>
              <span className="text-sm text-gray-900 ml-2">{atencion.EstadoAnimo || 'No especificado'}</span>
            </div>
            <div className="p-2 rounded">
              <span className="text-sm font-medium text-gray-700">Orina:</span>
              <span className="text-sm text-gray-900 ml-2">{atencion.Orina || 'No especificado'}</span>
            </div>
            <div className="p-2 rounded">
              <span className="text-sm font-medium text-gray-700">Deposiciones:</span>
              <span className="text-sm text-gray-900 ml-2">{atencion.Deposiciones || 'No especificado'}</span>
            </div>
            <div className="p-2 rounded">
              <span className="text-sm font-medium text-gray-700">Plan Terapéutico:</span>
              <span className="text-sm text-gray-900 ml-2">{atencion.PlanTerapeutico || 'No especificado'}</span>
            </div>
          </div>

          <SectionObservation
            sectionName="OBSERVACION_Atención_Principal_Motivo_Antecedentes"
            onAddObservation={onAddObservation}
            hasObservation={hasObservation('OBSERVACION_Atención_Principal_Motivo_Antecedentes')}
            getObservationText={getObservationText}
            estado={getObservationEstado?.('OBSERVACION_Atención_Principal_Motivo_Antecedentes')}
            onDelete={onDeleteObservation ? () => onDeleteObservation('OBSERVACION_Atención_Principal_Motivo_Antecedentes') : undefined}
          />
        </CardContent>
      </Card>


      <Card>
        <CardContent className="p-5 space-y-4">
          <h3 className="font-semibold text-[#114C5F] text-lg border-b pb-2">
            Destino
          </h3>
          <div className="space-y-2">
            <div className="p-2 rounded">
              <span className="text-sm font-medium text-gray-700">Destino:</span>
              <span className="text-sm text-gray-900 ml-2">{atencion.Destino || 'No especificado'}</span>
            </div>
          </div>

          <SectionObservation
            sectionName="OBSERVACION_destino"
            onAddObservation={onAddObservation}
            hasObservation={hasObservation('OBSERVACION_destino')}
            getObservationText={getObservationText}
            estado={getObservationEstado?.('OBSERVACION_destino')}
            onDelete={onDeleteObservation ? () => onDeleteObservation('OBSERVACION_destino') : undefined}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <h3 className="font-semibold text-[#114C5F] text-lg border-b pb-2">
            Observaciones
          </h3>
          <div className="space-y-2">
            <div className="p-2 rounded">
              <span className="text-sm font-medium text-gray-700">Observaciones:</span>
              <span className="text-sm text-gray-900 ml-2">{atencion.Observaciones || 'No especificado'}</span>
            </div>
          </div>

          <SectionObservation
            sectionName="OBSERVACION_observaciones_destino"
            onAddObservation={onAddObservation}
            hasObservation={hasObservation('OBSERVACION_observaciones_destino')}
            getObservationText={getObservationText}
            estado={getObservationEstado?.('OBSERVACION_observaciones_destino')}
            onDelete={onDeleteObservation ? () => onDeleteObservation('OBSERVACION_observaciones_destino') : undefined}
          />
        </CardContent>
      </Card>
    </div>
  )
}
