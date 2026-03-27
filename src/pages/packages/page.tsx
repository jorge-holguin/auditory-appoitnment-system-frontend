import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, RefreshCw, FilterX, ShieldCheck, Loader2, AlertTriangle, CheckCircle2, Clock, XCircle, Eye } from "lucide-react"
import { obtenerCitaIdPorAtencion } from "@/services/citaService"
import { PdfReviewModal } from "@/components/modals/PdfReviewModal"
import { EstadoPaqueteSelector } from "@/components/selectors/EstadoPaqueteSelector"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Paquete {
  idPaqueteSis: number
  codigoPaqueteSis: string
  estado: string
  mes: string
  anio: string
  nombrePaquete: string
  fechaCreacion: string
  fechaInicio: string
  fechaFin: string
  especialidad: string
  observacion: string | null
}

interface DetallePaquete {
  id: number
  estado: string
  idPaquete: number
  idAtencion: string
  numeroFua: string
  observacion: string | null
  fechaCreacion: string
}

// Interfaces para verificación de reglas
interface ObservacionRegla {
  fua: string
  errores: string[]
}

interface ProcesoVerificacion {
  codigo: number
  descripcion: string
  estado: string
}

interface CargaVerificacion {
  recepcionada: number
  consolidada: number
  produccion: number
  observada: number
  observadaDup: number
  observadaRc: number
  observadaCat: number
}

interface DataVerificacion {
  estado: string
  proceso: ProcesoVerificacion
  carga: CargaVerificacion
  observaciones: ObservacionRegla[]
}

interface VerificacionReglasResponse {
  estado: string
  data: DataVerificacion
  mensaje?: string
}

