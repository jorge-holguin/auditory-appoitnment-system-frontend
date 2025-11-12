import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, FilterX } from "lucide-react"
import { OrigenSelector } from "@/components/selectors/OrigenSelector"
import { EspecialidadSelector } from "@/components/selectors/EspecialidadSelector"
import { EstadoSelector } from "@/components/selectors/EstadoSelector"
import { DateRangePickerAria } from "@/components/ui/DateRangePickerAria"
import type { DateValue } from "@internationalized/date"

interface TipoAtencion {
  id: string
  nombre: string
}

interface Especialidad {
  id: string
  codigo: string
  descripcion: string
}

interface EstadoFua {
  id: string
  nombre: string
}

interface Fua {
  id: number
  numeroFua: string
  paciente: string
  hc: string
  tipoAtencion: string
  especialidad: string
  estado: string
  fechaAtencion: string
}

export default function PlotPage() {
  const [origen, setOrigen] = useState<string>("todos")
  const [especialidad, setEspecialidad] = useState<string>("todos")
  const [estado, setEstado] = useState<string>("todos")
  const [dateRange, setDateRange] = useState<{ start: DateValue | null; end: DateValue | null }>({
    start: null,
    end: null,
  })
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null)
  const [cargandoEnvioPaquete, setCargandoEnvioPaquete] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Mock data

  const mockFuas: Fua[] = [
    { id: 1, numeroFua: "FUA-2025-0001", paciente: "GOMEZ PEREZ JUAN CARLOS", hc: "12345678", tipoAtencion: "Consulta", especialidad: "OFTALMOLOGIA", estado: "Pendiente", fechaAtencion: "01/06/2025" },
    { id: 2, numeroFua: "FUA-2025-0002", paciente: "LOPEZ GARCIA MARIA ELENA", hc: "87654321", tipoAtencion: "Consulta", especialidad: "CARDIOLOGIA", estado: "Proceso", fechaAtencion: "02/06/2025" },
    { id: 3, numeroFua: "FUA-2025-0003", paciente: "RODRIGUEZ SANCHEZ PEDRO", hc: "11223344", tipoAtencion: "Emergencia", especialidad: "PEDIATRIA", estado: "Validado", fechaAtencion: "03/06/2025" },
  ]


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.name.endsWith(".zip")) {
      setArchivoSeleccionado(file)
    } else {
      alert("Por favor seleccione un archivo .zip")
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleEnviarPaquete = async () => {
    if (!archivoSeleccionado) return
    
    setCargandoEnvioPaquete(true)
    // Simular envío
    setTimeout(() => {
      setCargandoEnvioPaquete(false)
      alert("Paquete enviado exitosamente al SIS")
      setArchivoSeleccionado(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }, 2000)
  }

  const handleGenerarPaquete = () => {
    alert("Generando paquete...")
    // Aquí iría la lógica para generar el paquete
  }


  const handleActualizar = () => {
    alert("Actualizando datos...")
    // Aquí iría la lógica para recargar los datos
  }

  const handleLimpiarFiltros = () => {
    setOrigen("todos")
    setEspecialidad("todos")
    setEstado("todos")
    setDateRange({ start: null, end: null })
  }

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
                <EspecialidadSelector
                  value={especialidad}
                  onChange={setEspecialidad}
                  label="Especialidad"
                />
              </div>
              
              <div className="col-span-2">
                <EstadoSelector
                  value={estado}
                  onChange={setEstado}
                  label="Estado"
                  fase={1}
                />
              </div>
              
              <div className="col-span-2">
                <DateRangePickerAria
                  value={dateRange}
                  onChange={setDateRange}
                  label="Fecha"
                />
              </div>
              
              <div className="col-span-3">
                <Button 
                  onClick={handleGenerarPaquete}
                  className="w-full h-10 bg-[#4F9BB6] hover:bg-[#4A6EB0] text-white font-medium"
                >
                  Generar Paquete
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
              
              <EspecialidadSelector
                value={especialidad}
                onChange={setEspecialidad}
                label="Especialidad"
              />
              
              <EstadoSelector
                value={estado}
                onChange={setEstado}
                label="Estado"
                fase={1}
              />
              
              <DateRangePickerAria
                value={dateRange}
                onChange={setDateRange}
                label="Fecha"
              />
              
              <div className="col-span-2">
                <Button 
                  onClick={handleGenerarPaquete}
                  className="w-full h-10 bg-[#4F9BB6] hover:bg-[#4A6EB0] text-white font-medium"
                >
                  Generar Paquete
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
              
              <EspecialidadSelector
                value={especialidad}
                onChange={setEspecialidad}
                label="Especialidad"
              />
              
              <EstadoSelector
                value={estado}
                onChange={setEstado}
                label="Estado"
                fase={1}
              />
              
              <DateRangePickerAria
                value={dateRange}
                onChange={setDateRange}
                label="Fecha"
              />
              
              <Button 
                onClick={handleGenerarPaquete}
                className="w-full h-10 bg-[#4F9BB6] hover:bg-[#4A6EB0] text-white font-medium"
              >
                Generar Paquete
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
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">N° FUA</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Paciente</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">HC</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tipo Atención</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Especialidad</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {mockFuas.map((fua) => (
                    <tr key={fua.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{fua.numeroFua}</td>
                      <td className="px-4 py-3 text-sm">{fua.paciente}</td>
                      <td className="px-4 py-3 text-sm">{fua.hc}</td>
                      <td className="px-4 py-3 text-sm">{fua.tipoAtencion}</td>
                      <td className="px-4 py-3 text-sm">{fua.especialidad}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wide ${
                            fua.estado === "Validado"
                              ? "bg-green-100 text-green-800"
                              : fua.estado === "Proceso"
                              ? "bg-cyan-100 text-cyan-800"
                              : fua.estado === "Pendiente"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {fua.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{fua.fechaAtencion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginación */}
          <div className="flex justify-between items-center mt-4">
            <span className="text-sm text-[#114C5F]">Mostrando 1-{mockFuas.length} de {mockFuas.length} registros</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled className="border-[#9CD2D3]">
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled className="border-[#9CD2D3]">
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}