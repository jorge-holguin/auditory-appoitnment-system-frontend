import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, FilterX, Download, Loader2, Calendar, CheckCircle2, Upload, Package, AlertTriangle, Check, X } from "lucide-react"

import { OrigenSelector } from "@/components/selectors/OrigenSelector"
import { EspecialidadSimpleSelector } from "@/components/selectors/EspecialidadSimpleSelector"
import { EstadoFuaSelector } from "@/components/selectors/EstadoFuaSelector"
import { TurnoSelector } from "@/components/selectors/TurnoSelector"
import { FirmadoSelector } from "@/components/selectors/FirmadoSelector"
import { Checkbox } from "@/components/ui/checkbox"
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
import { listarFuas, descargarZip, descargarBlob, enviarPaqueteAlSis, actualizarEstadoPaqueteSis, type Fua, type DescargarZipRequest, type DescargarZipResponse, type ErrorDetalle } from "@/services/tramaService"
import { format } from "date-fns"
import { parseDate } from "@internationalized/date"
import { MedicoSelector } from "@/components/selectors/MedicoSelector"


export default function PlotPage() {
  // Estados para filtros
  const [origen, setOrigen] = useState<string>("CE")
  const [especialidad, setEspecialidad] = useState<string>("0001") // TERAPIA FISICA
  const [medico, setMedico] = useState<string>("todos")
  const [estado, setEstado] = useState<string>("2")
  const [turno, setTurno] = useState<"M" | "T" | "TODOS">("TODOS")
  const [filtroFirmado, setFiltroFirmado] = useState<string>("FIRMADO")
  const [busquedaFua, setBusquedaFua] = useState<string>("")
  
  // Estado para selección de FUAs
  const [selectedFuas, setSelectedFuas] = useState<Set<string>>(new Set())
  
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
  
  // Estados para errores detallados
  const [errorDetails, setErrorDetails] = useState<ErrorDetalle[] | null>(null)

  // Función para extraer el correlativo del nombre del archivo
  const obtenerCorrelativo = (nombreArchivo: string, longitud: number = 5): string => {
    if (!nombreArchivo) return '0'
    const sinExtension = nombreArchivo.replace(/\.zip$/i, '')
    const ultimos = sinExtension.slice(-longitud)
    // Convertir a número para eliminar ceros a la izquierda, luego a string
    return Number(ultimos).toString()
  }

  // Función para descargar errores como archivo TXT
  const handleDescargarErrores = () => {
    if (!errorDetails || errorDetails.length === 0) return
    
    let contenido = `ERRORES DETECTADOS AL GENERAR EL PAQUETE\n`
    contenido += `Paquete: ${generatedFileName}\n`
    contenido += `Fecha: ${format(new Date(), "dd-MM-yyyy HH:mm:ss")}\n`
    contenido += `\n${"-".repeat(80)}\n\n`
    
    errorDetails.forEach((errorItem, index) => {
      contenido += `${index + 1}. ID: ${errorItem.id}\n`
      errorItem.errores.forEach((error, errorIndex) => {
        contenido += `   ${String.fromCharCode(97 + errorIndex)}) ${error}\n`
      })
      contenido += `\n`
    })
    
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' })
    const nombreArchivo = `errores_${generatedFileName.replace('.zip', '')}_${format(new Date(), "yyyyMMdd_HHmmss")}.txt`
    descargarBlob(blob, nombreArchivo)
  }

  // Cargar FUAs al montar y cuando cambien los filtros
  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      cargarFuas()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origen, especialidad, estado, turno, filtroFirmado, dateRange])

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
        idEspecialidad: especialidad !== "todos" ? especialidad : undefined,
        turnoConsulta: turno !== "TODOS" ? turno : undefined,
        firmado: filtroFirmado !== "TODOS" ? filtroFirmado : undefined
      }

      const data = await listarFuas(params)
      console.log("Params enviados:", params)
      console.log("FUAs recibidos:", data.length)
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

    // Usar FUAs seleccionados o todos si no hay selección
    const idsAtencion = selectedFuas.size > 0 
      ? Array.from(selectedFuas) 
      : fuas.map(fua => fua.id)

    if (idsAtencion.length === 0) {
      alert("No hay FUAs para generar el paquete. Por favor seleccione al menos una atención.")
      return
    }

    if (idsAtencion.length < 10) {
      alert(`Debe seleccionar al menos 10 atenciones para generar el paquete. Actualmente tiene ${idsAtencion.length} seleccionadas.`)
      return
    }

    if (idsAtencion.length > 25) {
      alert(`Puede seleccionar máximo 25 atenciones por paquete. Actualmente tiene ${idsAtencion.length} seleccionadas.`)
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
      
      // Cerrar el diálogo del paquete
      setShowPackageDialog(false)
      
      // Mostrar diálogo de resultado con el mensaje del backend
      setGeneratedFileName(paqueteGenerado.nombreArchivo)
      
      if (respuestaSis.estado === 'ok') {
        // 2. Extraer el correlativo del nombre del archivo (últimos 5 dígitos sin ceros a la izquierda)
        // Ejemplo: 0000594720251100036.zip -> 00036 -> 36
        const idCorrelativo = obtenerCorrelativo(paqueteGenerado.nombreArchivo)
        
        // 3. Actualizar el estado del paquete a ENVIADO usando el correlativo
        await actualizarEstadoPaqueteSis(idCorrelativo, 'ENVIADO')
        
        setIsErrorDialog(false)
        setErrorDetails(null)
        setSuccessMessage(`${respuestaSis.mensaje}\n\nEl paquete ${paqueteGenerado.nombreArchivo} (ID Correlativo: ${idCorrelativo}) fue procesado exitosamente y su estado ha sido actualizado a ENVIADO.`)
      } else {
        // Error del SIS con detalles
        setIsErrorDialog(true)
        setErrorDetails(respuestaSis.errores || null)
        
        const totalErrores = respuestaSis.errores?.length || 0
        setSuccessMessage(`${respuestaSis.mensaje}\n\nSe detectaron errores en ${totalErrores} registro(s).`)
      }
      
      setShowSuccessDialog(true)
    } catch (error) {
      console.error("Error al enviar paquete al SIS:", error)
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"

      // Cerrar el diálogo del paquete y mostrar diálogo de error
      setShowPackageDialog(false)
      setGeneratedFileName(paqueteGenerado?.nombreArchivo || "")
      setIsErrorDialog(true)
      setErrorDetails(null)
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
    setEspecialidad("0001") // TERAPIA FISICA
    setMedico("todos")
    setEstado("2")
    setTurno("TODOS")
    setFiltroFirmado("FIRMADO")
    setBusquedaFua("")
    const today = new Date()
    const todayParsed = parseDate(format(today, "yyyy-MM-dd"))
    setDateRange({ start: todayParsed, end: todayParsed })
    setCurrentPage(0)
  }

  // Filtrar FUAs por búsqueda de número de FUA y por estado de firmado (frontend)
  const fuasFiltradas = fuas.filter(fua => {
    // Filtro por búsqueda de texto
    const matchesBusqueda = !busquedaFua.trim() || 
      fua.numeroFua?.toLowerCase().includes(busquedaFua.toLowerCase()) ||
      fua.id?.toLowerCase().includes(busquedaFua.toLowerCase())
    
    // Filtro por firmado
    const matchesFirmado = filtroFirmado === "TODOS" || 
      (filtroFirmado === "FIRMADO" && fua.firmado === true) ||
      (filtroFirmado === "NO_FIRMADO" && fua.firmado === false)
    
    return matchesBusqueda && matchesFirmado
  })

  const totalPages = Math.max(1, Math.ceil(fuasFiltradas.length / pageSize) || 1)
  const safeCurrentPage = Math.min(currentPage, totalPages - 1)
  const startIndex = safeCurrentPage * pageSize
  const endIndex = startIndex + pageSize
  const pageFuas = fuasFiltradas.slice(startIndex, endIndex)

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
            {/* Desktop: Tres filas con 3 columnas cada una */}
            <div className="hidden lg:flex lg:flex-col gap-3">
              {/* Fila 1: Fecha - Origen - Firmado */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="relative">
                    <DateRangePickerAria
                      value={dateRange}
                      onChange={setDateRange}
                      label="Fecha"
                    />
                    <Calendar className="absolute right-3 top-9 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                
                <OrigenSelector
                  value={origen}
                  onChange={setOrigen}
                  label="Origen"
                />
                
                <FirmadoSelector
                  value={filtroFirmado}
                  onChange={setFiltroFirmado}
                  label="Firmado"
                />
              </div>
              
              {/* Fila 2: Especialidad - Médico - Turno */}
              <div className="grid grid-cols-3 gap-3 items-end">
                <EspecialidadSimpleSelector
                  value={especialidad}
                  onChange={setEspecialidad}
                  label="Especialidad"
                  defaultOpen={true}
                />
                
                <MedicoSelector
                  value={medico}
                  onChange={setMedico}
                  label="Médico"
                  fechaInicio={new Date(dateRange.start?.year || 0, (dateRange.start?.month || 1) - 1, dateRange.start?.day || 1)}
                  fechaFin={new Date(dateRange.end?.year || 0, (dateRange.end?.month || 1) - 1, dateRange.end?.day || 1)}
                  idEspecialidadSolicitud={especialidad !== "todos" ? especialidad : "0001"}
                />
                
                <TurnoSelector
                  value={turno}
                  onChange={setTurno}
                />
              </div>

              {/* Fila 3: Buscar FUA - Estado - Botón Generar Paquete */}
              <div className="grid grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-sm font-medium text-[#114C5F] mb-2">
                    Buscar por N° FUA
                  </label>
                  <input
                    type="text"
                    value={busquedaFua}
                    onChange={(e) => setBusquedaFua(e.target.value)}
                    placeholder="Ingrese número de FUA..."
                    className="w-full px-4 py-2 border border-[#9CD2D3] rounded-md focus:ring-2 focus:ring-[#4F9BB6] focus:border-[#4F9BB6] transition-all text-[#114C5F]"
                  />
                </div>

                <EstadoFuaSelector
                  value={estado}
                  onChange={setEstado}
                  label="Estado"
                />
                
                <Button 
                  onClick={handleGenerarPaquete}
                  disabled={cargandoEnvioPaquete || loading || fuasFiltradas.length === 0}
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

            {/* Tablet: 3x3 + buscador + estado + botón */}
            <div className="hidden md:grid lg:hidden md:grid-cols-3 gap-3">
              <DateRangePickerAria
                value={dateRange}
                onChange={setDateRange}
                label="Fecha"
              />
              
              <OrigenSelector
                value={origen}
                onChange={setOrigen}
                label="Origen"
              />
              
              <FirmadoSelector
                value={filtroFirmado}
                onChange={setFiltroFirmado}
                label="Firmado"
              />
              
              <EspecialidadSimpleSelector
                value={especialidad}
                onChange={setEspecialidad}
                label="Especialidad"
              />
              
              <MedicoSelector
                value={medico}
                onChange={setMedico}
                label="Médico"
                fechaInicio={new Date(dateRange.start?.year || 0, (dateRange.start?.month || 1) - 1, dateRange.start?.day || 1)}
                fechaFin={new Date(dateRange.end?.year || 0, (dateRange.end?.month || 1) - 1, dateRange.end?.day || 1)}
                idEspecialidadSolicitud={especialidad !== "todos" ? especialidad : "0001"}
              />
              
              <TurnoSelector
                value={turno}
                onChange={setTurno}
              />
              
              <div>
                <label className="block text-sm font-medium text-[#114C5F] mb-2">
                  Buscar por N° FUA
                </label>
                <input
                  type="text"
                  value={busquedaFua}
                  onChange={(e) => setBusquedaFua(e.target.value)}
                  placeholder="Ingrese número de FUA..."
                  className="w-full px-4 py-2 border border-[#9CD2D3] rounded-md focus:ring-2 focus:ring-[#4F9BB6] focus:border-[#4F9BB6] transition-all text-[#114C5F]"
                />
              </div>
              
              <EstadoFuaSelector
                value={estado}
                onChange={setEstado}
                label="Estado"
              />
              
              <Button 
                onClick={handleGenerarPaquete}
                disabled={cargandoEnvioPaquete || loading || fuasFiltradas.length === 0}
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

            {/* Mobile: Columna única */}
            <div className="grid md:hidden grid-cols-1 gap-3">
              <DateRangePickerAria
                value={dateRange}
                onChange={setDateRange}
                label="Fecha"
              />
              
              <OrigenSelector
                value={origen}
                onChange={setOrigen}
                label="Origen"
              />
              
              <FirmadoSelector
                value={filtroFirmado}
                onChange={setFiltroFirmado}
                label="Firmado"
              />
              
              <EspecialidadSimpleSelector
                value={especialidad}
                onChange={setEspecialidad}
                label="Especialidad"
              />
              
              <MedicoSelector
                value={medico}
                onChange={setMedico}
                label="Médico"
                fechaInicio={new Date(dateRange.start?.year || 0, (dateRange.start?.month || 1) - 1, dateRange.start?.day || 1)}
                fechaFin={new Date(dateRange.end?.year || 0, (dateRange.end?.month || 1) - 1, dateRange.end?.day || 1)}
                idEspecialidadSolicitud={especialidad !== "todos" ? especialidad : "0001"}
              />
              
              <TurnoSelector
                value={turno}
                onChange={setTurno}
              />
              
              <div>
                <label className="block text-sm font-medium text-[#114C5F] mb-2">
                  Buscar por N° FUA
                </label>
                <input
                  type="text"
                  value={busquedaFua}
                  onChange={(e) => setBusquedaFua(e.target.value)}
                  placeholder="Ingrese número de FUA..."
                  className="w-full px-4 py-2 border border-[#9CD2D3] rounded-md focus:ring-2 focus:ring-[#4F9BB6] focus:border-[#4F9BB6] transition-all text-[#114C5F]"
                />
              </div>
              
              <EstadoFuaSelector
                value={estado}
                onChange={setEstado}
                label="Estado"
              />
              
              <Button 
                onClick={handleGenerarPaquete}
                disabled={cargandoEnvioPaquete || loading || fuasFiltradas.length === 0}
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

          {/* Tabla de FUAs */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-12">
                      <Checkbox
                        checked={pageFuas.length > 0 && pageFuas.every(f => selectedFuas.has(f.id))}
                        onCheckedChange={(checked) => {
                          const pageIds = new Set(pageFuas.map(f => f.id))
                          if (checked) {
                            setSelectedFuas(new Set([...selectedFuas, ...pageIds]))
                          } else {
                            const newSelected = new Set(selectedFuas)
                            pageIds.forEach(id => newSelected.delete(id))
                            setSelectedFuas(newSelected)
                          }
                        }}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">N° FUA</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">HC</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Paciente</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Médico</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tipo de Atención</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Especialidad</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Firmado</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Cargando FUAs...
                      </td>
                    </tr>
                  ) : fuasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                        {especialidad === "todos" 
                          ? "Por favor seleccione una especialidad para ver las atenciones"
                          : busquedaFua.trim()
                          ? `No se encontraron FUAs con el número "${busquedaFua}"`
                          : "No se encontraron FUAs con los filtros seleccionados"}
                      </td>
                    </tr>
                  ) : (
                    pageFuas.map((fua) => (
                      <tr 
                        key={fua.id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-center">
                        <Checkbox
                          key={`chk-${fua.id}`}
                          checked={selectedFuas.has(fua.id)}
                          onCheckedChange={(checked) => {
                            setSelectedFuas(prev => {
                              const newSelected = new Set(prev)
                              if (checked) {
                                newSelected.add(fua.id)
                              } else {
                                newSelected.delete(fua.id)
                              }
                              return newSelected
                            })
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">{fua.numeroFua || (fua as any).idCuenta || fua.id}</td>
                        <td className="px-4 py-3 text-sm">{(fua as any).historia?.trim() || (fua as any).hc || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{(fua as any).nombres?.trim() || (fua as any).paciente || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{fua.medico || 'N/A'}</td>
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
                        <td className="px-4 py-3 text-sm">{fua.nombreEspecialidad || fua.especialidad || 'N/A'}</td>
                        <td className="px-4 py-3 text-center">
                          {fua.firmado ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
                              <Check className="w-4 h-4 text-green-600" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100">
                              <X className="w-4 h-4 text-red-600" />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Información, selección y paginación */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
            <div className="flex items-center gap-4">
              <span>
                Mostrando {fuasFiltradas.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, fuasFiltradas.length)} de {fuasFiltradas.length} registros
              </span>
              {selectedFuas.size > 0 && (
                <span className="text-sm font-medium text-[#4F9BB6]">
                  ({selectedFuas.size} seleccionados)
                  <button
                    onClick={() => setSelectedFuas(new Set())}
                    className="ml-2 text-xs text-red-500 hover:text-red-700 underline"
                  >
                    Limpiar
                  </button>
                </span>
              )}
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
        <DialogContent className={`bg-white ${errorDetails && errorDetails.length > 0 ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}>
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
              {isErrorDialog ? 'Errores Detectados al Generar el Paquete' : '¡Operación Exitosa!'}
            </DialogTitle>
            <DialogDescription className="text-center pt-2 whitespace-pre-line">
              {successMessage || `El paquete ${generatedFileName} fue procesado con éxito.`}
            </DialogDescription>
          </DialogHeader>
          
          {/* Mostrar lista de errores detallados si existen */}
          {errorDetails && errorDetails.length > 0 && (
            <div className="mt-4 max-h-[400px] overflow-y-auto border rounded-lg">
              <div className="bg-gray-50 px-4 py-2 border-b sticky top-0">
                <h4 className="font-semibold text-sm text-gray-700">Detalle de Errores:</h4>
              </div>
              <div className="divide-y">
                {errorDetails.map((errorItem, index) => (
                  <div key={errorItem.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-semibold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 mb-1">ID: {errorItem.id}</p>
                        <ul className="space-y-1">
                          {errorItem.errores.map((error, errorIndex) => (
                            <li key={errorIndex} className="text-xs text-gray-600 pl-2 border-l-2 border-red-300">
                              {error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className={`flex ${errorDetails && errorDetails.length > 0 ? 'justify-between' : 'justify-center'} gap-3 mt-4`}>
            {errorDetails && errorDetails.length > 0 && (
              <Button
                onClick={handleDescargarErrores}
                variant="outline"
                className="flex-1 border-red-500 text-red-600 hover:bg-red-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar Errores (TXT)
              </Button>
            )}
            <Button
              onClick={() => setShowSuccessDialog(false)}
              className={`${errorDetails && errorDetails.length > 0 ? 'flex-1' : ''} bg-[#4F9BB6] hover:bg-[#4A6EB0] text-white`}
            >
              Aceptar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}






