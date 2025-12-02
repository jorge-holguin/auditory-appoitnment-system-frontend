import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, FilterX, Download, Loader2, Calendar, CheckCircle2, Upload, Package, AlertTriangle } from "lucide-react"

import { OrigenSelector } from "@/components/selectors/OrigenSelector"
import { EspecialidadSimpleSelector } from "@/components/selectors/EspecialidadSimpleSelector"
import { EstadoFuaSelector } from "@/components/selectors/EstadoFuaSelector"
import { DateRangePickerAria } from "@/components/ui/DateRangePickerAria"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { DateValue } from "@internationalized/date"
import { listarFuas, descargarZip, descargarBlob, enviarPaqueteAlSis, actualizarEstadoPaqueteSis, type Fua, type DescargarZipRequest, type DescargarZipResponse } from "@/services/tramaService"
import { format } from "date-fns"
import { parseDate } from "@internationalized/date"


export default function PlotPage() {
  // Estados para filtros
  const [origen, setOrigen] = useState<string>("CE")
  const [especialidad, setEspecialidad] = useState<string>("todos")
  const [estado, setEstado] = useState<string>("2")
  
  // Inicializar con la fecha de hoy
  const today = new Date()
  const todayParsed = parseDate(format(today, "yyyy-MM-dd"))
  
  const [dateRange, setDateRange] = useState<{ start: DateValue | null; end: DateValue | null }>({
    start: todayParsed,
    end: todayParsed,
  })
  
  // Estados para datos
  const [fuas, setFuas] = useState<Fua[]>([])
  const [loading, setLoading] = useState(false)
  const [cargandoEnvioPaquete, setCargandoEnvioPaquete] = useState(false)
  const [pageSize, setPageSize] = useState<number>(25)
  const [currentPage, setCurrentPage] = useState<number>(0)

  // Estados para el dialog de confirmación del paquete
  const [showPackageDialog, setShowPackageDialog] = useState(false)
  const [paqueteGenerado, setPaqueteGenerado] = useState<DescargarZipResponse | null>(null)
  const [enviandoAlSis, setEnviandoAlSis] = useState(false)
  
  // Estados para el dialog de éxito
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [generatedFileName, setGeneratedFileName] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isErrorDialog, setIsErrorDialog] = useState(false)
  
  // Estados para el dialog de descarga
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)


  // Función para extraer el correlativo del nombre del archivo
  const obtenerCorrelativo = (nombreArchivo: string, longitud: number = 5): string => {
    if (!nombreArchivo) return '0'
    const sinExtension = nombreArchivo.replace(/\.zip$/i, '')
    const ultimos = sinExtension.slice(-longitud)
    // Convertir a número para eliminar ceros a la izquierda, luego a string
    return Number(ultimos).toString()
  }

  // Cargar FUAs al montar y cuando cambien los filtros
  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      cargarFuas()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origen, especialidad, estado, dateRange])

  const cargarFuas = async () => {
    if (!dateRange.start || !dateRange.end) {
      alert("Por favor seleccione un rango de fechas")
      return
    }

    // No cargar si no hay especialidad seleccionada
    if (especialidad === "todos") {
      setFuas([])
      setCurrentPage(0)
      return
    }

    setLoading(true)
    try {
      // Convertir DateValue a Date y formatear
      const fechaInicial = format(new Date(dateRange.start.year, dateRange.start.month - 1, dateRange.start.day), "dd-MM-yyyy")
      const fechaFinal = format(new Date(dateRange.end.year, dateRange.end.month - 1, dateRange.end.day), "dd-MM-yyyy")

      const params = {
        fechaInicial,
        fechaFinal,
        idOrigen: origen !== "todos" ? origen : "CE",
        idEstado: estado !== "todos" ? parseInt(estado) : 2,
        idEspecialidad: especialidad !== "todos" ? especialidad : undefined
      }

      const data = await listarFuas(params)
      setFuas(data)
      setCurrentPage(0)
    } catch (error) {
      console.error("Error al cargar FUAs:", error)
      alert("Error al cargar los datos. Por favor intente nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerarPaquete = async () => {
    if (!dateRange.start || !dateRange.end) {
      alert("Por favor seleccione un rango de fechas")
      return
    }

    if (especialidad === "todos") {
      alert("Por favor seleccione una especialidad específica")
      return
    }

    // Usar todos los FUAs cargados
    const idsAtencion = fuas.map(fua => fua.id)

    if (idsAtencion.length === 0) {
      alert("No hay FUAs para generar el paquete")
      return
    }

    setCargandoEnvioPaquete(true)
    try {
      const fechaInicio = format(new Date(dateRange.start.year, dateRange.start.month - 1, dateRange.start.day), "dd-MM-yyyy")
      const fechaFin = format(new Date(dateRange.end.year, dateRange.end.month - 1, dateRange.end.day), "dd-MM-yyyy")

      // Obtener nombre de la especialidad
      const especialidadNombre = fuas.find(f => f.id === idsAtencion[0])?.especialidad || "ESPECIALIDAD"

      const request: DescargarZipRequest = {
        idsAtencion,
        idPaqueteSis: "00004",
        crearPaqueteDb: true,
        fechaInicio,
        fechaFin,
        especialidad: especialidadNombre
      }

      const response = await descargarZip(request)
      
      // Guardar el paquete generado y mostrar el diálogo de confirmación
      setPaqueteGenerado(response)
      setShowPackageDialog(true)
    } catch (error) {
      console.error("Error al generar paquete:", error)
      alert("Error al generar el paquete. Por favor intente nuevamente.")
    } finally {
      setCargandoEnvioPaquete(false)
    }
  }

  const handleDescargarPaquete = () => {
    if (!paqueteGenerado) return
    
    descargarBlob(paqueteGenerado.blob, paqueteGenerado.nombreArchivo)
    // NO cerrar el diálogo para permitir también enviar al SIS
    
    // Mostrar diálogo de confirmación de descarga
    setShowDownloadDialog(true)
  }

  const handleEnviarAlSis = async () => {
    if (!paqueteGenerado) return
    
    setEnviandoAlSis(true)
    try {
      // 1. Enviar el ZIP al SIS usando FormData
      const respuestaSis = await enviarPaqueteAlSis(paqueteGenerado.blob, paqueteGenerado.nombreArchivo)
      
      // 2. Extraer el correlativo del nombre del archivo (últimos 5 dígitos sin ceros a la izquierda)
      // Ejemplo: 0000594720251100036.zip -> 00036 -> 36
      const idCorrelativo = obtenerCorrelativo(paqueteGenerado.nombreArchivo)
      
      // 3. Actualizar el estado del paquete a ENVIADO usando el correlativo
      await actualizarEstadoPaqueteSis(idCorrelativo, 'ENVIADO')
      
      setShowPackageDialog(false)
      
      // Mostrar diálogo de resultado con el mensaje del backend
      setGeneratedFileName(paqueteGenerado.nombreArchivo)
      
      if (respuestaSis.estado === 'ok') {
        setIsErrorDialog(false)
        setSuccessMessage(`${respuestaSis.mensaje}\n\nEl paquete ${paqueteGenerado.nombreArchivo} (ID Correlativo: ${idCorrelativo}) fue procesado exitosamente y su estado ha sido actualizado a ENVIADO.`)
      } else {
        setIsErrorDialog(true)
        setSuccessMessage(`${respuestaSis.mensaje}\n\nErrores: ${respuestaSis.errores.join(', ')}`)
      }
      
      setShowSuccessDialog(true)
    } catch (error) {
      console.error("Error al enviar paquete al SIS:", error)
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"

      // Cerrar el diálogo del paquete y mostrar diálogo de error
      setShowPackageDialog(false)
      setGeneratedFileName(paqueteGenerado?.nombreArchivo || "")
      setIsErrorDialog(true)
      setSuccessMessage(`Error al enviar el paquete al SIS:\n\n${errorMessage}\n\nPor favor intente nuevamente.`)
      setShowSuccessDialog(true)
    } finally {
      setEnviandoAlSis(false)
    }
  }

  const handleActualizar = () => {
    cargarFuas()
  }

  const handleLimpiarFiltros = () => {
    setOrigen("CE")
    setEspecialidad("todos")
    setEstado("2")
    const today = new Date()
    const todayParsed = parseDate(format(today, "yyyy-MM-dd"))
    setDateRange({ start: todayParsed, end: todayParsed })
    setCurrentPage(0)
  }

  const totalPages = Math.max(1, Math.ceil(fuas.length / pageSize) || 1)
  const safeCurrentPage = Math.min(currentPage, totalPages - 1)
  const startIndex = safeCurrentPage * pageSize
  const endIndex = startIndex + pageSize
  const pageFuas = fuas.slice(startIndex, endIndex)

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-[#9CD2D3]/30 p-8">
        {/* Header con título y botones */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#9CD2D3]/20">
          <h1 className="text-2xl font-semibold text-[#114C5F]">Generación de Tramas</h1>
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
          {/* Filtros responsive */}
          <div className="space-y-4 mb-6">
            {/* Desktop: Una fila con todos los filtros */}
            <div className="hidden lg:grid lg:grid-cols-12 gap-3 items-end">
              <div className="col-span-2">
                <OrigenSelector
                  value={origen}
                  onChange={setOrigen}
                  label="Origen"
                />
              </div>
              
              <div className="col-span-3">
                <EspecialidadSimpleSelector
                  value={especialidad}
                  onChange={setEspecialidad}
                  label="Especialidad"
                  defaultOpen={true}
                />
              </div>
              
              <div className="col-span-2">
                <EstadoFuaSelector
                  value={estado}
                  onChange={setEstado}
                  label="Estado"
                />
              </div>
              
              <div className="col-span-3">
                <div className="relative">
                  <DateRangePickerAria
                    value={dateRange}
                    onChange={setDateRange}
                    label="Fecha"
                  />
                  <Calendar className="absolute right-3 top-9 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              
              <div className="col-span-2">
                <Button 
                  onClick={handleGenerarPaquete}
                  disabled={cargandoEnvioPaquete || loading || fuas.length === 0}
                  className="w-full h-10 bg-[#4F9BB6] hover:bg-[#4A6EB0] text-white font-medium disabled:opacity-50"
                >
                  {cargandoEnvioPaquete ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Generar Paquete
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Tablet: 2x2 + botón */}
            <div className="hidden md:grid lg:hidden md:grid-cols-2 gap-3">
              <OrigenSelector
                value={origen}
                onChange={setOrigen}
                label="Origen"
              />
              
              <EspecialidadSimpleSelector
                value={especialidad}
                onChange={setEspecialidad}
                label="Especialidad"
              />
              
              <EstadoFuaSelector
                value={estado}
                onChange={setEstado}
                label="Estado"
              />
              
              <DateRangePickerAria
                value={dateRange}
                onChange={setDateRange}
                label="Fecha"
              />
              
              <div className="col-span-2">
                <Button 
                  onClick={handleGenerarPaquete}
                  disabled={cargandoEnvioPaquete || loading || fuas.length === 0}
                  className="w-full h-10 bg-[#4F9BB6] hover:bg-[#4A6EB0] text-white font-medium disabled:opacity-50"
                >
                  {cargandoEnvioPaquete ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Generar Paquete
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Mobile: Columna única */}
            <div className="grid md:hidden grid-cols-1 gap-3">
              <OrigenSelector
                value={origen}
                onChange={setOrigen}
                label="Origen"
              />
              
              <EspecialidadSimpleSelector
                value={especialidad}
                onChange={setEspecialidad}
                label="Especialidad"
              />
              
              <EstadoFuaSelector
                value={estado}
                onChange={setEstado}
                label="Estado"
              />
              
              <DateRangePickerAria
                value={dateRange}
                onChange={setDateRange}
                label="Fecha"
              />
              
              <Button 
                onClick={handleGenerarPaquete}
                disabled={cargandoEnvioPaquete || loading || fuas.length === 0}
                className="w-full h-10 bg-[#4F9BB6] hover:bg-[#4A6EB0] text-white font-medium disabled:opacity-50"
              >
                {cargandoEnvioPaquete ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Generar Paquete
                  </>
                )}
              </Button>
            </div>

            {/* Fila 2 */}
            

          

        {/*     <div className="space-y-2">
              <Label htmlFor="fileUpload">Enviar paquete al SIS:</Label>
              <div className="flex gap-2">
                <Input
                  ref={fileInputRef}
                  id="fileUpload"
                  type="file"
                  accept=".zip"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                <Button
                  onClick={handleEnviarPaquete}
                  disabled={!archivoSeleccionado}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar
                </Button>
              </div>
              {archivoSeleccionado && (
                <p className="text-xs text-gray-600">Archivo: {archivoSeleccionado.name}</p>
              )}
            </div> */}
          </div>

          {/* Tabla de FUAs */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">N° Cuenta</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">HC</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Paciente</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tipo de Atención</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Especialidad</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Cargando FUAs...
                      </td>
                    </tr>
                  ) : fuas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        {especialidad === "todos" 
                          ? "Por favor seleccione una especialidad para ver las atenciones"
                          : "No se encontraron FUAs con los filtros seleccionados"}
                      </td>
                    </tr>
                  ) : (
                    pageFuas.map((fua) => (
                      <tr 
                        key={fua.id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-sm">{(fua as any).idCuenta || fua.id}</td>
                        <td className="px-4 py-3 text-sm">{(fua as any).historia?.trim() || (fua as any).hc || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{(fua as any).nombres?.trim() || (fua as any).paciente || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{(fua as any).tipoAtencion?.trim() || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wide ${
                              fua.estado === "2" || fua.estado === "PENDIENTE"
                                ? "bg-green-100 text-green-800"
                                : fua.estado === "3" || fua.estado === "EN PROCESO"
                                ? "bg-cyan-100 text-cyan-800"
                                : fua.estado === "1" || fua.estado === "CERRADO"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {fua.estado === "2" ? "Pendiente" : fua.estado === "3" ? "Validado" : fua.estado === "4" ? "Cerrado" : fua.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{(fua as any).especialidad || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Información, selección y paginación */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
            <div className="flex items-center justify-between">
              <span>
                Mostrando {fuas.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, fuas.length)} de {fuas.length} registros
              </span>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#114C5F]">Registros por página:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newSize = Number(e.target.value) || 25
                    setPageSize(newSize)
                    setCurrentPage(0)
                  }}
                  className="border border-[#9CD2D3] rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F9BB6]"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#114C5F] mr-2">
                  Página {safeCurrentPage + 1} de {totalPages}
                </span>
                <Pagination className="w-auto mx-0">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={(e) => {
                          e.preventDefault()
                          if (safeCurrentPage > 0) setCurrentPage(safeCurrentPage - 1)
                        }}
                        className={safeCurrentPage === 0 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink
                        isActive
                        size="default"
                        className="cursor-default select-none"
                      >
                        {safeCurrentPage + 1}
                      </PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        onClick={(e) => {
                          e.preventDefault()
                          if (safeCurrentPage < totalPages - 1) setCurrentPage(safeCurrentPage + 1)
                        }}
                        className={safeCurrentPage >= totalPages - 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Diálogo de confirmación del paquete */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent className="bg-white sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-blue-100 p-3">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">
              Paquete Generado
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              El paquete <span className="font-semibold text-gray-900">{paqueteGenerado?.nombreArchivo}</span> ha sido generado exitosamente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">ID del Paquete</div>
              <div className="font-mono text-lg font-semibold text-gray-900">{paqueteGenerado?.idPaquete}</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Nombre del archivo</div>
              <div className="font-mono text-sm font-semibold text-gray-900">{paqueteGenerado?.nombreArchivo}</div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              onClick={handleDescargarPaquete}
              variant="outline"
              className="flex-1 border-[#4F9BB6] text-[#4F9BB6] hover:bg-[#4F9BB6] hover:text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar
            </Button>
            <Button
              onClick={handleEnviarAlSis}
              disabled={enviandoAlSis}
              className="flex-1 bg-[#4F9BB6] hover:bg-[#4A6EB0] text-white"
            >
              {enviandoAlSis ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar al SIS
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de descarga */}
      <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <Download className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">
              Descarga Exitosa
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              El paquete <span className="font-semibold text-gray-900">{paqueteGenerado?.nombreArchivo}</span> fue descargado exitosamente. Puede continuar y enviarlo al SIS si lo desea.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button
              onClick={() => setShowDownloadDialog(false)}
              className="bg-[#4F9BB6] hover:bg-[#4A6EB0] text-white"
            >
              Aceptar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de resultado */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className={`rounded-full p-3 ${isErrorDialog ? 'bg-red-100' : 'bg-green-100'}`}>
                {isErrorDialog ? (
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                ) : (
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                )}
              </div>
            </div>
            <DialogTitle className="text-center text-xl">
              {isErrorDialog ? 'Error al enviar al SIS' : '¡Operación Exitosa!'}
            </DialogTitle>
            <DialogDescription className="text-center pt-2 whitespace-pre-line">
              {successMessage || `El paquete ${generatedFileName} fue procesado con éxito.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button
              onClick={() => setShowSuccessDialog(false)}
              className="bg-[#4F9BB6] hover:bg-[#4A6EB0] text-white"
            >
              Aceptar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}