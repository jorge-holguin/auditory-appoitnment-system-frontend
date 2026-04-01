// components/revision/tabs/ApoyoDiagnosticoTab.tsx
import { Card, CardContent } from "@/components/ui/card"
import { FileText } from "lucide-react"
import { SectionObservation } from "../SharedComponents"
import type { AtencionData, AddObservation, HasObservation, GetObservationEstado, DeleteObservation } from "../types"

interface Props {
  atencion: AtencionData
  onAddObservation: AddObservation
  hasObservation: HasObservation
  getObservationText: (fieldName: string) => string
  getObservationEstado?: GetObservationEstado
  onDeleteObservation?: DeleteObservation
  readOnly?: boolean
}

export default function ApoyoDiagnosticoTab({ atencion, onAddObservation, hasObservation, getObservationText, getObservationEstado, onDeleteObservation, readOnly }: Props) {
  return (
    <div className="space-y-4 pr-2">
      {/* Laboratorio */}
      <Card className="shadow-sm border-l-4 border-l-green-500">
        <CardContent className="p-5">
          <h3 className="font-semibold text-[#114C5F] text-lg mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-green-500 rounded-full"></div>
            Exámenes de Laboratorio
          </h3>

          {atencion.ListadoExamenesLaboratorio?.length ? (
            <div className="space-y-2">
              {atencion.ListadoExamenesLaboratorio.map((examen: any, index: number) => (
                <div key={index} className="bg-white p-3 rounded-lg border border-green-200 shadow-sm">
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">
                      {examen.orden || index + 1}
                    </span>
                    <div className="flex-1 text-gray-900">
                      <p className="font-medium">{examen.nombre || examen.Nombre}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
                        {examen.cantidad && (
                          <div>
                            <span className="font-medium text-gray-700">Cantidad:</span>
                            <span className="ml-1 text-gray-900">{examen.cantidad}</span>
                          </div>
                        )}
                        {(examen.cieX || examen.diagnostico || examen.Diagnostico) && (
                          <div className={examen.cantidad ? "" : "col-span-2"}>
                            <span className="font-medium text-gray-700">Diagnóstico:</span>
                            <span className="ml-1 text-gray-900">{(examen.cieX || examen.diagnostico || examen.Diagnostico).trim()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <FileText className="h-10 w-10 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No se solicitaron exámenes de laboratorio</p>
            </div>
          )}

          <div className="mt-4">
            <SectionObservation
              sectionName="OBSERVACION_laboratorio"
              onAddObservation={onAddObservation}
              hasObservation={hasObservation('OBSERVACION_laboratorio')}
              getObservationText={getObservationText}
              estado={getObservationEstado?.('OBSERVACION_laboratorio')}
              onDelete={onDeleteObservation ? () => onDeleteObservation('OBSERVACION_laboratorio') : undefined}
              readOnly={readOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Rayos X */}
      <Card className="shadow-sm border-l-4 border-l-cyan-500">
        <CardContent className="p-5">
          <h3 className="font-semibold text-[#114C5F] text-lg mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-cyan-500 rounded-full"></div>
            Exámenes de Rayos X
          </h3>

          {atencion.ListadoExamenesRayosX?.length ? (
            <div className="space-y-2">
              {atencion.ListadoExamenesRayosX.map((examen: any, index: number) => (
                <div key={index} className="bg-white p-3 rounded-lg border border-cyan-200 shadow-sm">
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{examen.nombre || examen.Nombre}</p>
                      {(examen.zona || examen.Zona) && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Zona:</span> {examen.zona || examen.Zona}
                        </p>
                      )}
                      {examen.cantidad && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Cantidad:</span> {examen.cantidad}
                        </p>
                      )}
                      {(examen.cieX || examen.Diagnostico) && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Diagnóstico:</span> {examen.cieX || examen.Diagnostico}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <FileText className="h-10 w-10 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No se solicitaron exámenes de rayos X</p>
            </div>
          )}

          <div className="mt-4">
            <SectionObservation
              sectionName="OBSERVACION_rayosx"
              onAddObservation={onAddObservation}
              hasObservation={hasObservation('OBSERVACION_rayosx')}
              getObservationText={getObservationText}
              estado={getObservationEstado?.('OBSERVACION_rayosx')}
              onDelete={onDeleteObservation ? () => onDeleteObservation('OBSERVACION_rayosx') : undefined}
              readOnly={readOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ecografía */}
      <Card className="shadow-sm border-l-4 border-l-teal-500">
        <CardContent className="p-5 text-gray-900">
          <h3 className="font-semibold text-[#114C5F] text-lg mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-teal-500 rounded-full"></div>
            Exámenes de Ecografía
          </h3>

          {atencion.ListadoExamenesEcografia?.length ? (
            <div className="space-y-2">
              {atencion.ListadoExamenesEcografia.map((examen: any, index: number) => (
                <div key={index} className="bg-teal-50 p-3 rounded-lg border border-teal-200 shadow-sm">
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold">
                      {examen.orden || index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{examen.nombre || examen.Nombre}</p>
                      {examen.cantidad && (
                        <p className="text-sm text-gray-900 mt-1">
                          <span className="font-medium">Cantidad:</span> {examen.cantidad}
                        </p>
                      )}
                      {examen.cieX && (
                        <p className="text-sm text-gray-900 mt-1">
                          <span className="font-medium">CIE-10:</span> {examen.cieX.trim()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <FileText className="h-10 w-10 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No se solicitaron exámenes de ecografía</p>
            </div>
          )}

          <div className="mt-4">
            <SectionObservation
              sectionName="OBSERVACION_ecografia"
              onAddObservation={onAddObservation}
              hasObservation={hasObservation('OBSERVACION_ecografia')}
              getObservationText={getObservationText}
              estado={getObservationEstado?.('OBSERVACION_ecografia')}
              onDelete={onDeleteObservation ? () => onDeleteObservation('OBSERVACION_ecografia') : undefined}
              readOnly={readOnly}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
