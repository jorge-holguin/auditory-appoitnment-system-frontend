// components/revision/RevisionAtencionModal.tsx
import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, Receipt, Save, ArrowLeft, CheckCircle } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

import PatientSidebar from "./revision/PatientSidebar"
import { LiquidacionesModal } from "./revision/LiquidacionesModal"
import type { AtencionData, FieldObservation, HasObservation, AddObservation, TabSection } from "./revision/types"
import { obtenerAtencionCompleta, obtenerPacienteConFoto, observarCita } from "@/services/citaService"
import { obtenerObservacionesPorCita, crearObservacion, SECCION_IDS } from "@/services/observacionService"
import { extractDocumentFromToken } from "@/utils/jwtUtils"

// Lazy-load de los Tabs
const AtencionTab = dynamic(() => import("./revision/tabs/AtencionTab"))
const DiagnosticosTab = dynamic(() => import("./revision/tabs/DiagnosticosTab"))
const ApoyoDiagnosticoTab = dynamic(() => import("./revision/tabs/ApoyoDiagnosticoTab"))
const FarmaciaTab = dynamic(() => import("./revision/tabs/FarmaciaTab"))

interface Patient {
  paciente: string
  nombres: string
  stringFoto: string
  estadoCivil: string
  fechaNacimiento: string
  edad: string
}

interface CitaContext {
  paciente: string
  fecha: string
  hora: string
  consultorioNombre: string
  medicoNombre: string
  seguroNombre: string
  historia: string
  seguro: string
  numRef: string
  entidadSis: string
}

interface RevisionAtencionModalProps {
  open: boolean
  onClose: () => void
  citaId: string
  citaContext: CitaContext
  onSave?: (observations: FieldObservation[]) => void
  onRefresh?: () => void
}

