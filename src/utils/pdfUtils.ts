/**
 * Utilidades para manejo de PDFs
 */

/**
 * Combina múltiples PDFs en uno solo
 * @param pdfUrls URLs de los PDFs a combinar
 * @returns Promise con el Blob del PDF combinado
 */
export async function mergePDFs(pdfUrls: string[]): Promise<Blob> {
  // Implementación básica - en producción usaría una librería como pdf-lib
  console.log('Merging PDFs:', pdfUrls);
  
  // Por ahora, devolvemos el primer PDF como placeholder
  if (pdfUrls.length === 0) {
    throw new Error('No PDFs to merge');
  }
  
  const response = await fetch(pdfUrls[0]);
  return response.blob();
}

/**
 * Descarga un PDF combinado
 * @param pdfUrls URLs de los PDFs
 * @param filename Nombre del archivo a descargar
 */
export async function downloadMergedPDF(pdfUrls: string[], filename: string): Promise<void> {
  const blob = await mergePDFs(pdfUrls);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Imrime múltiples PDFs como un solo documento
 * @param pdfUrls URLs de los PDFs a imprimir
 */
export async function printMergedPDF(pdfUrls: string[]): Promise<void> {
  console.log('Printing PDFs:', pdfUrls);
  
  // Abre cada PDF en una nueva ventana para imprimir
  for (const url of pdfUrls) {
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }
}
