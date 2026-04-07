// components/revision/RevisionAtencionModal.tsx
import React, { useState, useEffect, Suspense } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, Receipt, Save, ArrowLeft, CheckCircle, Trash2 } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

import PatientSidebar from "./revision/PatientSidebar"
import { LiquidacionesModal } from "./revision/LiquidacionesModal"
import type { AtencionData, FieldObservation, HasObservation, AddObservation, TabSection, GetObservationEstado, DeleteObservation } from "./revision/types"
import { obtenerAtencionCompleta, obtenerPacienteConFoto, observarCita, aprobarCita, deleteObservados, buscarCitaPorId } from "@/services/citaService"
import { obtenerObservacionesPorCita, crearObservacion, editarObservacion, anularObservacion, SECCION_IDS } from "@/services/observacionService"
import { extractDocumentFromToken } from "@/utils/jwtUtils"

// Lazy-load de los Tabs
const AtencionTab = React.lazy(() => import("./revision/tabs/AtencionTab"))
const DiagnosticosTab = React.lazy(() => import("./revision/tabs/DiagnosticosTab"))
const ApoyoDiagnosticoTab = React.lazy(() => import("./revision/tabs/ApoyoDiagnosticoTab"))
const FarmaciaTab = React.lazy(() => import("./revision/tabs/FarmaciaTab"))

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
  citaEstado?: string
  readOnly?: boolean
}

