import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { SectionObservation } from "./SharedComponents"
import type { AtencionData, FieldObservation } from "./types"

interface LiquidacionesModalProps {
  open: boolean
  onClose: () => void
  atencion: AtencionData
  observations: FieldObservation[]
  onAddObservation: (fieldName: string, originalValue: string) => void
  hasObservation: (fieldName: string) => boolean
  getObservationText: (fieldName: string) => string
}

export function LiquidacionesModal({ 
  open, 
  onClose, 
  atencion,
  observations,
  onAddObservation, 
  hasObservation,
  getObservationText
}: LiquidacionesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col bg-white p-0">
        {/* Header con botón Volver a la izquierda */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-[#114C5F] to-[#4F9BB6]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Botón Volver */}
              <Button
                onClick={onClose}
                variant="ghost"
                className="flex items-center gap-2 text-white hover:bg-white/20 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Button>

              <DialogTitle className="text-2xl font-semibold text-white">
                Liquidaciones
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* Contenido principal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-[#114C5F] text-lg mb-3 border-b pb-2">
                Información de Liquidación
              </h3>

              {/* Campos principales */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 rounded">
                  <span className="text-sm font-medium text-gray-700">Cuenta Corriente:</span>
                  <span className="text-sm text-gray-900 ml-2">{atencion.Liquidacion_CuentaCorriente || 'No especificado'}</span>
                </div>
                <div className="p-2 rounded">
                  <span className="text-sm font-medium text-gray-700">Fecha de Emisión:</span>
                  <span className="text-sm text-gray-900 ml-2">{atencion.Liquidacion_FechaEmision || 'No especificado'}</span>
                </div>
                <div className="p-2 rounded">
                  <span className="text-sm font-medium text-gray-700">Hora de Emisión:</span>
                  <span className="text-sm text-gray-900 ml-2">{atencion.Liquidacion_HoraEmision || 'No especificado'}</span>
                </div>
                <div className="p-2 rounded">
                  <span className="text-sm font-medium text-gray-700">Historia Clínica:</span>
                  <span className="text-sm text-gray-900 ml-2">{atencion.Liquidacion_HistoriaClinica || 'No especificado'}</span>
                </div>
                <div className="p-2 rounded">
                  <span className="text-sm font-medium text-gray-700">Apellidos y Nombres:</span>
                  <span className="text-sm text-gray-900 ml-2">{atencion.Liquidacion_ApellidosNombres || 'No especificado'}</span>
                </div>
                <div className="p-2 rounded">
                  <span className="text-sm font-medium text-gray-700">Tipo de Paciente:</span>
                  <span className="text-sm text-gray-900 ml-2">{atencion.Liquidacion_TipoPaciente || 'No especificado'}</span>
                </div>
                <div className="p-2 rounded">
                  <span className="text-sm font-medium text-gray-700">Empresa Aseguradora:</span>
                  <span className="text-sm text-gray-900 ml-2">{atencion.Liquidacion_EmpresaAseguradora || 'No especificado'}</span>
                </div>
                <div className="p-2 rounded">
                  <span className="text-sm font-medium text-gray-700">Origen:</span>
                  <span className="text-sm text-gray-900 ml-2">{atencion.Liquidacion_Origen || 'No especificado'}</span>
                </div>
                <div className="p-2 rounded">
                  <span className="text-sm font-medium text-gray-700">Consultorio:</span>
                  <span className="text-sm text-gray-900 ml-2">{atencion.Liquidacion_Consultorio || 'No especificado'}</span>
                </div>
                <div className="p-2 rounded">
                  <span className="text-sm font-medium text-gray-700">Médico Tratante:</span>
                  <span className="text-sm text-gray-900 ml-2">{atencion.Liquidacion_MedicoTratante || 'No especificado'}</span>
                </div>
                <div className="p-2 rounded">
                  <span className="text-sm font-medium text-gray-700">Fecha de Ingreso:</span>
                  <span className="text-sm text-gray-900 ml-2">{atencion.Liquidacion_FechaIngreso || 'No especificado'}</span>
                </div>
                <div className="p-2 rounded">
                  <span className="text-sm font-medium text-gray-700">Nro de Cama:</span>
                  <span className="text-sm text-gray-900 ml-2">{atencion.Liquidacion_NroCama || 'No especificado'}</span>
                </div>
              </div>

              {/* Diagnósticos */}
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium text-sm mb-2 text-gray-700">Diagnósticos</h4>
                <div className="space-y-2">
                  <div className="p-2 rounded">
                    <span className="text-sm font-medium text-gray-700">Diagnóstico 1:</span>
                    <span className="text-sm text-gray-900 ml-2">{atencion.Liquidacion_Diagnostico1 || 'No especificado'}</span>
                  </div>
                  <div className="p-2 rounded">
                    <span className="text-sm font-medium text-gray-700">Diagnóstico 2:</span>
                    <span className="text-sm text-gray-900 ml-2">{atencion.Liquidacion_Diagnostico2 || 'No especificado'}</span>
                  </div>
                  <div className="p-2 rounded">
                    <span className="text-sm font-medium text-gray-700">Diagnóstico 3:</span>
                    <span className="text-sm text-gray-900 ml-2">{atencion.Liquidacion_Diagnostico3 || 'No especificado'}</span>
                  </div>
                </div>
              </div>

              {/* Detalle de Servicios */}
              {atencion.Liquidacion_DetalleServicios && atencion.Liquidacion_DetalleServicios.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium text-sm mb-3 text-gray-700">Detalle de Servicios</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b">
                          <th className="text-left p-2 font-semibold">Item</th>
                          <th className="text-left p-2 font-semibold">Detalle Producto</th>
                          <th className="text-right p-2 font-semibold">Cantidad</th>
                          <th className="text-right p-2 font-semibold">Precio</th>
                          <th className="text-right p-2 font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {atencion.Liquidacion_DetalleServicios.map((servicio, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-2">{servicio.Item}</td>
                            <td className="p-2">{servicio.DetalleProducto}</td>
                            <td className="p-2 text-right">{servicio.Cantidad}</td>
                            <td className="p-2 text-right">{servicio.Precio}</td>
                            <td className="p-2 text-right font-medium">{servicio.Total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="mt-4 pt-4 border-t">
                <div className="p-2 rounded">
                  <span className="text-sm font-medium text-gray-700">Total a Pagar:</span>
                  <span className="text-sm text-gray-900 ml-2">{atencion.Liquidacion_TotalPagar || 'No especificado'}</span>
                </div>
              </div>

              {/* Observaciones */}
              <SectionObservation
                sectionName="OBSERVACION_liquidaciones"
                onAddObservation={onAddObservation}
                hasObservation={hasObservation('OBSERVACION_liquidaciones')}
                getObservationText={getObservationText}
              />
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex items-center justify-end">
            <span className="text-sm text-gray-600">
              {observations.length} observación(es) en esta sección
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
