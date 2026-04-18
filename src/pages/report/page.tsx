import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, FilterX, Loader2, FileSpreadsheet } from "lucide-react"
import { EspecialidadMultiSelector } from "@/components/selectors/EspecialidadMultiSelector"
import { DateRangePickerAria } from "@/components/ui/DateRangePickerAria"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import type { DateValue } from "@internationalized/date"
import { listarCitasReporte, descargarExcelReporte, type CitaReporte } from "@/services/reportService"
import { format } from "date-fns"
import { parseDate } from "@internationalized/date"


export default function ReportPage() {
  // Inicializar con la fecha de hoy
  const today = new Date()
  const todayParsed = parseDate(format(today, "yyyy-MM-dd"))

  // Estados para filtros
  const [especialidades, setEspecialidades] = useState<string[]>(["1091"])
  const [dateRange, setDateRange] = useState<{ start: DateValue | null; end: DateValue | null }>({
    start: todayParsed,
    end: todayParsed,
  })

  // Estado de auditoría fijo: solo se listan Completados (código "6")
  const ESTADOS_AUDITORIA_FIJOS = "6"

  // Datos y loading
  const [citas, setCitas] = useState<CitaReporte[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingExcel, setLoadingExcel] = useState(false)
  const [pageSize, setPageSize] = useState<number>(25)
  const [currentPage, setCurrentPage] = useState<number>(0)

  // Cargar datos al montar y cuando cambien los filtros
  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      cargarCitas()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [especialidades, dateRange])

  const buildParams = () => {
    if (!dateRange.start || !dateRange.end) return null

    const fechaInicio = format(
      new Date(dateRange.start.year, dateRange.start.month - 1, dateRange.start.day),
      "dd/MM/yyyy"
    )
    const fechaFin = format(
      new Date(dateRange.end.year, dateRange.end.month - 1, dateRange.end.day),
      "dd/MM/yyyy"
    )

    return {
      fechaInicio,
      fechaFin,
      especialidades: especialidades.length > 0 ? especialidades.join(",") : undefined,
      estadosAuditoria: ESTADOS_AUDITORIA_FIJOS,
    }
  }

  const cargarCitas = async () => {
    const params = buildParams()
    if (!params) {
      alert("Por favor seleccione un rango de fechas")
      return
    }

    setLoading(true)
    try {
      const data = await listarCitasReporte(params)
      console.log("Citas reporte recibidas:", data.length)
      setCitas(data)
      setCurrentPage(0)
    } catch (error) {
      console.error("Error al cargar reporte:", error)
      alert("Error al cargar el reporte. Por favor intente nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleDescargarExcel = async () => {
    const params = buildParams()
    if (!params) {
      alert("Por favor seleccione un rango de fechas")
      return
    }

    setLoadingExcel(true)
    try {
      await descargarExcelReporte(params)
    } catch (error) {
      console.error("Error al descargar Excel:", error)
      alert("Error al descargar el reporte en Excel.")
    } finally {
      setLoadingExcel(false)
    }
  }

  const handleActualizar = () => {
    cargarCitas()
  }

  const handleLimpiarFiltros = () => {
    setEspecialidades(["1091"])
    const today = new Date()
    const todayParsed = parseDate(format(today, "yyyy-MM-dd"))
    setDateRange({ start: todayParsed, end: todayParsed })
    setCurrentPage(0)
  }

  // Paginación
  const totalPages = Math.max(1, Math.ceil(citas.length / pageSize) || 1)
  const safeCurrentPage = Math.min(currentPage, totalPages - 1)
  const startIndex = safeCurrentPage * pageSize
  const endIndex = startIndex + pageSize
  const pageCitas = citas.slice(startIndex, endIndex)

  // Formatear fecha
  const formatFecha = (fecha: string) => {
    try {
      return format(new Date(fecha), "dd/MM/yyyy")
    } catch {
      return fecha
    }
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-[#9CD2D3]/30 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#9CD2D3]/20">
          <h1 className="text-2xl font-semibold text-[#114C5F]">Reportes</h1>
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

        {/* Filtros en una sola fila */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-3 mb-6 items-end">
          <DateRangePickerAria
            value={dateRange}
            onChange={setDateRange}
            label="Rango de Fechas"
          />

          <EspecialidadMultiSelector
            value={especialidades}
            onChange={setEspecialidades}
            label="Especialidades"
          />

          <Button
            onClick={handleDescargarExcel}
            disabled={loadingExcel || loading || citas.length === 0}
            variant="outline"
            className="h-10 border-green-500 text-green-700 hover:bg-green-50 font-medium disabled:opacity-50"
          >
            {loadingExcel ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Exportar Excel
              </>
            )}
          </Button>

          <div className="text-sm text-[#114C5F] flex items-center h-10">
            {!loading && citas.length > 0 && (
              <span className="font-medium">{citas.length} registro(s) encontrado(s)</span>
            )}
          </div>
        </div>

        {/* Tabla de resultados */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">N° FUA</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Historia</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Paciente</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Fecha</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Hora</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Médico</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Consultorio</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Especialidad</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Auditor</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700">Estado Aud.</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Cargando reporte...
                    </td>
                  </tr>
                ) : citas.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      No se encontraron registros con los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  pageCitas.map((cita) => (
                    <tr key={cita.citaId} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2.5 text-xs font-mono">{cita.numeroFua?.trim() || '—'}</td>
                      <td className="px-3 py-2.5 text-xs font-mono">{cita.numeroHistoria?.trim() || '—'}</td>
                      <td className="px-3 py-2.5 text-xs">{cita.pacienteNombre?.trim() || cita.paciente}</td>
                      <td className="px-3 py-2.5 text-xs">{formatFecha(cita.fecha)}</td>
                      <td className="px-3 py-2.5 text-xs">{cita.hora?.trim()}</td>
                      <td className="px-3 py-2.5 text-xs">{cita.medicoNombre?.trim()}</td>
                      <td className="px-3 py-2.5 text-xs">{cita.consultorioNombre?.trim()}</td>
                      <td className="px-3 py-2.5 text-xs">{cita.especialidadNombre?.trim()}</td>
                      <td className="px-3 py-2.5 text-xs">{cita.auditorNombre?.trim() || '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          cita.estadoAuditoria === "6"
                            ? "bg-teal-100 text-teal-800 border border-teal-300"
                            : cita.estadoAuditoria === "7"
                            ? "bg-red-100 text-red-800 border border-red-300"
                            : "bg-gray-100 text-gray-800 border border-gray-300"
                        }`}>
                          {cita.estadoAuditoria === "6" ? "Completado" : cita.estadoAuditoria === "7" ? "Observado SIS" : "No Completado"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginación */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
          <div className="flex items-center gap-4">
            <span className="text-sm">
              Mostrando {citas.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, citas.length)} de {citas.length} registros
            </span>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#114C5F]">Registros por página:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value) || 25)
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
  )
}
