"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Download, Printer, ArrowLeft, FileText, AlertCircle, RefreshCw } from "lucide-react"
import { mergePDFs, downloadMergedPDF, printMergedPDF } from '@/utils/pdfUtils'
import { useRouter } from 'next/navigation'

interface PDFViewerModalProps {
  open: boolean
  onClose: () => void
  pdfUrls: string[]
  title: string
  patientId?: string // ID del paciente para el botón "Ir a Órdenes"
}

export function PDFViewerModal({ open, onClose, pdfUrls, title, patientId }: PDFViewerModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [pdfData, setPdfData] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Función para cargar los PDFs
  const fetchPdfs = async () => {
    try {
      setLoading(true)
      setErrorMessage(null)
      console.log('URLs de PDFs a cargar:', pdfUrls)
      
      const pdfDataPromises = pdfUrls.map(async (url) => {
        console.log(`Intentando obtener PDF desde: ${url}`)
        try {
          const response = await fetch(url, {
            cache: 'no-cache', // Evitar caché que podría devolver respuestas antiguas
            headers: {
              'Accept': 'application/pdf'
            }
          })
          
          if (!response.ok) {
            console.error(`Error HTTP al obtener PDF: ${response.status} ${response.statusText}`)
            // Intentar leer el cuerpo de la respuesta para depuración
            const errorText = await response.text()
            console.error(`Contenido de la respuesta de error: ${errorText.substring(0, 200)}...`)
            throw new Error(`Error fetching PDF: ${response.status} ${response.statusText}`)
          }
          
          // Verificar que el tipo de contenido sea PDF
          const contentType = response.headers.get('content-type')
          console.log(`Tipo de contenido recibido: ${contentType}`)
          
          const blob = await response.blob()
          console.log(`PDF recibido correctamente, tamaño: ${blob.size} bytes`)
          
          if (blob.size === 0) {
            console.error('El PDF recibido está vacío')
            throw new Error('El PDF recibido está vacío')
          }
          
          return URL.createObjectURL(blob)
        } catch (error) {
          console.error(`Error procesando PDF desde ${url}:`, error)
          // Devolver null para este PDF y continuar con los demás
          return null
        }
      })
      
      const results = await Promise.all(pdfDataPromises)
      // Filtrar los resultados nulos (PDFs que fallaron)
      const validResults = results.filter(url => url !== null) as string[]
      
      if (validResults.length === 0) {
        throw new Error('No se pudo cargar ningún PDF correctamente')
      }
      
      console.log(`Se cargaron ${validResults.length} de ${pdfUrls.length} PDFs correctamente`)
      setPdfData(validResults)
      setLoading(false)
      
      // Esperar a que se carguen los PDFs y luego preparar para imprimir automáticamente
      setTimeout(async () => {
        try {
          console.log('Preparando impresión automática de documento combinado')
          if (validResults.length > 0) {
            await printMergedPDF(validResults)
          } else {
            console.error('No hay PDFs válidos para imprimir')
          }
        } catch (error) {
          console.error('Error en impresión automática:', error)
        }
      }, 2000)
    } catch (error) {
      console.error('Error loading PDFs:', error)
      setLoading(false)
      // Mostrar mensaje de error al usuario
      setErrorMessage('No se pudieron cargar los documentos PDF. Por favor, inténtelo de nuevo más tarde.')
    }
  }

  useEffect(() => {
    if (open && pdfUrls.length > 0) {
      setPdfData([])
      fetchPdfs()
    }
  }, [open, pdfUrls])

  // Función para imprimir todos los PDFs como un solo documento
  const handlePrint = async () => {
    try {
      setLoading(true)
      await printMergedPDF(pdfData)
      setLoading(false)
    } catch (error) {
      console.error('Error al imprimir documento combinado:', error)
      setLoading(false)
    }
  }

  // Función para descargar todos los PDFs como un solo documento
  const handleDownload = async () => {
    try {
      setLoading(true)
      await downloadMergedPDF(pdfData, 'documentos-hospitalizacion.pdf')
      setLoading(false)
    } catch (error) {
      console.error('Error al descargar documento combinado:', error)
      setLoading(false)
    }
  }

  // Función para reintentar la carga de PDFs
  const handleRetry = () => {
    fetchPdfs()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center justify-between">
            <span>{title}</span>
            <div className="flex items-center space-x-2 text-sm font-normal">
              {pdfData.length > 0 && (
                <span className="text-gray-600">
                  {pdfData.length} documento(s)
                </span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 bg-gray-100 rounded-md overflow-hidden relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner size="lg" />
              <span className="ml-2">Cargando documentos...</span>
            </div>
          ) : errorMessage ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-lg font-medium text-red-500 text-center mb-2">{errorMessage}</p>
              <p className="text-sm text-gray-500 text-center mb-6">
                Verifique que la URL del backend es correcta y que el servidor está en funcionamiento.
              </p>
              <Button 
                variant="outline" 
                onClick={handleRetry}
                className="flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Intentar nuevamente
              </Button>
            </div>
          ) : pdfData.length > 0 ? (
            <div className="w-full h-full overflow-y-auto">
              {pdfData.map((pdfUrl, index) => (
                <div key={index} className="mb-4 last:mb-0">
                  <iframe 
                    src={pdfUrl} 
                    className="w-full h-[500px] border-0"
                    title={`PDF Viewer ${index + 1}`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-amber-500 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                No hay documentos para mostrar
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-between items-center pt-4">
          <div></div> {/* Espacio vacío para mantener la alineación */}
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownload} 
              disabled={loading || pdfData.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrint} 
              disabled={loading || pdfData.length === 0}
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            {patientId && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => router.push(`/hospitalization/orders/${patientId}`)}
              >
                <FileText className="w-4 h-4 mr-2" />
                Ir a Órdenes
              </Button>
            )}
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => router.push('/hospitalization')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Hospitalización
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
