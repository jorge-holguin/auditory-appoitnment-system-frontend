import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, FilterX, Download, Loader2, CheckCircle2, Upload, Package, AlertTriangle, Check, X, Eye } from "lucide-react"

import { TurnoSelector } from "@/components/selectors/TurnoSelector"
import { EspecialidadMultiSelector } from "@/components/selectors/EspecialidadMultiSelector"
import { extractDocumentFromToken } from "@/utils/jwtUtils"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
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
import { obtenerCitaIdPorAtencion } from "@/services/citaService"
import { PdfReviewModal } from "@/components/modals/PdfReviewModal"
import { format } from "date-fns"
import { parseDate } from "@internationalized/date"


export default function PlotPage() {
  // Estados para filtros
  const [especialidades, setEspecialidades] = useState<string[]>([]) // selector auto-completa con todas
  const [estado, setEstado] = useState<string>("3") // APROBADO por defecto
  const [turno, setTurno] = useState<"M" | "T" | "TODOS">("TODOS")
  const [soloFirmados, setSoloFirmados] = useState<boolean>(true)
  const [misAuditorias, setMisAuditorias] = useState<boolean>(true)
  
  // Estado para selección de FUAs
  const [selectedFuas, setSelectedFuas] = useState<Set<string>>(new Set())
  
  // Inicializar con la fecha de hoy
  const today = new Date()
  const todayParsed = parseDate(format(today, "yyyy-MM-dd"))
  
  const [dateRange, setDateRange] = useState<{ start: DateValue | null; end: DateValue | null }>({
    start: todayParsed,
    end: todayParsed,
  })

  
  const [fuas, setFuas] = useState<Fua[]>([])
  const [loading, setLoading] = useState(false)
  const [cargandoEnvioPaquete, setCargandoEnvioPaquete] = useState(false)
  const [pageSize, setPageSize] = useState<number>(25)
  const [currentPage, setCurrentPage] = useState<number>(0)

  // Estados para el modal de revisión de FUA
  const [modalRevisarOpen, setModalRevisarOpen] = useState(false)
  const [modalCitaId, setModalCitaId] = useState<string>("")
  const [modalFirmado, setModalFirmado] = useState<boolean>(false)
  const [modalFua, setModalFua] = useState<Fua | null>(null)
  const [loadingVerAtencion, setLoadingVerAtencion] = useState<string | null>(null)

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

  // Estado para dialog de advertencia OBSERVADO_SIS
  const [showObservadoSisWarning, setShowObservadoSisWarning] = useState(false)

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

  // Cargar FUAs al montar y cuando cambien los filtros.
  // Se salta la llamada cuando `especialidades` está vacío: en el mount inicial
  // el multi-selector aún no ha auto-seleccionado todas; se dispararía una llamada
  // sin `idEspecialidades`. Cuando el selector completa su fetch y llama onChange
  // con todos los IDs, este useEffect se re-ejecuta con el array poblado.
  useEffect(() => {
    if (!dateRange.start || !dateRange.end) return
    if (especialidades.length === 0) return
    cargarFuas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [especialidades, estado, turno, soloFirmados, misAuditorias, dateRange])

  const cargarFuas = async () => {
    if (!dateRange.start || !dateRange.end) {
      alert("Por favor seleccione un rango de fechas")
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
        idOrigen: "CE",
        idEstado: estado !== "todos" ? parseInt(estado) : 2,
        idEspecialidades: especialidades.length > 0 ? especialidades : undefined,
        turnoConsulta: turno !== "TODOS" ? turno : undefined,
        firmado: soloFirmados ? "FIRMADO" : undefined,
        usuarioAuditoria: misAuditorias ? extractDocumentFromToken() || undefined : undefined
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

  // Obtener IDs válidos para generar paquete (filtrando ENVIADO estado=8)
  const obtenerIdsParaPaquete = (): string[] => {
    const idsBase = selectedFuas.size > 0 
      ? Array.from(selectedFuas) 
      : fuasFiltradas.map(fua => fua.id)

    // Filtrar atenciones en estado ENVIADO (8) para evitar doble envío
    const idsEnviados = new Set(fuas.filter(f => f.estado === "8" || f.estado === "ENVIADO").map(f => f.id))
    return idsBase.filter(id => !idsEnviados.has(id))
  }

  // Verificar si hay atenciones OBSERVADO_SIS en la selección
  const tieneObservadoSis = (): boolean => {
    const idsSeleccionados = selectedFuas.size > 0 
      ? Array.from(selectedFuas) 
      : fuasFiltradas.map(fua => fua.id)
    return fuas.some(f => idsSeleccionados.includes(f.id) && (f.estado === "7" || f.estado === "OBSERVADO_SIS"))
  }

  const handleGenerarPaquete = async () => {
    if (!dateRange.start || !dateRange.end) {
      alert("Por favor seleccione un rango de fechas")
      return
    }

    if (especialidades.length === 0) {
      alert("Por favor seleccione al menos una especialidad")
      return
    }

    const idsAtencion = obtenerIdsParaPaquete()

    if (idsAtencion.length === 0) {
      alert("No hay FUAs válidas para generar el paquete. Las atenciones en estado ENVIADO no pueden enviarse nuevamente.")
      return
    }

    if (idsAtencion.length < 10) {
      alert(`Debe seleccionar al menos 10 atenciones para generar el paquete. Actualmente tiene ${idsAtencion.length} válidas (se excluyeron las que están en estado ENVIADO).`)
      return
    }

    if (idsAtencion.length > 25) {
      alert(`Puede seleccionar máximo 25 atenciones por paquete. Actualmente tiene ${idsAtencion.length} seleccionadas.`)
      return
    }

    // Si hay atenciones OBSERVADO_SIS, mostrar advertencia antes de continuar
    if (tieneObservadoSis()) {
      setShowObservadoSisWarning(true)
      return
    }

    await ejecutarGenerarPaquete(idsAtencion)
  }

  const ejecutarGenerarPaquete = async (idsAtencion?: string[]) => {
    if (!dateRange.start || !dateRange.end) return

    const ids = idsAtencion || obtenerIdsParaPaquete()

    setCargandoEnvioPaquete(true)
    try {
      const fechaInicio = format(new Date(dateRange.start.year, dateRange.start.month - 1, dateRange.start.day), "dd-MM-yyyy")
      const fechaFin = format(new Date(dateRange.end.year, dateRange.end.month - 1, dateRange.end.day), "dd-MM-yyyy")

      // Obtener nombre de la especialidad
      const especialidadNombre = fuas.find(f => f.id === ids[0])?.especialidad || "ESPECIALIDAD"

      const request: DescargarZipRequest = {
        idsAtencion: ids,
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
        
        // Refrescar la lista de FUAs ya que las atenciones enviadas cambian de estado
        cargarFuas()
        setSelectedFuas(new Set())
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
    setEspecialidades([]) // selector auto-completa con todas
    setEstado("3")
    setTurno("TODOS")
    setSoloFirmados(true)
    setMisAuditorias(true)
    const today = new Date()
    const todayParsed = parseDate(format(today, "yyyy-MM-dd"))
    setDateRange({ start: todayParsed, end: todayParsed })
    setCurrentPage(0)
  }

  // Función para ver FUA en modal de revisión
  const handleVerAtencion = async (fua: Fua) => {
    setLoadingVerAtencion(fua.id)
    try {
      const citaId = await obtenerCitaIdPorAtencion(fua.id)
      setModalCitaId(citaId)
      setModalFirmado(fua.firmado === true)
      setModalFua(fua)
      setModalRevisarOpen(true)
    } catch (error) {
      console.error("Error al obtener cita ID:", error)
      alert("No se pudo obtener el ID de cita para esta atención.")
    } finally {
      setLoadingVerAtencion(null)
    }
  }

  // Filtrar FUAs (frontend filter for multi-specialty)
  const fuasFiltradas = fuas.filter(fua => {
    // Multi-specialty frontend filter (only needed when multiple selected, single is handled by API)
    if (especialidades.length > 1) {
      const fuaEsp = fua.idEspecialidadSgh || fua.especialidad || ''
      if (!especialidades.includes(fuaEsp)) return false
    }
    return true
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
          {/* Filtros compactos */}
          <div className="space-y-4 mb-6">
            {/* Fila 1: Fecha - Estado - Turno */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <DateRangePickerAria
                value={dateRange}
                onChange={setDateRange}
                label="Fecha"
              />

              <div>
                <label className="block text-sm font-medium text-[#114C5F] mb-2">Estado</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full px-3 py-2 border border-[#9CD2D3] rounded-md bg-white text-sm text-[#114C5F] focus:ring-2 focus:ring-[#4F9BB6] focus:border-[#4F9BB6] transition-all"
                >
                  <option value="3">Aprobado</option>
                  <option value="7">Observado SIS</option>
                  <option value="8">Enviado</option>
                  <option value="6">Completado</option>
                </select>
              </div>

              <TurnoSelector
                value={turno}
                onChange={setTurno}
              />
            </div>
            
            {/* Fila 2: Especialidad - Opciones (checkboxes) - Generar Paquete */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <EspecialidadMultiSelector
                value={especialidades}
                onChange={setEspecialidades}
                label="Especialidades"
              />
              
              <div className="flex items-center gap-6 h-[38px]">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    checked={soloFirmados}
                    onCheckedChange={(checked) => setSoloFirmados(checked === true)}
                  />
                  <span className="text-sm font-medium text-[#114C5F]">Solo Firmados</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    checked={misAuditorias}
                    onCheckedChange={(checked) => setMisAuditorias(checked === true)}
                  />
                  <span className="text-sm font-medium text-[#114C5F]">Mis Auditorías</span>
                </label>
              </div>
              
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
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
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
                        {especialidades.length === 0 
                          ? "Por favor seleccione una especialidad para ver las atenciones"
                          : "No se encontraron FUAs con los filtros seleccionados"}
                      </td>
                    </tr>
                  ) : (
                    pageFuas.map((fua) => (
                      <tr 
                        key={fua.id}
                        className={`border-b hover:bg-gray-50 ${
                          (fua.estado === "8" || fua.estado === "ENVIADO") ? "bg-blue-50/60" : 
                          (fua.estado === "7" || fua.estado === "OBSERVADO_SIS") ? "bg-orange-50/60" : ""
                        }`}
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
                        <td className="px-4 py-3 text-sm font-mono">{fua.numeroFua?.trim() || fua.id}</td>
                        <td className="px-4 py-3 text-sm">{(fua as any).historia?.trim() || (fua as any).hc || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{(fua as any).nombres?.trim() || (fua as any).paciente || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{fua.medico || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{(fua as any).tipoAtencion?.trim() || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wide ${
                              estado === "3"
                                ? "bg-green-100 text-green-800 border border-green-300"
                                : estado === "7"
                                ? "bg-red-100 text-red-800 border border-red-300"
                                : estado === "8"
                                ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                                : estado === "6"
                                ? "bg-teal-100 text-teal-800 border border-teal-300"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {estado === "3" ? "Aprobado" : estado === "7" ? "Obs. SIS" : estado === "8" ? "Enviado" : estado === "6" ? "Completado" : fua.estado}
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
                        <td className="px-4 py-3 text-center">
                          <Button
                            size="sm"
                            onClick={() => handleVerAtencion(fua)}
                            disabled={loadingVerAtencion === fua.id}
                            className="bg-[#4F9BB6] hover:bg-[#4A6EB0] text-white text-xs h-7"
                          >
                            {loadingVerAtencion === fua.id ? (
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

      {/* Dialog de advertencia para atenciones OBSERVADO_SIS */}
      <AlertDialog open={showObservadoSisWarning} onOpenChange={setShowObservadoSisWarning}>
        <AlertDialogContent className="border-orange-200 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold text-orange-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Atenciones Observadas por el SIS
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-600">
              Algunas de las atenciones seleccionadas tienen el estado <strong className="text-orange-700">OBSERVADO SIS</strong>, lo que significa que fueron observadas durante un envío anterior. 
              <br /><br />
              <strong>Asegúrese de que las observaciones hayan sido corregidas</strong> antes de generar el paquete nuevamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300 text-gray-700 hover:bg-gray-50">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-600 hover:bg-orange-700 text-white shadow-md"
              onClick={() => {
                setShowObservadoSisWarning(false)
                ejecutarGenerarPaquete()
              }}
            >
              Sí, generar paquete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Revisión de FUA */}
      {modalFua && (
        <PdfReviewModal
          open={modalRevisarOpen}
          onClose={() => setModalRevisarOpen(false)}
          citaId={modalCitaId}
          firmado={modalFirmado}
          requireRevert
          citaContext={{
            paciente: modalFua.paciente || '',
            fecha: modalFua.fechaAtencion || '',
            hora: '',
            consultorioNombre: '',
            medicoNombre: modalFua.medico || '',
            seguroNombre: '',
            historia: modalFua.hc || '',
            seguro: '',
            numRef: '',
            entidadSis: '',
          }}
        />
      )}
    </div>
  )
}