export default function PackagesPage() {
  // Estados para el modal de revisión de FUA
  const [modalRevisarOpen, setModalRevisarOpen] = useState(false)
  const [modalCitaId, setModalCitaId] = useState<string>("")
  const [modalDetalle, setModalDetalle] = useState<DetallePaquete | null>(null)
  const [loadingVerAtencion, setLoadingVerAtencion] = useState<string | null>(null)

  // Función para ver FUA en modal de revisión
  const handleVerAtencion = async (detalle: DetallePaquete) => {
    setLoadingVerAtencion(detalle.idAtencion)
    try {
      const citaId = await obtenerCitaIdPorAtencion(detalle.idAtencion)
      setModalCitaId(citaId)
      setModalDetalle(detalle)
      setModalRevisarOpen(true)
    } catch (error) {
      console.error("Error al obtener cita ID:", error)
      alert("No se pudo obtener el ID de cita para esta atención.")
    } finally {
      setLoadingVerAtencion(null)
    }
  }

  const [estado, setEstado] = useState<string>("todos")
  const [numeroPaquete, setNumeroPaquete] = useState<string>("")
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState<Paquete | null>(null)
  const [paquetes, setPaquetes] = useState<Paquete[]>([])
  const [detallesPaquete, setDetallesPaquete] = useState<DetallePaquete[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingDetalles, setLoadingDetalles] = useState(false)
  const [paginaActual, setPaginaActual] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [paginaDetalles, setPaginaDetalles] = useState(0)
  const [totalPaginasDetalles, setTotalPaginasDetalles] = useState(0)
  const [detalleSeleccionadoObservacion, setDetalleSeleccionadoObservacion] = useState<string | null>(null)
  const [verificacionReglas, setVerificacionReglas] = useState<VerificacionReglasResponse | null>(null)
  const [loadingVerificacion, setLoadingVerificacion] = useState(false)
  const [mostrarVerificacion, setMostrarVerificacion] = useState(false)
  const [errorVerificacion, setErrorVerificacion] = useState<string | null>(null)
  const tamanio = 10

  const API_INTEROP_URL = import.meta.env.VITE_API_INTEROP_URL
  // Fetch paquetes from API
  const fetchPaquetes = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_INTEROP_URL}/paquete-sis?pagina=${paginaActual}&tamanio=${tamanio}`)
      const result = await response.json()
      
      if (result.content) {
        setPaquetes(result.content)
        setTotalPaginas(result.totalPages)
      }
    } catch (err) {
      console.error("Error fetching paquetes:", err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch detalles del paquete
  const fetchDetallesPaquete = async (idPaquete: number) => {
    try {
      setLoadingDetalles(true)
      const response = await fetch(`${API_INTEROP_URL}/paquete-sis/detalles?idPaquete=${idPaquete}&pagina=${paginaDetalles}&tamanio=${tamanio}`)
      const result = await response.json()
      
      if (result.content) {
        setDetallesPaquete(result.content)
        setTotalPaginasDetalles(result.totalPages)
      }
    } catch (err) {
      console.error("Error fetching detalles:", err)
    } finally {
      setLoadingDetalles(false)
    }
  }

  // Verificar reglas del paquete
  const verificarReglasPaquete = async (codigoPaquete: string) => {
    try {
      setLoadingVerificacion(true)
      setErrorVerificacion(null)
      setVerificacionReglas(null)
      
      const response = await fetch(`${API_INTEROP_URL}/conecta-sis/consulta/${codigoPaquete}`)
      const result: VerificacionReglasResponse = await response.json()
      
      if (result.estado === "OK") {
        setVerificacionReglas(result)
        setMostrarVerificacion(true)
      } else {
        setErrorVerificacion(result.mensaje || "Error al verificar las reglas del paquete")
      }
    } catch (err) {
      console.error("Error verificando reglas:", err)
      setErrorVerificacion("Error de conexión al verificar las reglas")
    } finally {
      setLoadingVerificacion(false)
    }
  }

  // Helper para obtener el color del estado del paquete
  const getEstadoPaqueteColor = (estado: string) => {
    switch (estado) {
      case "Finalizado":
        return "bg-green-100 text-green-800 border-green-300"
      case "Procesando":
        return "bg-blue-100 text-blue-800 border-blue-300"
      case "Error":
        return "bg-red-100 text-red-800 border-red-300"
      case "No encontrado":
        return "bg-gray-100 text-gray-800 border-gray-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  // Helper para obtener el icono del estado
  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case "Finalizado":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case "Procesando":
        return <Clock className="w-5 h-5 text-blue-600" />
      case "Error":
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />
    }
  }

  // Load paquetes on mount and when filters change
  useEffect(() => {
    fetchPaquetes()
  }, [paginaActual])

  const handlePaqueteClick = (paquete: Paquete) => {
    setPaqueteSeleccionado(paquete)
    setPaginaDetalles(0)
    setVerificacionReglas(null)
    setMostrarVerificacion(false)
    setErrorVerificacion(null)
    fetchDetallesPaquete(paquete.idPaqueteSis)
  }

  // Refetch detalles when page changes
  useEffect(() => {
    if (paqueteSeleccionado) {
      fetchDetallesPaquete(paqueteSeleccionado.idPaqueteSis)
    }
  }, [paginaDetalles])

  const clearNumeroPaquete = () => {
    setNumeroPaquete("")
  }

  const handleActualizar = () => {
    fetchPaquetes()
    if (paqueteSeleccionado) {
      fetchDetallesPaquete(paqueteSeleccionado.idPaqueteSis)
    }
  }

  const handleBuscar = () => {
    setPaginaActual(0)
    fetchPaquetes()
  }

  const handleLimpiarFiltros = () => {
    setEstado("todos")
    setNumeroPaquete("")
    setPaqueteSeleccionado(null)
    setDetallesPaquete([])
    setPaginaActual(0)
    setPaginaDetalles(0)
    fetchPaquetes()
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-[#9CD2D3]/30 p-8">
        {/* Header con tÃ­tulo y botones */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#9CD2D3]/20">
          <h1 className="text-2xl font-semibold text-[#114C5F]">Control de Paquetes</h1>
          <div className="flex gap-3">
            <Button onClick={handleActualizar} className="bg-[#4F9BB6] hover:bg-[#4A6EB0] shadow-md text-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button onClick={handleLimpiarFiltros} variant="outline" className="border-[#9CD2D3] text-[#114C5F] hover:bg-[#9CD2D3]/10">
              <FilterX className="w-4 h-4 mr-2" />
              Limpiar Filtros
            </Button>
          </div>
        </div>
        
        <div>
          {/* Filtros superiores */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <EstadoPaqueteSelector
              value={estado}
              onChange={setEstado}
              label="Estado del Paquete"
            />

            <div className="space-y-2">
              <Label htmlFor="numeroPaquete">N° Paquete:</Label>
              <div className="relative">
                <Input
                  id="numeroPaquete"
                  type="text"
                  value={numeroPaquete}
                  onChange={(e) => setNumeroPaquete(e.target.value)}
                  placeholder="Ingrese numero de paquete"
                />
                {numeroPaquete && (
                  <button
                    onClick={clearNumeroPaquete}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-end">
              <Button onClick={handleBuscar} className="text-white bg-[#4F9BB6] hover:bg-[#4A6EB0]">
                Buscar
              </Button>
            </div>
          </div>

          {/* Contenido con tabla de paquetes y detalles */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Tabla de Paquetes - 8 columnas */}
            <div className="lg:col-span-7">
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">N° Paquete</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Estado del Paquete</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fecha Inicio</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fecha Fin</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Especialidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                            Cargando paquetes...
                          </td>
                        </tr>
                      ) : paquetes.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                            No se encontraron paquetes
                          </td>
                        </tr>
                      ) : (
                        paquetes.map((paquete) => (
                          <tr
                            key={paquete.idPaqueteSis}
                            onClick={() => handlePaqueteClick(paquete)}
                            className={`border-b cursor-pointer hover:bg-gray-50 ${
                              paqueteSeleccionado?.idPaqueteSis === paquete.idPaqueteSis ? "bg-blue-50" : ""
                            }`}
                          >
                            <td className="px-4 py-3 text-sm">{paquete.codigoPaqueteSis}</td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  paquete.estado === "ENVIADO"
                                    ? "bg-blue-100 text-blue-800"
                                    : paquete.estado === "CREADO"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {paquete.estado}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">{paquete.fechaInicio}</td>
                            <td className="px-4 py-3 text-sm">{paquete.fechaFin}</td>
                            <td className="px-4 py-3 text-sm">{paquete.especialidad}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {/* PaginaciÃ³n de paquetes */}
                {totalPaginas > 1 && (
                  <div className="flex justify-center py-4 border-t overflow-x-auto">
                    <Pagination className="flex-wrap">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => paginaActual > 0 && setPaginaActual(paginaActual - 1)}
                            className={paginaActual === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        {[...Array(totalPaginas)].map((_, index) => (
                          <PaginationItem key={index}>
                            <PaginationLink
                              onClick={() => setPaginaActual(index)}
                              isActive={paginaActual === index}
                              className="cursor-pointer"
                            >
                              {index + 1}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => paginaActual < totalPaginas - 1 && setPaginaActual(paginaActual + 1)}
                            className={paginaActual === totalPaginas - 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            </div>

            {/* Tabla de Detalles del Paquete - Observaciones solo para OBSERVADO */}
            <div className="lg:col-span-5">
              {paqueteSeleccionado ? (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-3 border-b flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Detalles del Paquete: {paqueteSeleccionado.codigoPaqueteSis}
                    </h3>
                    <Button
                      size="sm"
                      onClick={() => verificarReglasPaquete(paqueteSeleccionado.codigoPaqueteSis)}
                      disabled={loadingVerificacion}
                      className="bg-[#114C5F] hover:bg-[#0d3a4a] text-white text-xs h-7"
                    >
                      {loadingVerificacion ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          Verificar Reglas
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">ID Atención</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">N° FUA</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Estado del FUA</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Observaciones</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingDetalles ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-xs">
                              Cargando detalles...
                            </td>
                          </tr>
                        ) : detallesPaquete.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-xs">
                              No hay detalles disponibles
                            </td>
                          </tr>
                        ) : (
                          detallesPaquete.map((detalle) => (
                            <tr key={detalle.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-2 text-xs font-mono">{detalle.idAtencion}</td>
                              <td className="px-4 py-2 text-xs">{detalle.numeroFua}</td>
                              <td className="px-4 py-2 text-xs">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-semibold ${
                                    detalle.estado === "OBSERVADO"
                                      ? "bg-red-100 text-red-800"
                                      : detalle.estado === "ENVIADO"
                                      ? "bg-blue-100 text-blue-800"
                                      : detalle.estado === "CREADO"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {detalle.estado}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-xs">
                                {detalle.estado === "OBSERVADO" && detalle.observacion ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-xs text-red-700 hover:text-red-800"
                                    onClick={() => setDetalleSeleccionadoObservacion(detalle.observacion)}
                                  >
                                    Ver observaciones
                                  </Button>
                                ) : (
                                  <span className="text-[11px] text-gray-400">Sin observaciones</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <Button
                                  size="sm"
                                  onClick={() => handleVerAtencion(detalle)}
                                  disabled={loadingVerAtencion === detalle.idAtencion}
                                  className="bg-[#4F9BB6] hover:bg-[#4A6EB0] text-white text-xs h-6 px-2"
                                >
                                  {loadingVerAtencion === detalle.idAtencion ? (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  ) : (
                                    <Eye className="w-3 h-3 mr-1" />
                                  )}
                                  Ver
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* PaginaciÃ³n de detalles */}
                  {totalPaginasDetalles > 1 && (
                    <div className="flex justify-center py-3 border-t">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => paginaDetalles > 0 && setPaginaDetalles(paginaDetalles - 1)}
                              className={paginaDetalles === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          {[...Array(totalPaginasDetalles)].map((_, index) => (
                            <PaginationItem key={index}>
                              <PaginationLink
                                onClick={() => setPaginaDetalles(index)}
                                isActive={paginaDetalles === index}
                                className="cursor-pointer"
                              >
                                {index + 1}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => paginaDetalles < totalPaginasDetalles - 1 && setPaginaDetalles(paginaDetalles + 1)}
                              className={paginaDetalles === totalPaginasDetalles - 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border rounded-lg p-8 text-center text-gray-500">
                  <p>Seleccione un paquete para ver sus detalles</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialog de observaciones de detalle */}
      <Dialog
        open={!!detalleSeleccionadoObservacion}
        onOpenChange={(open) => !open && setDetalleSeleccionadoObservacion(null)}
      >
        <DialogContent className="bg-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Observaciones del FUA</DialogTitle>
            <DialogDescription className="text-sm text-gray-700 whitespace-pre-line">
              {detalleSeleccionadoObservacion}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => setDetalleSeleccionadoObservacion(null)}
              className="bg-[#4F9BB6] hover:bg-[#4A6EB0] text-white px-4 py-1 text-sm"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de verificación de reglas */}
      <Dialog
        open={mostrarVerificacion}
        onOpenChange={(open) => !open && setMostrarVerificacion(false)}
      >
        <DialogContent className="bg-white sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#114C5F]" />
              Verificación de Reglas - {paqueteSeleccionado?.codigoPaqueteSis}
            </DialogTitle>
          </DialogHeader>
          
          {verificacionReglas && (
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Estado general del paquete */}
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50">
                {getEstadoIcon(verificacionReglas.data.estado)}
                <div>
                  <p className="text-sm font-medium text-gray-700">Estado del Paquete</p>
                  <span className={`px-2 py-1 rounded text-xs font-semibold border ${getEstadoPaqueteColor(verificacionReglas.data.estado)}`}>
                    {verificacionReglas.data.estado}
                  </span>
                </div>
              </div>

              {/* Proceso actual */}
              <div className="p-3 rounded-lg border bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-2">Proceso Actual</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-[#114C5F] text-white px-2 py-1 rounded">
                    Código {verificacionReglas.data.proceso.codigo}
                  </span>
                  <span className="text-sm text-gray-600">{verificacionReglas.data.proceso.descripcion}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    verificacionReglas.data.proceso.estado === "Completado" 
                      ? "bg-green-100 text-green-800" 
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {verificacionReglas.data.proceso.estado}
                  </span>
                </div>
              </div>

              {/* Resumen de carga */}
              <div className="p-3 rounded-lg border bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-2">Resumen de Carga</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 bg-white rounded border">
                    <p className="text-lg font-bold text-blue-600">{verificacionReglas.data.carga.recepcionada}</p>
                    <p className="text-[10px] text-gray-500">Recepcionadas</p>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <p className="text-lg font-bold text-green-600">{verificacionReglas.data.carga.consolidada}</p>
                    <p className="text-[10px] text-gray-500">Consolidadas</p>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <p className="text-lg font-bold text-purple-600">{verificacionReglas.data.carga.produccion}</p>
                    <p className="text-[10px] text-gray-500">Producción</p>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <p className="text-lg font-bold text-red-600">{verificacionReglas.data.carga.observada}</p>
                    <p className="text-[10px] text-gray-500">Observadas</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mt-2">
                  <div className="p-2 bg-white rounded border">
                    <p className="text-sm font-bold text-orange-600">{verificacionReglas.data.carga.observadaDup}</p>
                    <p className="text-[10px] text-gray-500">Obs. Duplicadas</p>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <p className="text-sm font-bold text-amber-600">{verificacionReglas.data.carga.observadaRc}</p>
                    <p className="text-[10px] text-gray-500">Obs. RC</p>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <p className="text-sm font-bold text-rose-600">{verificacionReglas.data.carga.observadaCat}</p>
                    <p className="text-[10px] text-gray-500">Obs. Catálogo</p>
                  </div>
                </div>
              </div>

              {/* Lista de observaciones */}
              {verificacionReglas.data.observaciones.length > 0 && (
                <div className="p-3 rounded-lg border bg-red-50">
                  <p className="text-sm font-medium text-red-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Observaciones ({verificacionReglas.data.observaciones.length} FUAs con errores)
                  </p>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {verificacionReglas.data.observaciones.map((obs, index) => (
                      <div key={index} className="p-2 bg-white rounded border border-red-200">
                        <p className="text-xs font-semibold text-gray-700 mb-1">FUA: {obs.fua}</p>
                        <ul className="list-disc list-inside">
                          {obs.errores.map((error, errIndex) => (
                            <li key={errIndex} className="text-xs text-red-600">{error}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {verificacionReglas.data.observaciones.length === 0 && (
                <div className="p-4 rounded-lg border bg-green-50 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-700">Sin observaciones</p>
                  <p className="text-xs text-green-600">El paquete no presenta errores de validación</p>
                </div>
              )}
            </div>
          )}

          {errorVerificacion && (
            <div className="p-4 rounded-lg border bg-red-50 text-center">
              <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-red-700">{errorVerificacion}</p>
            </div>
          )}

          <div className="mt-4 flex justify-end pt-3 border-t">
            <Button
              onClick={() => setMostrarVerificacion(false)}
              className="bg-[#4F9BB6] hover:bg-[#4A6EB0] text-white px-4 py-1 text-sm"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Revisión de FUA */}
      {modalDetalle && (
        <PdfReviewModal
          open={modalRevisarOpen}
          onClose={() => setModalRevisarOpen(false)}
          citaId={modalCitaId}
          firmado={modalDetalle.estado !== "OBSERVADO"}
          requireRevert
          citaContext={{
            paciente: '',
            fecha: modalDetalle.fechaCreacion || '',
            hora: '',
            consultorioNombre: '',
            medicoNombre: '',
            seguroNombre: '',
            historia: '',
            seguro: '',
            numRef: '',
            entidadSis: '',
          }}
        />
      )}
    </div>
  )
}






