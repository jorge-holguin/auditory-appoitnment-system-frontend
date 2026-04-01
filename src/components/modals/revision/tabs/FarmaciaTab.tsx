// components/revision/tabs/FarmaciaTab.tsx
import { Card, CardContent } from "@/components/ui/card"
import { Pill, CheckCircle, AlertCircle, XCircle } from "lucide-react"
import { SectionObservation } from "../SharedComponents"
import { Badge } from "@/components/ui/badge"
import type { AtencionData, AddObservation, HasObservation, GetObservationEstado, DeleteObservation } from "../types"

// Mapeo de vías de administración
const VIAS_MAP: Record<string, string> = {
  "1": "ENDOVENOSO",
  "2": "INTRAMUSCULAR",
  "3": "SUBCUTÁNEO",
  "4": "TRANSVAGINAL",
  "5": "VÍA ORAL",
  "6": "INFILTRACIÓN",
  "7": "INHALATORIA",
  "8": "TÓPICA",
  "9": "RECTAL"
}

function getViaDescripcion(via: string): string {
  return VIAS_MAP[via] || via
}

function getEstadoEntrega(cantidadEntreg: number, cantidad: number) {
  if (cantidad > 0 && cantidadEntreg === cantidad) {
    return { label: "ENTREGADO", color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle }
  } else if (cantidadEntreg > 0 && cantidadEntreg < cantidad) {
    return { label: "PARCIALMENTE ENTREGADO", color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: AlertCircle }
  } else {
    return { label: "NO ENTREGADO", color: "bg-red-100 text-red-800 border-red-300", icon: XCircle }
  }
}

interface Props {
  atencion: AtencionData
  onAddObservation: AddObservation
  hasObservation: HasObservation
  getObservationText: (fieldName: string) => string
  getObservationEstado?: GetObservationEstado
  onDeleteObservation?: DeleteObservation
  readOnly?: boolean
}

export default function FarmaciaTab({ atencion, onAddObservation, hasObservation, getObservationText, getObservationEstado, onDeleteObservation, readOnly }: Props) {
  return (
    <div className="space-y-4 pr-2">
      <Card className="shadow-sm border-l-4 border-l-purple-500">
        <CardContent className="p-5">
          <h3 className="font-semibold text-[#114C5F] text-lg mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
            Receta Médica
          </h3>

          {atencion.ListadoFarmacos?.length ? (
            <div className="space-y-4">
              {atencion.ListadoFarmacos.map((farmaco: any, index: number) => {
                const cantidad = Number(farmaco.Cantidad ?? farmaco.cantidad ?? 0)
                const cantidadEntreg = Number(farmaco.CantidadEntreg ?? farmaco.cantidadEntreg ?? 0)
                const estado = getEstadoEntrega(cantidadEntreg, cantidad)
                const EstadoIcon = estado.icon
                
                return (
                  <Card key={index} className="bg-purple-50 border border-purple-200">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Título con orden y nombre */}
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-gray-900 text-base">
                            [{farmaco.orden || index + 1}] {farmaco.Nombre || farmaco.nombre}
                          </h4>
                          <Badge className={`${estado.color} border flex items-center gap-1`}>
                            <EstadoIcon className="w-3 h-3" />
                            {estado.label}
                          </Badge>
                        </div>

                        {/* Información en dos columnas */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Cantidad:</span>
                            <span className="ml-2 text-gray-900">{cantidad} {farmaco.metodo || ''}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Frecuencia:</span>
                            <span className="ml-2 text-gray-900">{farmaco.Dosis || farmaco.dosis} {farmaco.metodo || ''} cada {farmaco.Frecuencia || farmaco.frecuencia} horas por {farmaco.dias || farmaco.tiempo} días</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Vía:</span>
                            <span className="ml-2 text-gray-900">{getViaDescripcion(String(farmaco.Via ?? farmaco.via ?? ''))}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Diagnóstico:</span>
                            <span className="ml-2 text-gray-900">{farmaco.Diagnostico || farmaco.cieX || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Indicaciones si existen */}
                        {(farmaco.indicaciones || farmaco.Indicaciones) && (
                          <div className="pt-2 border-t border-purple-200">
                            <p className="text-xs font-semibold text-gray-700 mb-1">Indicaciones:</p>
                            <p className="text-sm text-gray-900">{farmaco.indicaciones || farmaco.Indicaciones}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Pill className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No se prescribieron medicamentos</p>
            </div>
          )}

          {atencion.Farmacia_IndicacionesGenerales && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Pill className="w-4 h-4" />
                Indicaciones Generales
              </h4>
              <p className="text-sm text-blue-800 whitespace-pre-wrap">{atencion.Farmacia_IndicacionesGenerales}</p>
            </div>
          )}

          <div className="mt-4">
            <SectionObservation
              sectionName="OBSERVACION_farmacia"
              onAddObservation={onAddObservation}
              hasObservation={hasObservation('OBSERVACION_farmacia')}
              getObservationText={getObservationText}
              estado={getObservationEstado?.('OBSERVACION_farmacia')}
              onDelete={onDeleteObservation ? () => onDeleteObservation('OBSERVACION_farmacia') : undefined}
              readOnly={readOnly}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