export function RevisionAtencionModal({
  open,
  onClose,
  citaId,
  citaContext,
  onSave,
  onRefresh,
  citaEstado = '1', // Default to PENDIENTE if not provided
  readOnly = false
}: RevisionAtencionModalProps) {
  const [observations, setObservations] = useState<FieldObservation[]>([])
  const [activeTab, setActiveTab] = useState<TabSection>("atencion")
  const [showLiquidaciones, setShowLiquidaciones] = useState(false)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [atencion, setAtencion] = useState<AtencionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [resolvedCitaContext, setResolvedCitaContext] = useState<CitaContext>(citaContext)

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
      // Primero cargar la atención completa para obtener el código del paciente
      const dataAtencion = await obtenerAtencionCompleta(citaId)

      // Obtener datos completos de la cita y complementar campos faltantes del citaContext
      let citaData = { ...citaContext }
      try {
        const cita = await buscarCitaPorId(citaId)
        citaData = {
          paciente: citaContext.paciente || cita.paciente || '',
          fecha: citaContext.fecha || cita.fecha || '',
          hora: citaContext.hora || cita.hora || '',
          consultorioNombre: citaContext.consultorioNombre || cita.consultorioNombre || '',
          medicoNombre: citaContext.medicoNombre || cita.medicoNombre || '',
          seguroNombre: citaContext.seguroNombre || cita.seguroNombre || '',
          historia: citaContext.historia || cita.historia?.trim() || '',
          seguro: citaContext.seguro || cita.seguro?.trim() || '',
          numRef: citaContext.numRef || cita.numRef?.trim() || '',
          entidadSis: citaContext.entidadSis || cita.entidadSis?.trim() || ''
        }
      } catch (err) {
        console.warn("⚠️ No se pudo obtener datos de la cita:", err)
      }
      
      // Guardar el contexto resuelto para PatientSidebar
      setResolvedCitaContext(citaData)

      // Extraer el código del paciente de la atención (puede estar en diferentes campos)
      const codigoPaciente = citaData.paciente || dataAtencion.atencionc?.paciente || dataAtencion.paciente || dataAtencion.atencionc?.codpaciente || dataAtencion.atencionc?.codPaciente
      
      if (!codigoPaciente) {
        throw new Error("No se pudo determinar el código del paciente. Contexto vacío y atención sin código de paciente.")
      }

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
      // Filtrar: estado 0 (anuladas) no se muestran, estado 1 (activas) y estado 2 (subsanadas) sí
      // Regla: solo una observación por sección (fieldName), tomando la de mayor idObservacion
      const observacionesFiltradas = observacionesExistentes.filter(obs => obs.estado !== '0')
      
      const observacionesPorSeccion = observacionesFiltradas.reduce((acc, obs) => {
        // Buscar el nombre de sección por su ID
        const sectionEntry = Object.entries(SECCION_IDS).find(([_, id]) => id === obs.idSeccion)
        const sectionName = sectionEntry ? sectionEntry[0] : `OBSERVACION_seccion_${obs.idSeccion}`

        const existente = acc[sectionName]
        const idActual = obs.idObservacion ?? 0
        const idExistente = existente?.idObservacion ?? 0

        if (!existente || idActual >= idExistente) {
          acc[sectionName] = {
            fieldName: sectionName,
            originalValue: "",
            observation: obs.descripcion,
            idObservacion: obs.idObservacion,
            estado: obs.estado
          }
        }

        return acc
      }, {} as Record<string, FieldObservation>)

      const observacionesMapeadas: FieldObservation[] = Object.values(observacionesPorSeccion)

      setObservations(observacionesMapeadas)

      // Usar dataAtencion obtenido al inicio de la función
      const pesoNum = Number(dataAtencion.atencionc?.peso) || 0
      const tallaNumCm = Number(dataAtencion.atencionc?.talla) || 0
      let imcCalculado = "0"

      if (pesoNum > 0 && tallaNumCm > 0) {
        const tallaMetros = tallaNumCm / 100
        const imcValor = tallaMetros > 0 ? pesoNum / (tallaMetros * tallaMetros) : 0
        if (imcValor > 0) {
          imcCalculado = imcValor.toFixed(2)
        }
      }

      const atencionData: AtencionData = {
        // Info básica
        fechaAtencion: citaData.fecha ? formatearFecha(citaData.fecha) : formatearFecha(dataAtencion.atencionc?.fecha || ''),
        horaAtencion: citaData.hora || dataAtencion.atencionc?.horaAten || '',
        consultorio: citaData.consultorioNombre || dataAtencion.atencionc?.consultorioNombre || '',
        profesional: citaData.medicoNombre || dataAtencion.atencionc?.profAtencion || '',
        temperatura: dataAtencion.atencionc?.tempe?.toString() || "0",
        presionArterial: dataAtencion.atencionc?.presion || "0/0",
        frecuenciaCardiaca: dataAtencion.atencionc?.fc?.toString() || "0",
        peso: pesoNum ? pesoNum.toString() : "0",
        talla: tallaNumCm ? tallaNumCm.toString() : "0",
        imc: imcCalculado,

        // Bloque atención
        Motivo: dataAtencion.atencionc?.motivo || "",
        TiempoEnfermedad: dataAtencion.atencionc?.tiempoEnf || "",
        Antecedente: dataAtencion.atencionc?.antecedente || "",
        RelatoAnamnesis: dataAtencion.atencionc?.ananmesis || "",
        ExamenFisico: dataAtencion.atencionc?.examenFisico || "",
        Apetito: dataAtencion.atencionc?.apetito || "Conservado",
        Sed: dataAtencion.atencionc?.sed || "Conservado",
        Sueño: dataAtencion.atencionc?.sueno || "Conservado",
        EstadoAnimo: dataAtencion.atencionc?.animo || "Conservado",
        Orina: dataAtencion.atencionc?.orina || "Conservado",
        Deposiciones: dataAtencion.atencionc?.deposiciones || "Conservado",
        SaludMaterna: dataAtencion.atencionc?.saludMaterna?.trim() || "NO APLICA",

        // Diagnósticos
        DiagnosticoPrincipal: "",
        TipoDX_Principal: "",
        CodigoCIE_Principal: "",
        DiagnosticoSecundario: "",
        TipoDX_Secundario: "",
        CodigoCIE_Secundario: "",

        // Plan terapéutico
        PlanTerapeutico: dataAtencion.atencionc?.planTerapeutico || "",
        ProximaCita: "",
        Destino: dataAtencion.atencionc?.destino || "",
        Observaciones: dataAtencion.atencionc?.observacion || "",

        // Apoyo diagnóstico
        Laboratorio_Diagnostico: "",
        Laboratorio_NombreExamen: "",
        ListadoExamenesLaboratorio: dataAtencion.laboratorio || [],
        RayosX_Diagnostico: "",
        RayosX_NombreExamen: "",
        RayosX_Zona: "",
        ListadoExamenesRayosX: dataAtencion.rayos || [],
        Ecografia_Diagnostico: "",
        Ecografia_Lugar: "",
        Ecografia_NombreExamen: "",
        Ecografia_Observacion: "",
        ListadoExamenesEcografia: dataAtencion.ecografia || [],

        // Farmacia
        Farmacia_Diagnostico: "",
        Farmacia_NombreFarmaco: "",
        Farmacia_IndicacionesGenerales: "",
        ListadoFarmacos: (dataAtencion.receta || []).map((r: any) => ({
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
        ListadoDiagnosticos: dataAtencion.diagnosticos || [],
        ListadoProcedimientos: dataAtencion.procedimientos || []
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
    
    // Guardar automáticamente en el backend si es una sección con observación
    if (isSection && value) {
      try {
        const idSeccion = SECCION_IDS[fieldName as keyof typeof SECCION_IDS]
        if (idSeccion) {
          const usuarioRegistro = extractDocumentFromToken() || "SISTEMA"
          const requestData = {
            idCita: citaId,
            idSeccion,
            descripcion: value,
            usuarioRegistro
          }
          
          let savedObservation
          // Si ya existe una observación, usar PUT para editar
          if (existing?.idObservacion) {
            savedObservation = await editarObservacion(existing.idObservacion, requestData)
            console.log(`✅ Observación editada automáticamente para ${fieldName}`)
          } else {
            // Si no existe, usar POST para crear
            savedObservation = await crearObservacion(requestData)
            console.log(`✅ Observación creada automáticamente para ${fieldName}`)
          }
          
          // Actualizar el estado con el ID de la observación guardada
          updated.push({
            fieldName,
            originalValue: isSection ? "" : value,
            observation: isSection ? value : (existing?.observation || ""),
            idObservacion: savedObservation.idObservacion
          })
        }
      } catch (error) {
        console.error("Error al guardar observación automáticamente:", error)
        // Agregar al estado local aunque falle el guardado
        updated.push({
          fieldName,
          originalValue: isSection ? "" : value,
          observation: isSection ? value : (existing?.observation || ""),
          idObservacion: existing?.idObservacion
        })
      }
    } else {
      // Si no es una sección o no hay valor, solo actualizar el estado local
      updated.push({
        fieldName,
        originalValue: isSection ? "" : value,
        observation: isSection ? value : (existing?.observation || ""),
        idObservacion: existing?.idObservacion
      })
    }
    
    setObservations(updated)
  }

  const hasObservation: HasObservation = (fieldName) =>
    observations.some(o => o.fieldName === fieldName)

  const getObservationText = (fieldName: string) =>
    observations.find(o => o.fieldName === fieldName)?.observation || ""

  const getObservationEstado: GetObservationEstado = (fieldName: string) =>
    observations.find(o => o.fieldName === fieldName)?.estado

  const handleDeleteObservationByField: DeleteObservation = async (fieldName: string) => {
    const obs = observations.find(o => o.fieldName === fieldName)
    if (obs) {
      await handleDeleteObservation(obs)
    }
  }

  const prettySectionLabel = (fieldName: string) => {
    const map: Record<string, string> = {
      OBSERVACION_funciones_vitales: "Observaciones de Funciones Vitales",
      OBSERVACION_Atención_Principal_Motivo_Antecedentes: "Observaciones de Atención Principal / Motivo / Antecedentes",
      OBSERVACION_diagnosticos: "Observaciones de los Diagnósticos",
      OBSERVACION_destino: "Observaciones del Destino",
      OBSERVACION_farmacia: "Observaciones de la Receta Médica",
      OBSERVACION_laboratorio: "Observaciones de los Exámenes de Laboratorio",
      OBSERVACION_rayosx: "Observaciones de los Exámenes de Rayos X",
      OBSERVACION_ecografia: "Observaciones de los Exámenes de Ecografía",
      OBSERVACION_procedimientos: "Observaciones de los Procedimientos",
      OBSERVACION_observaciones_destino: "Observaciones de las Observaciones",
      OBSERVACION_plan_terapeutico: "Observaciones del Plan Terapéutico",
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
      // Eliminar firmas de documentos observados
      const usuario = extractDocumentFromToken()
      if (usuario) {
        try {
          await deleteObservados(citaId, "firma anulada por observacion del auditor", usuario)
          console.log("✅ Firmas de documentos eliminadas correctamente")
        } catch (err) {
          console.error("Error al eliminar firmas:", err)
          // No bloqueamos el flujo si falla la eliminación de firmas
        }
      }

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

  // Función para aprobar la cita (cambiar a estado 3)
  const handleApprove = async () => {
    try {
      // Cambiar el estado de la cita a APROBADO (3)
      await aprobarCita(citaId)
      
      // Refrescar la lista si se proporciona el callback
      if (onRefresh) {
        onRefresh()
      }
      
      onClose()
      console.log(`✅ Cita ${citaId} aprobada correctamente`)
    } catch (error) {
      console.error("Error al aprobar cita:", error)
      alert("Error al aprobar la cita. Por favor, intente nuevamente.")
    }
  }

  const getTipoDxBadge = (tipo: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      D: { label: "Definitivo", className: "bg-green-100 text-green-800 border-green-200" },
      R: { label: "Repetitivo", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
      P: { label: "Presuntivo", className: "bg-blue-100 text-blue-800 border-blue-200" }
    }
    return badges[tipo] || { label: tipo, className: "bg-gray-100 text-gray-800 border-gray-200" }
  }

  // Eliminar (anular) una observación
  const handleDeleteObservation = async (obs: FieldObservation) => {
    if (!obs.idObservacion) return
    
    try {
      // Obtener el DNI del usuario desde el JWT
      const usuario = extractDocumentFromToken() || "SISTEMA"
      await anularObservacion(obs.idObservacion, usuario)
      // Remover del estado local
      setObservations(prev => prev.filter(o => o.idObservacion !== obs.idObservacion))
      console.log(`✅ Observación ${obs.idObservacion} anulada correctamente`)
    } catch (error) {
      console.error("Error al anular observación:", error)
      alert("Error al eliminar la observación. Por favor, intente nuevamente.")
    }
  }

  // Filtrar observaciones activas (estado 1 o sin estado definido)
  const observacionesActivas = observations.filter(obs => obs.estado !== '2')
  const observacionesSubsanadas = observations.filter(obs => obs.estado === '2')

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
                <DialogTitle className="text-2xl font-semibold text-white flex items-center gap-3">
                  {readOnly ? 'Consulta de Atención Médica' : 'Revisión de Atención Médica'}
                  {/* Etiqueta de estado de auditoría */}
                  {citaEstado && (
                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                      citaEstado === 'APROBADO' ? 'bg-green-500/20 text-green-100 border border-green-400/50' :
                      citaEstado === 'OBSERVADO' ? 'bg-red-500/20 text-red-100 border border-red-400/50' :
                      citaEstado === 'SUBSANADO' ? 'bg-purple-500/20 text-purple-100 border border-purple-400/50' :
                      citaEstado === 'EN_REVISION' ? 'bg-blue-500/20 text-blue-100 border border-blue-400/50' :
                      'bg-yellow-500/20 text-yellow-100 border border-yellow-400/50'
                    }`}>
                      {citaEstado === 'APROBADO' ? 'Aprobado' :
                       citaEstado === 'OBSERVADO' ? 'Observado' :
                       citaEstado === 'SUBSANADO' ? 'Subsanado' :
                       citaEstado === 'EN_REVISION' ? 'En Revisión' :
                       'Pendiente'}
                    </span>
                  )}
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
            <PatientSidebar patient={patient} citaContext={resolvedCitaContext} atencion={atencion} />

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
                  <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>}>
                    <AtencionTab atencion={atencion} onAddObservation={handleAddObservation} hasObservation={hasObservation} getObservationText={getObservationText} getObservationEstado={getObservationEstado} onDeleteObservation={handleDeleteObservationByField} readOnly={readOnly} />
                  </Suspense>
                </TabsContent>

                <TabsContent value="diagnosticos" className="flex-1 min-h-0 mt-4 overflow-y-auto pr-2">
                  <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>}>
                    <DiagnosticosTab atencion={atencion} onAddObservation={handleAddObservation} hasObservation={hasObservation} getObservationText={getObservationText} getTipoDxBadge={getTipoDxBadge} getObservationEstado={getObservationEstado} onDeleteObservation={handleDeleteObservationByField} readOnly={readOnly} />
                  </Suspense>
                </TabsContent>

                <TabsContent value="apoyo" className="flex-1 min-h-0 mt-4 overflow-y-auto pr-2">
                  <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-green-500" /></div>}>
                    <ApoyoDiagnosticoTab atencion={atencion} onAddObservation={handleAddObservation} hasObservation={hasObservation} getObservationText={getObservationText} getObservationEstado={getObservationEstado} onDeleteObservation={handleDeleteObservationByField} readOnly={readOnly} />
                  </Suspense>
                </TabsContent>

                <TabsContent value="farmacia" className="flex-1 min-h-0 mt-4 overflow-y-auto pr-2">
                  <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-purple-500" /></div>}>
                    <FarmaciaTab atencion={atencion} onAddObservation={handleAddObservation} hasObservation={hasObservation} getObservationText={getObservationText} getObservationEstado={getObservationEstado} onDeleteObservation={handleDeleteObservationByField} readOnly={readOnly} />
                  </Suspense>
                </TabsContent>
              </Tabs>

              {/* FOOTER */}
              {readOnly ? (
                <div className="border-t mt-4 pt-4 bg-gray-50 px-4 py-3 rounded-b-lg">
                  <div className="flex items-center justify-end">
                    <Button variant="outline" onClick={onClose} className="border-gray-300">
                      Cerrar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-t mt-4 pt-4 bg-gray-50 px-4 py-3 rounded-b-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold">{observacionesActivas.length}</span> observación(es) activa(s)
                      {observacionesSubsanadas.length > 0 && (
                        <span className="ml-2 text-red-600">| {observacionesSubsanadas.length} subsanada(s)</span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={onClose} className="border-gray-300">
                        Cancelar
                      </Button>
                      
                      {/* Botón Aprobar - visible cuando no hay observaciones activas y la cita está en estado SUBSANADO o EN_REVISION */}
                      {observacionesActivas.length === 0 && (citaEstado === 'SUBSANADO' || citaEstado === 'EN_REVISION') && (
                        <Button
                          onClick={handleApprove}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Aprobar
                        </Button>
                      )}
                      
                      {/* Botón Guardar Observaciones - siempre visible */}
                      <Button
                        onClick={handleSaveAll}
                        className="bg-[#4F9BB6] hover:bg-[#4A6EB0] text-white"
                        disabled={observacionesActivas.length === 0}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Guardar Observaciones ({observacionesActivas.length})
                      </Button>
                    </div>
                  </div>
                </div>
              )}
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
              Se han registrado <span className="font-bold text-[#4F9BB6]">{observacionesActivas.length}</span> observación(es) activa(s). 
              Por favor, revise el detalle antes de confirmar:
            </p>
            
            {/* Observaciones Activas */}
            <div className="space-y-3">
              {observacionesActivas.map((obs) => (
                <div key={obs.fieldName} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">{prettySectionLabel(obs.fieldName)}</p>
                      <p className="text-sm text-gray-800 bg-white p-2 rounded border border-orange-100">
                        {obs.observation}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteObservation(obs)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                      title="Eliminar observación"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Observaciones Subsanadas (solo lectura, en rojo) */}
            {observacionesSubsanadas.length > 0 && (
              <div className="mt-6">
                <p className="text-red-600 font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Observaciones Subsanadas ({observacionesSubsanadas.length})
                </p>
                <div className="space-y-3">
                  {observacionesSubsanadas.map((obs) => (
                    <div key={obs.fieldName} className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-red-800 mb-1">{prettySectionLabel(obs.fieldName)}</p>
                          <p className="text-sm text-red-700 bg-white p-2 rounded border border-red-100">
                            {obs.observation}
                          </p>
                          <p className="text-xs text-red-500 mt-1 italic">Subsanada - Solo lectura</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
