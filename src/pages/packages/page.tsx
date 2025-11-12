import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, RefreshCw, FilterX } from "lucide-react"
import { EstadoPaqueteSelector } from "@/components/selectors/EstadoPaqueteSelector"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"

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

export default function PackagesPage() {
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
  const tamanio = 10

  // Fetch paquetes from API
  const fetchPaquetes = async () => {
    try {
      setLoading(true)
      const response = await fetch(`http://192.168.0.252:9004/interoperabilidadsis/api/v1/paquete-sis?pagina=${paginaActual}&tamanio=${tamanio}`)
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
      const response = await fetch(`http://192.168.0.252:9004/interoperabilidadsis/api/v1/paquete-sis/${idPaquete}/detalle?pagina=${paginaDetalles}&tamanio=${tamanio}`)
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

  // Load paquetes on mount and when filters change
  useEffect(() => {
    fetchPaquetes()
  }, [paginaActual])

  const handlePaqueteClick = (paquete: Paquete) => {
    setPaqueteSeleccionado(paquete)
    setPaginaDetalles(0)
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
        {/* Header con título y botones */}
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
                  placeholder="Ingrese número de paquete"
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

            <div className="flex items-end justify-end">
              <Button variant="destructive">
                Anular Paquete
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
                {/* Paginación de paquetes */}
                {totalPaginas > 1 && (
                  <div className="flex justify-center py-4 border-t">
                    <Pagination>
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

            {/* Tabla de Detalles del Paquete - 4 columnas */}
            <div className="lg:col-span-5">
              {paqueteSeleccionado ? (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-3 border-b">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Detalles del Paquete: {paqueteSeleccionado.codigoPaqueteSis}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">N° FUA</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Estado del FUA</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingDetalles ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-gray-500 text-xs">
                              Cargando detalles...
                            </td>
                          </tr>
                        ) : detallesPaquete.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-gray-500 text-xs">
                              No hay detalles disponibles
                            </td>
                          </tr>
                        ) : (
                          detallesPaquete.map((detalle) => (
                            <tr key={detalle.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-2 text-xs">{detalle.numeroFua}</td>
                              <td className="px-4 py-2 text-xs">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-semibold ${
                                    detalle.estado === "ENVIADO"
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
                                <Button size="sm" variant="ghost" className="h-6 px-2">
                                  Ver
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* Paginación de detalles */}
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
    </div>
  )
}