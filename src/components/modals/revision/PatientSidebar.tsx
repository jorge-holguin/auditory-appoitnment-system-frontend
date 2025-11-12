// components/revision/PatientSidebar.tsx
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, CreditCard, Heart, User } from "lucide-react"

interface Patient {
  paciente: string
  nombres: string
  stringFoto: string
  estadoCivil: string
  fechaNacimiento: string
  edad: string
}

interface CitaContext {
  historia: string
  seguroNombre: string
  seguro: string
  numRef: string
  entidadSis: string
}

interface Props {
  patient: Patient
  citaContext: CitaContext
  atencion: { 
    fechaAtencion: string
    horaAtencion: string
    consultorio: string
    profesional: string
  }
}

export default function PatientSidebar({ patient, citaContext, atencion }: Props) {
  const fotoSrc = patient.stringFoto
    ? (patient.stringFoto.trim().startsWith('data:')
        ? patient.stringFoto.trim()
        : `data:image/jpeg;base64,${patient.stringFoto.trim()}`)
    : ''

  return (
    <div className="w-80 flex-shrink-0">
      <Card className="shadow-md h-full overflow-y-auto">
        <CardContent className="p-5 space-y-4">
          {/* Foto y nombre */}
          <div className="flex flex-col items-center pb-4 border-b">
            <div className="relative w-28 h-32 mb-3">
              {fotoSrc ? (
                <img
                  src={fotoSrc}
                  alt="Foto del paciente"
                  className="w-full h-full object-cover rounded-lg border-2 border-[#9CD2D3] shadow-sm"
                />
              ) : (
                <div className="w-full h-full rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-gray-300">
                  <User className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>
            <h3 className="font-bold text-base text-[#114C5F] text-center leading-tight">
              {patient.nombres}
            </h3>
            <p className="text-xs text-gray-600 mt-1">Código: {patient.paciente}</p>
          </div>

          {/* Datos del paciente */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4 text-[#4F9BB6] flex-shrink-0" />
              <div>
                <span className="font-semibold text-gray-700">HC:</span>
                <span className="ml-1 text-gray-900">{citaContext.historia}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-[#4F9BB6] flex-shrink-0" />
              <div>
                <span className="font-semibold text-gray-700">F. Nacimiento:</span>
                <span className="ml-1 text-gray-900">{patient.fechaNacimiento}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-[#4F9BB6] flex-shrink-0" />
              <div>
                <span className="font-semibold text-gray-700">Edad:</span>
                <span className="ml-1 text-gray-900">{patient.edad}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Heart className="h-4 w-4 text-[#4F9BB6] flex-shrink-0" />
              <div>
                <span className="font-semibold text-gray-700">Estado Civil:</span>
                <span className="ml-1 text-gray-900">{patient.estadoCivil}</span>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t">
            {/* Seguro */}
            <h4 className="font-semibold text-sm text-[#114C5F] mb-2">Seguro</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="block font-semibold text-gray-700 text-xs">Nombre:</span>
                <p className="text-gray-900">{citaContext.seguroNombre || "-"}</p>
              </div>
              <div>
                <span className="block font-semibold text-gray-700 text-xs">Código:</span>
                <p className="text-gray-900">{citaContext.seguro || "-"}</p>
              </div>
            </div>

            {/* Referencia */}
            <h4 className="font-semibold text-sm text-[#114C5F] mt-4 mb-2">Referencia</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="block font-semibold text-gray-700 text-xs">N° Ref:</span>
                <p className="text-gray-900">{citaContext.numRef || "-"}</p>
              </div>
              <div>
                <span className="block font-semibold text-gray-700 text-xs">Entidad SIS:</span>
                <p className="text-gray-900">{citaContext.entidadSis || "-"}</p>
              </div>
            </div>
          </div>


        {/* Datos de Atención (2x2) */}
        <div className="pt-3 border-t">
          <h4 className="font-semibold text-sm text-[#114C5F] mb-2">Datos de Atención</h4>
          <div className="grid grid-cols-2 gap-3 text-xs bg-blue-50 p-3 rounded-lg border border-blue-100">
            <div className="space-y-0.5">
              <span className="font-semibold text-blue-900">Fecha:</span>
              <p className="text-blue-800">{atencion.fechaAtencion}</p>
            </div>
            <div className="space-y-0.5">
              <span className="font-semibold text-blue-900">Hora:</span>
              <p className="text-blue-800">{atencion.horaAtencion}</p>
            </div>
            <div className="space-y-0.5">
              <span className="font-semibold text-blue-900">Consultorio:</span>
              <p className="text-blue-800">{atencion.consultorio}</p>
            </div>
            <div className="space-y-0.5">
              <span className="font-semibold text-blue-900">Profesional:</span>
              <p className="text-blue-800">{atencion.profesional}</p>
            </div>
          </div>
        </div>

        </CardContent>
      </Card>
    </div>
  )
}
