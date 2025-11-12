import React from 'react';
import { useSeguros } from '@/contexts/SegurosContext';
import { Skeleton } from '@/components/ui/skeleton';

interface SeguroDisplayProps {
  seguroId: string | null;
  showCode?: boolean;
}

/**
 * Componente para mostrar la descripción de un seguro a partir de su código
 */
const SeguroDisplay: React.FC<SeguroDisplayProps> = ({ 
  seguroId, 
  showCode = true 
}) => {
  const { loading, getSegurosDescripcion } = useSeguros();

  if (!seguroId) {
    return <span className="text-gray-400">Sin seguro</span>;
  }

  if (loading) {
    return <Skeleton className="h-4 w-24" />;
  }

  // Limpiar el código de seguro (eliminar espacios en blanco)
  const codigoLimpio = seguroId.trim();
  const descripcion = getSegurosDescripcion(codigoLimpio);

  return (
    <span>
      {showCode ? `(${codigoLimpio}) - ` : ''}
      {descripcion}
    </span>
  );
};

export default SeguroDisplay;
