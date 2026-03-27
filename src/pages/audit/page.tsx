import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { OrigenSelector } from "@/components/selectors/OrigenSelector"
import { EspecialidadSimpleSelector } from "@/components/selectors/EspecialidadSimpleSelector"
import { EstadoSelector } from "@/components/selectors/EstadoSelector"
import { MedicoSelector } from "@/components/selectors/MedicoSelector"
import { useCatalogos } from "@/contexts/CatalogosContext"
import { Checkbox } from "@/components/ui/checkbox"
import { RefreshCw, FilterX, Eye, RotateCcw, Loader2, Check, X } from "lucide-react"
import { TurnoSelector } from "@/components/selectors/TurnoSelector"
import { PdfReviewModal } from "@/components/modals/PdfReviewModal"
import { buscarCitas, type Cita, type CitaResponse, marcarEnRevision, revertirCita, buscarCitaPorId, getEstadoString } from "@/services/citaService"
import DatePicker, { registerLocale } from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import "@/styles/datepicker-custom.css"
import { es } from 'date-fns/locale'

// Personalizar locale español con días abreviados
const esCustom = {
  ...es,
  localize: {
    ...es.localize,
    day: (n: number) => ['D', 'L', 'M', 'M', 'J', 'V', 'S'][n],
  },
  formatLong: {
    ...es.formatLong,
  }
}

// Registrar locale español personalizado para DatePicker
registerLocale('es', esCustom)

