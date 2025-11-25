// components/revision/types.ts

// -----------------------------
// Secciones (Tabs)
// -----------------------------
export type TabSection = 'atencion' | 'diagnosticos' | 'apoyo' | 'farmacia'

// -----------------------------
// Observaciones
// -----------------------------
export interface FieldObservation {
  fieldName: string
  originalValue: string
  observation: string
}

export type HasObservation = (fieldName: string) => boolean
export type AddObservation = (fieldName: string, originalValue: string) => void | Promise<void>

// -----------------------------
// Entidades de apoyo diagnóstico y farmacia
// -----------------------------
export interface ExamenLaboratorio {
  Nombre: string
  Diagnostico: string
}

export interface ExamenRayosX {
  Nombre: string
  Zona: string
  Diagnostico: string
}

export interface ExamenEcografia {
  Nombre: string
  Lugar: string
  Observacion: string
  Diagnostico: string
}

export interface Farmaco {
  Nombre: string
  Cantidad: string
  Dosis: string
  Frecuencia: string
  Dias: string
  Via: string
  Diagnostico: string
}

// -----------------------------
// Liquidaciones
// -----------------------------
export interface DetalleServicio {
  Item: string
  DetalleProducto: string
  Cantidad: string
  Precio: string
  Total: string
}

// -----------------------------
// Diagnósticos y procedimientos
// -----------------------------
export interface Diagnostico {
  numero: string
  tipoDx: string
  descripcion: string
  cie10: string
}

export interface Procedimiento {
  codigo?: string
  descripcion?: string
  cantidad?: number
}

// -----------------------------
// Datos de Atención (principal)
// -----------------------------
export interface AtencionData {
  // Información general
  fechaAtencion: string
  horaAtencion: string
  consultorio: string
  profesional: string

  // Funciones vitales
  temperatura: string
  presionArterial: string
  frecuenciaCardiaca: string
  peso: string
  talla: string
  imc: string

  // Bloque Atención
  Motivo: string
  TiempoEnfermedad: string
  Antecedente: string
  RelatoAnamnesis: string
  ExamenFisico: string
  Apetito: string
  Sed: string
  Sueño: string
  EstadoAnimo: string
  Orina: string
  Deposiciones: string

  // Diagnósticos principales/secundarios (resumen)
  DiagnosticoPrincipal: string
  TipoDX_Principal: string
  CodigoCIE_Principal: string
  DiagnosticoSecundario: string
  TipoDX_Secundario: string
  CodigoCIE_Secundario: string

  // Plan terapéutico
  PlanTerapeutico: string
  ProximaCita: string
  Destino: string
  Observaciones: string

  // Apoyo al diagnóstico - Laboratorio
  Laboratorio_Diagnostico: string
  Laboratorio_NombreExamen: string
  ListadoExamenesLaboratorio: ExamenLaboratorio[]

  // Apoyo al diagnóstico - Rayos X
  RayosX_Diagnostico: string
  RayosX_NombreExamen: string
  RayosX_Zona: string
  ListadoExamenesRayosX: ExamenRayosX[]

  // Apoyo al diagnóstico - Ecografía
  Ecografia_Diagnostico: string
  Ecografia_Lugar: string
  Ecografia_NombreExamen: string
  Ecografia_Observacion: string
  ListadoExamenesEcografia: ExamenEcografia[]

  // Farmacia
  Farmacia_Diagnostico: string
  Farmacia_NombreFarmaco: string
  ListadoFarmacos: Farmaco[]
  Farmacia_IndicacionesGenerales: string

  // Liquidaciones
  Liquidacion_CuentaCorriente: string
  Liquidacion_FechaEmision: string
  Liquidacion_HoraEmision: string
  Liquidacion_HistoriaClinica: string
  Liquidacion_ApellidosNombres: string
  Liquidacion_TipoPaciente: string
  Liquidacion_EmpresaAseguradora: string
  Liquidacion_Origen: string
  Liquidacion_Consultorio: string
  Liquidacion_MedicoTratante: string
  Liquidacion_Diagnostico1: string
  Liquidacion_Diagnostico2: string
  Liquidacion_Diagnostico3: string
  Liquidacion_FechaIngreso: string
  Liquidacion_NroCama: string
  Liquidacion_DetalleServicios: DetalleServicio[]
  Liquidacion_TotalPagar: string

  // Listados consolidados
  ListadoDiagnosticos: Diagnostico[]
  ListadoProcedimientos: Procedimiento[]
}
