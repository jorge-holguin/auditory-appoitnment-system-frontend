import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trash2, Loader2, AlertCircle, AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { obtenerCuentaPorCita, obtenerDetalleLiquidacion, eliminarItemLiquidacion, type DetalleLiquidacion } from "@/services/citaService"

interface LiquidacionesModalProps {
  open: boolean
  onClose: () => void
  citaId: string
}

interface ItemAgrupado extends DetalleLiquidacion {
  removido?: boolean
}

interface ClasificadorGroup {
  clasificadorNombre: string
  items: ItemAgrupado[]
  subtotal: number
}

export function LiquidacionesModal({ 
  open, 
  onClose, 
  citaId
}: LiquidacionesModalProps) {
  const [items, setItems] = useState<ItemAgrupado[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cuentaId, setCuentaId] = useState<number | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ItemAgrupado | null>(null)
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [resultSuccess, setResultSuccess] = useState(true)
  const [resultMessage, setResultMessage] = useState("")
  const [deleting, setDeleting] = useState(false)

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (open && citaId) {
      cargarDetalleLiquidacion()
    }
  }, [open, citaId])

  const cargarDetalleLiquidacion = async () => {
    setLoading(true)
    setError(null)

    try {
      // Primero obtener el número de cuenta
      const cuenta = await obtenerCuentaPorCita(citaId)
      setCuentaId(cuenta)

      // Luego obtener el detalle
      const detalle = await obtenerDetalleLiquidacion(cuenta)
      setItems(detalle.map(item => ({ ...item, removido: false })))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar liquidación")
      console.error("Error cargando liquidación:", err)
    } finally {
      setLoading(false)
    }
  }

  // Agrupar items por clasificador
  const agruparPorClasificador = (): ClasificadorGroup[] => {
    const grupos: { [key: string]: ClasificadorGroup } = {}

    items.forEach(item => {
      if (item.removido) return // Ignorar items removidos
      if (item.estado !== "1") return // Solo mostrar items activos (estado=1), estado=0 está anulado

      const clasificador = item.clasificadorNombre?.trim() || 'Sin clasificador'
      if (!grupos[clasificador]) {
        grupos[clasificador] = {
          clasificadorNombre: clasificador,
          items: [],
          subtotal: 0
        }
      }
      grupos[clasificador].items.push(item)
      grupos[clasificador].subtotal += item.total
    })

    return Object.values(grupos)
  }

  // Mostrar diálogo de confirmación
  const confirmarEliminarItem = (item: ItemAgrupado) => {
    setItemToDelete(item)
    setShowConfirmDialog(true)
  }

  // Remover un item (llamada al backend)
  const removerItem = async () => {
    if (!itemToDelete || !cuentaId) return

    setDeleting(true)
    try {
      // Llamar al endpoint DELETE con ordenId
      await eliminarItemLiquidacion(cuentaId, itemToDelete.item?.trim() || '', itemToDelete.ordenId?.trim() || '')
      
      // Marcar como removido en el estado local (usando item + ordenId para identificar únicamente)
      setItems(prevItems => 
        prevItems.map(item => 
          (item.item === itemToDelete.item && item.ordenId === itemToDelete.ordenId) ? { ...item, removido: true } : item
        )
      )
      
      setResultSuccess(true)
      setResultMessage("El item fue eliminado correctamente.")
      setShowResultDialog(true)
    } catch (err) {
      console.error("Error al eliminar item:", err)
      setResultSuccess(false)
      setResultMessage("Error al eliminar el item. Por favor, intente nuevamente.")
      setShowResultDialog(true)
    } finally {
      setDeleting(false)
    }
  }

  // Calcular total general (solo items activos estado=1 y no removidos)
  const calcularTotalGeneral = (): number => {
    return items
      .filter(item => !item.removido && item.estado === "1")
      .reduce((sum, item) => sum + item.total, 0)
  }

  const grupos = agruparPorClasificador()
  const totalGeneral = calcularTotalGeneral()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col bg-white p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-[#114C5F] to-[#4F9BB6]">
          <div className="flex items-center gap-3">
            <Button
              onClick={onClose}
              variant="ghost"
              className="flex items-center gap-2 text-white hover:bg-white/20 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
            <DialogTitle className="text-2xl font-semibold text-white">
              Detalle de los Servicios Adquiridos
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Contenido principal */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#4F9BB6] mb-4" />
              <p className="text-gray-600">Cargando detalle de liquidación...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <p className="text-red-600 font-medium mb-2">Error al cargar liquidación</p>
              <p className="text-gray-600 text-sm">{error}</p>
              <Button onClick={cargarDetalleLiquidacion} className="mt-4">
                Reintentar
              </Button>
            </div>
          ) : grupos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-600">No se encontraron servicios para esta cita</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Información de cuenta */}
              {cuentaId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900">
                    Número de Cuenta: <span className="font-bold">{cuentaId}</span>
                  </p>
                </div>
              )}

              {/* Grupos por clasificador */}
              {grupos.map((grupo, index) => (
                <div key={index} className="border rounded-lg overflow-hidden">
                  {/* Header del grupo */}
                  <div className="bg-gray-100 px-4 py-3 border-b">
                    <h3 className="font-bold text-gray-800 text-lg">{grupo.clasificadorNombre}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Subtotal: <span className="font-semibold text-gray-900">S/ {grupo.subtotal.toFixed(2)}</span>
                    </p>
                  </div>

                  {/* Tabla de items */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left p-3 font-semibold text-gray-700">Item</th>
                          <th className="text-left p-3 font-semibold text-gray-700">Detalle del Producto</th>
                          <th className="text-center p-3 font-semibold text-gray-700">CPMS</th>
                          <th className="text-center p-3 font-semibold text-gray-700">Cantidad</th>
                          <th className="text-right p-3 font-semibold text-gray-700">Precio</th>
                          <th className="text-right p-3 font-semibold text-gray-700">Total</th>
                          <th className="text-center p-3 font-semibold text-gray-700">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.items.map((item, itemIndex) => (
                          <tr key={itemIndex} className="border-b hover:bg-gray-50 transition">
                            <td className="p-3 text-gray-800">{item.item?.trim() || ''}</td>
                            <td className="p-3 text-gray-800">{item.itemNombre}</td>
                            <td className="p-3 text-center text-gray-800">{item.cpms || '-'}</td>
                            <td className="p-3 text-center text-gray-800">{item.cantidad}</td>
                            <td className="p-3 text-right text-gray-800">S/. {item.precio.toFixed(2)}</td>
                            <td className="p-3 text-right font-semibold text-gray-900">S/. {item.total.toFixed(2)}</td>
                            <td className="p-3 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => confirmarEliminarItem(item)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* Total general */}
              <div className="bg-gradient-to-r from-[#114C5F] to-[#4F9BB6] rounded-lg p-6 text-white">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">Total a Pagar S/.</h3>
                  <p className="text-3xl font-bold">{totalGeneral.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Diálogo de confirmación para eliminar */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md bg-white border border-gray-300 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Eliminación
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700 mb-4">
              ¿Está seguro de que desea eliminar este item de la liquidación?
            </p>
            
            {itemToDelete && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                <div>
                  <span className="text-sm font-semibold text-gray-600">Item:</span>
                  <span className="text-sm text-gray-900 ml-2">{itemToDelete.item?.trim() || ''}</span>
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-600">Producto:</span>
                  <span className="text-sm text-gray-900 ml-2">{itemToDelete.itemNombre}</span>
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-600">Total:</span>
                  <span className="text-sm text-gray-900 ml-2">S/ {itemToDelete.total.toFixed(2)}</span>
                </div>
              </div>
            )}
            
            <p className="text-sm text-red-600 mt-4">
              Esta acción no se puede deshacer.
            </p>
          </div>

          <DialogFooter className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false)
                setItemToDelete(null)
              }}
              disabled={deleting}
              className="border-gray-300 text-gray-700 bg-white hover:bg-gray-100 hover:text-gray-900"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={removerItem}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white shadow-sm"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de resultado de eliminación */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-md bg-white border border-gray-300 shadow-xl">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${resultSuccess ? 'text-green-600' : 'text-red-600'}`}>
              {resultSuccess ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Éxito
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5" />
                  Error
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700 text-center">
              {resultMessage}
            </p>
          </div>

          <DialogFooter className="flex justify-center">
            <Button
              type="button"
              onClick={() => setShowResultDialog(false)}
              className={`${resultSuccess ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}
            >
              Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