export default function AuditPage() {
  const { especialidades } = useCatalogos()
  const [searchParams, setSearchParams] = useSearchParams()
  const [origen, setOrigen] = useState("CE")
  const [especialidad, setEspecialidad] = useState("todos")
  const [estado, setEstado] = useState("PENDIENTE")
  const [medico, setMedico] = useState("todos")
  const [turno, setTurno] = useState<"M" | "T" | "TODOS">("TODOS")
  const [citaId, setCitaId] = useState(searchParams.get("citaId") || "")
  const [mostrarBusquedaCita, setMostrarBusquedaCita] = useState(!!searchParams.get("citaId"))

  // Leer citaId de URL params al montar
  useEffect(() => {
    const citaIdParam = searchParams.get("citaId")
    if (citaIdParam) {
      setCitaId(citaIdParam)
      setMostrarBusquedaCita(true)
      // Limpiar el param de la URL para no re-disparar
      setSearchParams({}, { replace: true })
    }
  }, [])
  
  // Inicializar con la fecha actual
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCitaId, setSelectedCitaId] = useState<string>("")
  const [selectedCita, setSelectedCita] = useState<Cita | null>(null)
  
  // Estados para la API
  const [atenciones, setAtenciones] = useState<Cita[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 0,
    size: 20,
    totalPages: 0,
    totalElements: 0
  })

  // Función para buscar cita por ID
  const buscarPorCitaId = async () => {
    if (!citaId.trim()) {
      setError("Por favor ingrese un ID de cita")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const cita = await buscarCitaPorId(citaId.trim())
      setAtenciones([cita])
      setPagination({
        page: 0,
        size: 1,
        totalPages: 1,
        totalElements: 1
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al buscar la cita")
      console.error("Error al buscar cita por ID:", err)
      setAtenciones([])
    } finally {
      setLoading(false)
    }
  }

  // Función para cargar citas desde la API
  const cargarCitas = async (page: number = 0) => {
    // Si hay un ID de cita, buscar por ID en lugar de filtros
    if (citaId.trim()) {
      buscarPorCitaId()
      return
    }

    if (!selectedDate) {
      setError("Por favor seleccione una fecha")
      return
    }

    // No cargar si no hay especialidad seleccionada
    if (especialidad === "todos") {
      setAtenciones([])
      setPagination({
        page: 0,
        size: 20,
        totalPages: 0,
        totalElements: 0
      })
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Usar el idEspecialidadSgh (código SGH) si está disponible en el catálogo
      const especialidadCatalogo = especialidades.find(e => e.id === especialidad)
      const especialidadApi = especialidadCatalogo?.idEspecialidadSgh || especialidad

      const response: CitaResponse = await buscarCitas({
        desde: selectedDate,
        hasta: selectedDate,
        // Para el API se debe usar el código SGH (idEspecialidadSgh), por ejemplo 0031 para Anestesiología
        especialidad: especialidad !== "todos" ? especialidadApi : undefined,
        medico: medico !== "todos" ? medico : undefined,
        turnoConsulta: turno !== "TODOS" ? turno : undefined,
        estadoAuditoria: estado !== "todos" ? estado : undefined,
        page,
        size: 20 // Siempre usar tamaño de página por defecto
      })

      setAtenciones(response.content || [])
      setPagination({
        page: response.number,
        size: response.size,
        totalPages: response.totalPages,
        totalElements: response.totalElements
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar las citas")
      console.error("Error al cargar citas:", err)
    } finally {
      setLoading(false)
    }
  }

  // Cargar datos al montar el componente y cuando cambien los filtros
  useEffect(() => {
    if (citaId.trim()) {
      // Si hay un ID de cita, buscar por ID
      buscarPorCitaId()
    } else if (selectedDate) {
      // Si no hay ID de cita, buscar por filtros
      cargarCitas(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, especialidad, medico, turno, estado, citaId])

  const handleActualizar = () => {
    cargarCitas(pagination.page)
  }

  const handleLimpiarFiltros = () => {
    setOrigen("CE")
    setEspecialidad("todos")
    setMedico("todos")
    setTurno("TODOS")
    setEstado("PENDIENTE")
    setCitaId("")
    setMostrarBusquedaCita(false)
    setSelectedDate(new Date())
  }

  const handlePageChange = (newPage: number) => {
    cargarCitas(newPage)
  }

  const handleRevisar = async (citaId: string) => {
    try {
      // Buscar la cita en la lista actual
      const cita = atenciones.find(a => a.citaId === citaId)
      if (!cita) {
        console.error("Cita no encontrada")
        return
      }
      
      const estadoActual = getEstadoString(cita.estadoAuditoria as any)
      
      // Solo marcar como "En Revisión" si NO está en estado SUBSANADO, OBSERVADO o APROBADO
      if (estadoActual !== "SUBSANADO" && estadoActual !== "OBSERVADO" && estadoActual !== "APROBADO") {
        await marcarEnRevision(citaId)
        // Recargar la lista para reflejar el cambio de estado
        cargarCitas(pagination.page)
      }
      
      setSelectedCitaId(citaId)
      setSelectedCita(cita)
      setModalOpen(true)
    } catch (error) {
      console.error("Error al marcar cita en revisión:", error)
      // Aún así, abrir el modal si encontramos la cita
      const cita = atenciones.find(a => a.citaId === citaId)
      if (cita) {
        setSelectedCitaId(citaId)
        setSelectedCita(cita)
        setModalOpen(true)
      }
    }
  }

  const handleAprobar = async () => {
    console.log("Aprobando cita:", selectedCitaId)
    // Aquí iría la lógica para aprobar
  }

  const handleRevertir = async (citaId: string) => {
    try {
      await revertirCita(citaId)
      // Recargar la lista para reflejar el cambio de estado
      cargarCitas(pagination.page)
    } catch (error) {
      console.error("Error al revertir cita:", error)
      setError("Error al revertir el estado de la cita")
    }
  }


  const getEstadoBadge = (estado: string) => {
    const badges = {
      "PENDIENTE": "bg-yellow-100 text-yellow-800 border border-yellow-300",
      "EN_REVISION": "bg-blue-100 text-blue-800 border border-blue-300",
      "APROBADO": "bg-green-100 text-green-800 border border-green-300",
      "OBSERVADO": "bg-red-100 text-red-800 border border-red-300",
      "SUBSANADO": "bg-purple-100 text-purple-800 border border-purple-300",
      "COMPLETADO": "bg-teal-100 text-teal-800 border border-teal-300",
    }
    return badges[estado as keyof typeof badges] || "bg-gray-100 text-gray-800 border border-gray-300"
  }

  const getEstadoLabel = (estado: string) => {
    const labels = {
      "PENDIENTE": "Pendiente",
      "EN_REVISION": "En Revisión",
      "APROBADO": "Aprobado",
      "OBSERVADO": "Observado",
      "SUBSANADO": "Subsanado",
      "COMPLETADO": "Completado",
    }
    return labels[estado as keyof typeof labels] || estado
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-[#9CD2D3]/30 p-8">
        {/* Header con título y botones */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#9CD2D3]/20">
          <h1 className="text-2xl font-semibold text-[#114C5F]">Lista de Atenciones por Auditar</h1>
          <div className="flex gap-3">
            <Button onClick={handleActualizar} className="text-white bg-[#4F9BB6] hover:bg-[#4A6EB0] hover:to-[#4F9BB6] shadow-md">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button onClick={handleLimpiarFiltros} variant="outline" className="border-[#9CD2D3] text-[#114C5F] hover:bg-[#9CD2D3]/10">
              <FilterX className="w-4 h-4 mr-2" />
              Limpiar Filtros
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-8">
          {/* Checkbox para mostrar búsqueda por ID */}
          <div className="mb-4 flex items-center space-x-2">
            <Checkbox 
              id="mostrar-busqueda-cita"
              checked={mostrarBusquedaCita}
              onCheckedChange={(checked) => {
                setMostrarBusquedaCita(checked as boolean)
                if (!checked) {
                  setCitaId("")
                }
              }}
            />
            <label
              htmlFor="mostrar-busqueda-cita"
              className="text-sm font-medium text-[#114C5F] cursor-pointer"
            >
              Buscar por ID de Cita
            </label>
          </div>

          {/* Búsqueda por ID de Cita */}
          {mostrarBusquedaCita && (
            <div className="mb-6 p-4 bg-gradient-to-r from-[#4F9BB6]/5 to-[#9CD2D3]/5 rounded-lg border border-[#9CD2D3]/30">
              <label htmlFor="filtro-cita-id" className="block text-sm font-medium text-[#114C5F] mb-2">
                ID de Cita
              </label>
              <div className="flex gap-3">
                <input
                  id="filtro-cita-id"
                  type="text"
                  value={citaId}
                  onChange={(e) => setCitaId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && buscarPorCitaId()}
                  placeholder="Ingrese el ID de la cita (ej: 250184422)"
                  className="flex-1 px-4 py-2 border border-[#9CD2D3] rounded-md focus:ring-2 focus:ring-[#4F9BB6] focus:border-[#4F9BB6] transition-all text-[#114C5F]"
                />
                <Button 
                  onClick={buscarPorCitaId}
                  disabled={!citaId.trim()}
                  className="bg-[#4F9BB6] hover:bg-[#4A6EB0] text-white shadow-md"
                >
                  Buscar
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Nota: Al buscar por ID de cita, los demás filtros se ignorarán
              </p>
            </div>
          )}

          {/* Matriz 3x2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-50">
            {/* Fila 1 - Columna 1: Fecha */}
            <div>
              <label htmlFor="filtro-fecha" className="block text-sm font-medium text-[#114C5F] mb-2 flex items-center gap-2">
                Fecha
              </label>
              <DatePicker
                id="filtro-fecha"
                selected={selectedDate}
                onChange={(date: Date | null) => date && setSelectedDate(date)}
                dateFormat="dd/MM/yyyy"
                locale="es"
                className="inline-flex items-center gap-2 whitespace-nowrap text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border bg-background hover:text-accent-foreground px-4 py-2 w-full justify-between font-normal h-[38px] border-[#9CD2D3] hover:border-[#4F9BB6] hover:bg-white focus:ring-2 focus:ring-[#4F9BB6] focus:border-[#4F9BB6] transition-all rounded-md text-[#114C5F]"
                placeholderText="Seleccione una fecha"
                calendarClassName="bg-white shadow-lg border border-gray-300"
                popperClassName="react-datepicker-popper-solid"
              />
            </div>
            
            {/* Fila 1 - Columna 2: Origen */}
            <div className="relative z-10">
              <OrigenSelector value={origen} onChange={setOrigen} />
            </div>

       {/* Fila 2 - Columna 1: Turno */}
          <div>
            <TurnoSelector value={turno} onChange={setTurno} />
          </div>

            {/* Fila 2 - Columna 2: Especialidad */}
            <div className="relative z-40">
              <EspecialidadSimpleSelector 
                value={especialidad} 
                onChange={setEspecialidad}
                label="Especialidad"
              />
            </div>

            {/* Fila 3 - Columna 1: Médico */}
            {<div className="relative z-30">
              <MedicoSelector
                value={medico}
                onChange={setMedico}
                fechaInicio={selectedDate}
                fechaFin={selectedDate}
                idEspecialidadSolicitud={especialidad !== "todos" ? especialidad : "0001"}
              />
            </div>}

            {/* Fila 3 - Columna 2: Estado */}
            <div className="relative z-20">
              <EstadoSelector value={estado} onChange={setEstado} />
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="border border-[#9CD2D3]/30 rounded-xl overflow-hidden shadow-sm relative z-10">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-[#4F9BB6]/10 to-[#9CD2D3]/10 border-b border-[#9CD2D3]/30">
                <TableHead className="font-semibold text-[#114C5F]">CITA ID</TableHead>
                <TableHead className="font-semibold text-[#114C5F]">PACIENTE</TableHead>
                <TableHead className="font-semibold text-[#114C5F]">HISTORIA</TableHead>
                <TableHead className="font-semibold text-[#114C5F]">CONSULTORIO</TableHead>
                <TableHead className="font-semibold text-[#114C5F]">MÉDICO</TableHead>
                <TableHead className="font-semibold text-[#114C5F]">FECHA Y HORA</TableHead>
                <TableHead className="font-semibold text-[#114C5F]">ESTADO</TableHead>
                <TableHead className="font-semibold text-[#114C5F] text-center">FIRMADO</TableHead>
                <TableHead className="font-semibold text-[#114C5F] text-center">ACCIONES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-[#4F9BB6]" />
                      <p className="text-gray-500">Cargando atenciones...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-red-500 font-medium">Error al cargar datos</p>
                      <p className="text-gray-500 text-sm">{error}</p>
                      <Button onClick={() => cargarCitas(0)} variant="outline" className="mt-2">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reintentar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : atenciones.length === 0 && especialidad === "todos" && !citaId.trim() ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <p className="text-gray-500">Por favor seleccione una especialidad para ver las atenciones</p>
                  </TableCell>
                </TableRow>
              ) : atenciones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <p className="text-gray-500">No se encontraron atenciones con los filtros seleccionados</p>
                  </TableCell>
                </TableRow>
              ) : atenciones.map((atencion, index) => (
                <TableRow key={`${atencion.citaId}-${index}`}>
                  <TableCell className="font-medium">{atencion.citaId}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{atencion.nombre}</span>
                      <span className="text-xs text-gray-500">{atencion.paciente}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{atencion.historia}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{atencion.consultorioNombre}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{atencion.medicoNombre}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {atencion.fecha && atencion.hora ? (
                      <div className="flex flex-col">
                        <span>{new Date(atencion.fecha).toLocaleDateString('es-PE')}</span>
                        <span className="text-xs text-gray-500">{atencion.hora}</span>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getEstadoBadge(getEstadoString(atencion.estadoAuditoria as any))}`}>
                      {getEstadoLabel(getEstadoString(atencion.estadoAuditoria as any))}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {atencion.firmado ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
                        <Check className="w-4 h-4 text-green-600" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100">
                        <X className="w-4 h-4 text-red-600" />
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        onClick={() => handleRevisar(atencion.citaId)}
                        className="bg-[#4F9BB6] hover:bg-[#4A6EB0] text-white shadow-sm"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Revisar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#4A6EB0] text-[#4A6EB0] hover:bg-[#4A6EB0]/10"
                            disabled={getEstadoString(atencion.estadoAuditoria as any) === "SUBSANADO" || getEstadoString(atencion.estadoAuditoria as any) === "COMPLETADO"}
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Revertir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="border-[#9CD2D3]/60 shadow-xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-lg font-semibold text-[#114C5F]">
                              ¿Está seguro de revertir esta atención al estado PENDIENTE?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-sm text-gray-600">
                              Esta acción cambiará el estado de auditoría de la atención a PENDIENTE. Podrá volver a modificarla más adelante, pero los cambios actuales de auditoría se verán afectados.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-[#9CD2D3] text-[#114C5F] hover:bg-[#9CD2D3]/10">
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700 text-white shadow-md"
                              onClick={() => handleRevertir(atencion.citaId)}
                            >
                              Sí, revertir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        {!loading && atenciones.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando {pagination.page * pagination.size + 1} - {Math.min((pagination.page + 1) * pagination.size, pagination.totalElements)} de {pagination.totalElements} resultados
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => pagination.page > 0 && handlePageChange(pagination.page - 1)}
                    className={pagination.page === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = pagination.page < 3 ? i : pagination.page - 2 + i
                  if (pageNum >= pagination.totalPages) return null
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink 
                        onClick={() => handlePageChange(pageNum)}
                        isActive={pageNum === pagination.page}
                        className="cursor-pointer"
                      >
                        {pageNum + 1}
                      </PaginationLink>
                    </PaginationItem>
                  )
                })}
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => pagination.page < pagination.totalPages - 1 && handlePageChange(pagination.page + 1)}
                    className={pagination.page >= pagination.totalPages - 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Modal para revisar PDF */}
      {selectedCita && (
        <PdfReviewModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          citaId={selectedCitaId}
          citaContext={{
            paciente: selectedCita.paciente,
            fecha: selectedCita.fecha,
            hora: selectedCita.hora,
            consultorioNombre: selectedCita.consultorioNombre,
            medicoNombre: selectedCita.medicoNombre,
            seguroNombre: selectedCita.seguroNombre,
            historia: selectedCita.historia,
            seguro: selectedCita.seguro,
            numRef: selectedCita.numRef,
            entidadSis: selectedCita.entidadSis
          }}
          estadoAuditoria={getEstadoString(selectedCita.estadoAuditoria as any)}
          firmado={selectedCita.firmado}
          onAprobar={handleAprobar}
          onRefresh={() => cargarCitas(pagination.page)}
        />
      )}
    </div>
  )
}