export function RevisionAtencionModal({
  open,
  onClose,
  citaId,
  citaContext,
  onSave,
  onRefresh
}: RevisionAtencionModalProps) {
  const [observations, setObservations] = useState<FieldObservation[]>([])
  const [activeTab, setActiveTab] = useState<TabSection>("atencion")
  const [showLiquidaciones, setShowLiquidaciones] = useState(false)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [atencion, setAtencion] = useState<AtencionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // -------------------------------
  // Cargar datos al abrir modal
  // -------------------------------
  useEffect(() => {
    if (open && citaId) cargarAtencionCompleta()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, citaId])

  const formatearFecha = (fecha: string): string => {
    const date = new Date(fecha)
    const dia = String(date.getDate()).padStart(2, "0")
    const mes = String(date.getMonth() + 1).padStart(2, "0")
    const anio = date.getFullYear()
    return `${dia}/${mes}/${anio}`
  }

  // -------------------------------
  // Cargar información completa
  // -------------------------------
  const cargarAtencionCompleta = async () => {
    setLoading(true)
    setError(null)

    try {
      const codigoPaciente = citaContext.paciente
      if (!codigoPaciente) throw new Error("No se encontró el código de paciente en el contexto de la cita")

      const dataPaciente = await obtenerPacienteConFoto(codigoPaciente)
      setPatient({
        paciente: dataPaciente.paciente,
        nombres: dataPaciente.nombres,
        stringFoto: dataPaciente.stringFoto,
        estadoCivil: dataPaciente.estadoCivil,
        fechaNacimiento: formatearFecha(dataPaciente.fechaNacimiento),
        edad: dataPaciente.edad
      })

      // Cargar observaciones existentes
      const observacionesExistentes = await obtenerObservacionesPorCita(citaId)
      
      // Mapear observaciones del backend al formato del componente
      const observacionesMapeadas: FieldObservation[] = observacionesExistentes.map(obs => {
        // Buscar el nombre de sección por su ID
        const sectionEntry = Object.entries(SECCION_IDS).find(([_, id]) => id === obs.idSeccion)
        const sectionName = sectionEntry ? sectionEntry[0] : `OBSERVACION_seccion_${obs.idSeccion}`
        
        return {
          fieldName: sectionName,
          originalValue: "",
          observation: obs.descripcion
        }
      })
      
      setObservations(observacionesMapeadas)

      const data = await obtenerAtencionCompleta(citaId)
      const atencionData: AtencionData = {
        // Info básica
        fechaAtencion: formatearFecha(citaContext.fecha),
        horaAtencion: citaContext.hora,
        consultorio: citaContext.consultorioNombre,
        profesional: citaContext.medicoNombre,
        temperatura: data.atencionc?.tempe?.toString() || "0",
        presionArterial: data.atencionc?.presion || "0/0",
        frecuenciaCardiaca: data.atencionc?.fc?.toString() || "0",
        peso: data.atencionc?.peso?.toString() || "0",
        talla: data.atencionc?.talla?.toString() || "0",
        imc: data.atencionc?.imc || "0",

        // Bloque atención
        Motivo: data.atencionc?.motivo || "",
        TiempoEnfermedad: data.atencionc?.tiempoEnf || "",
        Antecedente: data.atencionc?.antecedente || "",
        RelatoAnamnesis: data.atencionc?.ananmesis || "",
        ExamenFisico: data.atencionc?.examenFisico || "",
        Apetito: data.atencionc?.apetito || "Conservado",
        Sed: data.atencionc?.sed || "Conservado",
        Sueño: data.atencionc?.sueno || "Conservado",
        EstadoAnimo: data.atencionc?.animo || "Conservado",
        Orina: data.atencionc?.orina || "Conservado",
        Deposiciones: data.atencionc?.deposiciones || "Conservado",

        // Diagnósticos
        DiagnosticoPrincipal: "",
        TipoDX_Principal: "",
        CodigoCIE_Principal: "",
        DiagnosticoSecundario: "",
        TipoDX_Secundario: "",
        CodigoCIE_Secundario: "",

        // Plan terapéutico
        PlanTerapeutico: data.atencionc?.planTerapeutico || "",
        ProximaCita: "",
        Destino: data.atencionc?.destino || "",
        Observaciones: data.atencionc?.observacion || "",

        // Apoyo diagnóstico
        Laboratorio_Diagnostico: "",
        Laboratorio_NombreExamen: "",
        ListadoExamenesLaboratorio: data.laboratorio || [],
        RayosX_Diagnostico: "",
        RayosX_NombreExamen: "",
        RayosX_Zona: "",
        ListadoExamenesRayosX: data.rayos || [],
        Ecografia_Diagnostico: "",
        Ecografia_Lugar: "",
        Ecografia_NombreExamen: "",
        Ecografia_Observacion: "",
        ListadoExamenesEcografia: data.ecografia || [],

        // Farmacia
        Farmacia_Diagnostico: "",
        Farmacia_NombreFarmaco: "",
        ListadoFarmacos: (data.receta || []).map((r: any) => ({
          Nombre: r.nombre || "",
          Cantidad: r.cantidad?.toString() || "",
          Dosis: r.dosis || "",
          Frecuencia: r.frecuencia || "",
          Dias: r.tiempo || "",
          Via: r.via || "",
          Diagnostico: r.cieX || "",
          CantidadEntreg: r.cantidadEntreg || "",
          metodo: r.metodo || "",
          indicaciones: r.indicaciones || "",
          dias: r.dias || ""
        })),

        // Liquidaciones
        Liquidacion_CuentaCorriente: "",
        Liquidacion_FechaEmision: "",
        Liquidacion_HoraEmision: "",
        Liquidacion_HistoriaClinica: "",
        Liquidacion_ApellidosNombres: "",
        Liquidacion_TipoPaciente: "",
        Liquidacion_EmpresaAseguradora: "",
        Liquidacion_Origen: "",
        Liquidacion_Consultorio: "",
        Liquidacion_MedicoTratante: "",
        Liquidacion_Diagnostico1: "",
        Liquidacion_Diagnostico2: "",
        Liquidacion_Diagnostico3: "",
        Liquidacion_FechaIngreso: "",
        Liquidacion_NroCama: "",
        Liquidacion_DetalleServicios: [],
        Liquidacion_TotalPagar: "",

        // Diagnósticos y procedimientos
        ListadoDiagnosticos: data.diagnosticos || [],
        ListadoProcedimientos: data.procedimientos || []
      }

      setAtencion(atencionData)
    } catch (err) {
      console.error("❌ Error al cargar atención completa:", err)
      setError(`Error al cargar los datos: ${err instanceof Error ? err.message : "Error desconocido"}`)
    } finally {
      setLoading(false)
    }
  }

  // -------------------------------
  // Funciones de observaciones
  // -------------------------------
  const handleAddObservation: AddObservation = async (fieldName, value) => {
    const isSection = fieldName.startsWith("OBSERVACION_")
    const existing = observations.find(o => o.fieldName === fieldName)
    const updated = observations.filter(o => o.fieldName !== fieldName)
    updated.push({
      fieldName,
      originalValue: isSection ? "" : value,
      observation: isSection ? value : (existing?.observation || "")
    })
    setObservations(updated)

    // Guardar automáticamente en el backend si es una sección con observación
    if (isSection && value) {
      try {
        const idSeccion = SECCION_IDS[fieldName as keyof typeof SECCION_IDS]
        if (idSeccion) {
          const usuarioRegistro = extractDocumentFromToken() || "SISTEMA"
          await crearObservacion({
            idCita: citaId,
            idSeccion,
            descripcion: value,
            usuarioRegistro
          })
          console.log(`✅ Observación guardada automáticamente para ${fieldName}`)
        }
      } catch (error) {
        console.error("Error al guardar observación automáticamente:", error)
        // No mostramos error al usuario para no interrumpir el flujo
      }
    }
  }

  const hasObservation: HasObservation = (fieldName) =>
    observations.some(o => o.fieldName === fieldName)

  const getObservationText = (fieldName: string) =>
    observations.find(o => o.fieldName === fieldName)?.observation || ""

  const prettySectionLabel = (fieldName: string) => {
    const map: Record<string, string> = {
      OBSERVACION_informacion_clinica: "Observación de la Información Clínica",
      OBSERVACION_funciones_biologicas: "Observaciones de las Funciones Biológicas",
      OBSERVACION_plan_terapeutico: "Observaciones del Plan Terapéutico y Destino",
      OBSERVACION_diagnosticos: "Observaciones de los Diagnósticos",
      OBSERVACION_procedimientos: "Observaciones de los Procedimientos",
      OBSERVACION_laboratorio: "Observaciones de los Exámenes de Laboratorio",
      OBSERVACION_rayosx: "Observaciones de los Exámenes de Rayos X",
      OBSERVACION_ecografia: "Observaciones de los Exámenes de Ecografía",
      OBSERVACION_farmacia: "Observaciones de la Receta Médica",
      OBSERVACION_liquidaciones: "Observaciones de la Información de Liquidación",
    }
    return map[fieldName] || fieldName
  }

  const handleSaveAll = () => {
    if (observations.length > 0) {
      setShowConfirmDialog(true)
    }
  }

  const handleConfirmSave = async () => {
    try {
      // Cambiar el estado de la cita a OBSERVADO (4)
      await observarCita(citaId)
      
      // Llamar al callback opcional
      if (onSave) {
        onSave(observations)
      }
      
      // Refrescar la lista si se proporciona el callback
      if (onRefresh) {
        onRefresh()
      }
      
      setShowConfirmDialog(false)
      onClose()
    } catch (error) {
      console.error("Error al guardar observaciones:", error)
      setError("Error al guardar las observaciones. Por favor, inténtelo de nuevo.")
      setShowConfirmDialog(false)
    }
  }

  const getTipoDxBadge = (tipo: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      D: { label: "Definitivo", className: "bg-green-100 text-green-800 border-green-200" },
      R: { label: "Presuntivo", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
      P: { label: "Repetido", className: "bg-blue-100 text-blue-800 border-blue-200" }
    }
    return badges[tipo] || { label: tipo, className: "bg-gray-100 text-gray-800 border-gray-200" }
  }

  // -------------------------------
  // Render principal
  // -------------------------------
  if (!patient || !atencion) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl bg-white border border-gray-300 shadow-2xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-[#114C5F]">
              {loading ? "Cargando Información" : error ? "Error" : "Preparando datos"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            {loading ? (
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Cargando datos de la atención...</p>
                <p className="text-xs text-gray-500 mt-2">Cita ID: {citaId}</p>
              </div>
            ) : error ? (
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                <p className="text-red-600 font-semibold mb-2">{error}</p>
                <p className="text-sm text-gray-600 mb-4">
                  Por favor, revise la consola para más detalles
                </p>
                <Button onClick={onClose} className="mt-4">
                  Cerrar
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // -------------------------------
  // Contenido completo del modal
  // -------------------------------
  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] h-[95vh] flex flex-col bg-white p-0">
          {/* HEADER */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-[#114C5F] to-[#4F9BB6]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white hover:bg-white/20 flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver
                </Button>
                <DialogTitle className="text-2xl font-semibold text-white">
                  Revisión de Atención Médica
                </DialogTitle>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowLiquidaciones(true)}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 flex items-center gap-2 mr-8"
              >
                <Receipt className="h-4 w-4" />
                Ver Liquidación
              </Button>
            </div>
          </DialogHeader>

          {/* BODY */}
          <div className="flex-1 min-h-0 overflow-hidden flex gap-4 p-6">
            <PatientSidebar patient={patient} citaContext={citaContext} atencion={atencion} />

            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabSection)} className="flex-1 min-h-0 flex flex-col">
                <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-lg">
                  <TabsTrigger value="atencion" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white flex items-center gap-2 text-sm">
                    Atención
                  </TabsTrigger>
                  <TabsTrigger value="diagnosticos" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white flex items-center gap-2 text-sm">
                    Diagnósticos y procedimientos
                  </TabsTrigger>
                  <TabsTrigger value="apoyo" className="data-[state=active]:bg-green-500 data-[state=active]:text-white flex items-center gap-2 text-sm">
                    Apoyo Diagnóstico
                  </TabsTrigger>
                  <TabsTrigger value="farmacia" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white flex items-center gap-2 text-sm">
                    Farmacia
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="atencion" className="flex-1 min-h-0 mt-4 overflow-y-auto pr-2">
                  <AtencionTab atencion={atencion} onAddObservation={handleAddObservation} hasObservation={hasObservation} getObservationText={getObservationText} />
                </TabsContent>

                <TabsContent value="diagnosticos" className="flex-1 min-h-0 mt-4 overflow-y-auto pr-2">
                  <DiagnosticosTab atencion={atencion} onAddObservation={handleAddObservation} hasObservation={hasObservation} getObservationText={getObservationText} getTipoDxBadge={getTipoDxBadge} />
                </TabsContent>

                <TabsContent value="apoyo" className="flex-1 min-h-0 mt-4 overflow-y-auto pr-2">
                  <ApoyoDiagnosticoTab atencion={atencion} onAddObservation={handleAddObservation} hasObservation={hasObservation} getObservationText={getObservationText} />
                </TabsContent>

                <TabsContent value="farmacia" className="flex-1 min-h-0 mt-4 overflow-y-auto pr-2">
                  <FarmaciaTab atencion={atencion} onAddObservation={handleAddObservation} hasObservation={hasObservation} getObservationText={getObservationText} />
                </TabsContent>
              </Tabs>

              {/* FOOTER */}
              <div className="border-t mt-4 pt-4 bg-gray-50 px-4 py-3 rounded-b-lg">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold">{observations.length}</span> observación(es) registradas
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={onClose} className="border-gray-300">
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveAll}
                      className="bg-[#4F9BB6] hover:bg-[#4A6EB0] text-white"
                      disabled={observations.length === 0}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Observaciones ({observations.length})
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONFIRMACIÓN DE OBSERVACIONES */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col bg-white border border-gray-300 shadow-2xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-[#114C5F] flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              Confirmar Observaciones
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            <p className="text-gray-700 mb-4">
              Se han registrado <span className="font-bold text-[#4F9BB6]">{observations.length}</span> observación(es). 
              Por favor, revise el detalle antes de confirmar:
            </p>
            <div className="space-y-3">
              {observations.map((obs) => (
                <div key={obs.fieldName} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">{prettySectionLabel(obs.fieldName)}</p>
                      <p className="text-sm text-gray-800 bg-white p-2 rounded border border-orange-100">
                        {obs.observation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmSave}
              className="bg-[#4F9BB6] hover:bg-[#4A6EB0] text-white"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar y Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE LIQUIDACIONES */}
      <LiquidacionesModal
        open={showLiquidaciones}
        onClose={() => setShowLiquidaciones(false)}
        citaId={citaId}
      />
    </>
  )
}
