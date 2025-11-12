"use client";

import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerificacionDiagnosticoProps {
  diagnostico: string;
  onResultado: (resultado: ResultadoVerificacion) => void;
  className?: string;
}

export interface ResultadoVerificacion {
  valido: boolean;
  reemplazo?: string;
  multiples?: boolean;
  mensaje?: string;
}

export interface VerificacionDiagnosticoRef {
  verificar: () => Promise<ResultadoVerificacion>;
}

const VerificacionDiagnostico = forwardRef<VerificacionDiagnosticoRef, VerificacionDiagnosticoProps>(
  ({ diagnostico, onResultado, className }, ref) => {
    const [mensaje, setMensaje] = useState<string | null>(null);
    const [tipo, setTipo] = useState<'error' | 'warning' | 'success' | null>(null);
    const [cargando, setCargando] = useState(false);

    // Exponer el método verificar a través del ref
    useImperativeHandle(ref, () => ({
      verificar: async () => {
        if (!diagnostico || diagnostico.trim() === '') {
          setMensaje('No se ha especificado un diagnóstico para verificar');
          setTipo('error');
          const resultado = { valido: false, mensaje: 'No se ha especificado un diagnóstico' };
          onResultado(resultado);
          return resultado;
        }

        try {
          setCargando(true);
          setMensaje(null);
          setTipo(null);

          // Obtener el token de autenticación
          const authToken = localStorage.getItem('authToken');
          if (!authToken) {
            throw new Error('No se encontró el token de autenticación');
          }

          // Extraer el código del diagnóstico (asumiendo formato "CODIGO - DESCRIPCION")
          // Si el diagnóstico es "undefined", usar una cadena vacía para buscar todos los diagnósticos
          const codigoDiagnostico = diagnostico === "undefined" ? "" : 
                                   diagnostico.split('-')[0]?.trim() || diagnostico.trim();
          
          // Realizar la consulta a la API
          const response = await fetch(
            
            `${process.env.NEXT_PUBLIC_API_CIEX_URL}/ciex?busqueda=${encodeURIComponent(codigoDiagnostico)}`,
            {
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
              }
            }
          );

          const data = await response.json();

          if (!data.success) {
            setMensaje(`Diagnóstico inválido: ${codigoDiagnostico}`);
            setTipo('error');
            const resultado = { valido: false, mensaje: 'Diagnóstico inválido' };
            onResultado(resultado);
            return resultado;
          }

          // Verificar si hay resultados
          if (data.data && data.data.length > 0) {
            if (data.data.length === 1) {
              // Un solo resultado, usar como reemplazo
              // Si el diagnóstico original es "undefined", usar el campo cie10 directamente
              // La estructura de la respuesta tiene campos cie10 y descripcion
              const cie10Value = data.data[0].cie10 ? data.data[0].cie10.trim() : '';
              const descripcion = data.data[0].descripcion || '';
              const cie10 = `${cie10Value} - ${descripcion}`;
              
              setMensaje(`Diagnóstico validado: ${cie10}`);
              setTipo('success');
              const resultado = { 
                valido: true, 
                reemplazo: cie10.trim(), 
                multiples: false,
                mensaje: 'Diagnóstico validado correctamente'
              };
              onResultado(resultado);
              return resultado;
            } else {
              // Múltiples resultados, mostrar mensaje
              const opciones = data.data.map((item: { cie10?: string; descripcion?: string }) => {
                const codigo = item.cie10 ? item.cie10.trim() : '';
                const descripcion = item.descripcion || '';
                return `${codigo} - ${descripcion}`;
              }).join(', ');
              
              setMensaje(`Múltiples diagnósticos encontrados: ${opciones}`);
              setTipo('warning');
              const resultado = { 
                valido: true, 
                multiples: true,
                mensaje: `Se encontraron ${data.data.length} diagnósticos similares`
              };
              onResultado(resultado);
              return resultado;
            }
          } else {
            // No se encontraron resultados
            setMensaje(`No se encontraron diagnósticos que coincidan con: ${codigoDiagnostico}`);
            setTipo('error');
            const resultado = { 
              valido: false,
              mensaje: 'No se encontraron diagnósticos que coincidan'
            };
            onResultado(resultado);
            return resultado;
          }
        } catch (error: any) {
          console.error('Error al verificar diagnóstico:', error);
          setMensaje(`Error al verificar diagnóstico: ${error.message || 'Error desconocido'}`);
          setTipo('error');
          const resultado = { 
            valido: false,
            mensaje: `Error al verificar diagnóstico: ${error.message || 'Error desconocido'}`
          };
          onResultado(resultado);
          return resultado;
        } finally {
          setCargando(false);
        }
      }
    }));

    // No renderizar nada si no hay mensaje
    if (!mensaje) return null;

    return (
      <Card className={cn("border", {
        "border-red-200 bg-red-50": tipo === 'error',
        "border-yellow-200 bg-yellow-50": tipo === 'warning',
        "border-green-200 bg-green-50": tipo === 'success'
      }, className)}>
        <CardContent className="p-4">
          <Alert variant="default" className={cn("border-0 bg-transparent", {
            "text-red-800": tipo === 'error',
            "text-yellow-800": tipo === 'warning',
            "text-green-800": tipo === 'success'
          })}>
            {tipo === 'error' && <AlertCircle className="h-5 w-5" />}
            {tipo === 'warning' && <AlertCircle className="h-5 w-5" />}
            {tipo === 'success' && <CheckCircle2 className="h-5 w-5" />}
            <AlertTitle className="font-semibold">
              {tipo === 'error' && 'Error en la verificación'}
              {tipo === 'warning' && 'Atención'}
              {tipo === 'success' && 'Verificación exitosa'}
            </AlertTitle>
            <AlertDescription className="mt-2">
              {mensaje}
              {cargando && (
                <div className="mt-2 flex items-center">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  <span>Verificando diagnóstico...</span>
                </div>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
);

VerificacionDiagnostico.displayName = 'VerificacionDiagnostico';

export default VerificacionDiagnostico;
