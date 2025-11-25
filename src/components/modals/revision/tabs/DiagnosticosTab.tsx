// components/revision/tabs/DiagnosticosTab.tsx
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Activity } from "lucide-react"
import { SectionObservation } from "../SharedComponents"
import type { AtencionData, AddObservation, HasObservation } from "../types"

interface Props {
  atencion: AtencionData
  onAddObservation: AddObservation
  hasObservation: HasObservation
  getObservationText: (fieldName: string) => string
  getTipoDxBadge: (tipo: string) => { label: string; className: string }
}

export default function DiagnosticosTab({ atencion, onAddObservation, hasObservation, getObservationText, getTipoDxBadge }: Props) {
  return (
    <div className="space-y-4 pr-2">
      <Card className="shadow-sm border-l-4 border-l-indigo-500">
        <CardContent className="p-5">
          <h3 className="font-semibold text-[#114C5F] text-lg mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
            Diagnósticos de la atención
          </h3>

          {atencion.ListadoDiagnosticos?.length ? (
            <div className="space-y-3">
              {atencion.ListadoDiagnosticos.map((diagnostico: any, index: number) => (
                <Card key={index} className="bg-indigo-50 border border-indigo-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-indigo-700 font-bold text-sm">{diagnostico.numero}</span>
                        </div>
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-gray-900 text-base">
                              {diagnostico.descripcion}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">CIE-10:</span> {diagnostico.cie10?.trim()}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`${getTipoDxBadge(diagnostico.tipoDx).className} text-xs px-3 py-1`}
                          >
                            {getTipoDxBadge(diagnostico.tipoDx).label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No se registraron diagnósticos</p>
            </div>
          )}

          <div className="mt-4">
            <SectionObservation
              sectionName="OBSERVACION_diagnosticos"
              onAddObservation={onAddObservation}
              hasObservation={hasObservation('OBSERVACION_diagnosticos')}
              getObservationText={getObservationText}
            />
          </div>
        </CardContent>
      </Card>

      {/* Procedimientos */}
      <Card className="shadow-sm border-l-4 border-l-purple-500">
        <CardContent className="p-5">
          <h3 className="font-semibold text-[#114C5F] text-lg mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
            Procedimientos
          </h3>

          {atencion.ListadoProcedimientos?.length ? (
            <div className="space-y-3">
              {atencion.ListadoProcedimientos.map((procedimiento: any, index: number) => (
                <Card key={index} className="bg-purple-50 border border-purple-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-purple-700 font-bold text-sm">
                            {index + 1}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {procedimiento.descripcion || 'Sin descripción'}
                            </p>
                            {procedimiento.codigo && (
                              <p className="text-sm text-gray-600 mt-1">
                                <span className="font-medium">Código:</span> {procedimiento.codigo}
                              </p>
                            )}
                          </div>
                          {procedimiento.cantidad && (
                            <Badge variant="outline" className="bg-white text-purple-700 border-purple-300">
                              Cantidad: {procedimiento.cantidad}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No se registraron procedimientos</p>
            </div>
          )}

          <div className="mt-4">
            <SectionObservation
              sectionName="OBSERVACION_procedimientos"
              onAddObservation={onAddObservation}
              hasObservation={hasObservation('OBSERVACION_procedimientos')}
              getObservationText={getObservationText}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
