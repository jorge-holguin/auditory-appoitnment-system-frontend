"use client";

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface ImageWithLoaderProps extends Omit<ImageProps, 'className'> {
  /**
   * Clase CSS a aplicar cuando la imagen está cargada
   */
  loadedClassName?: string;
  
  /**
   * Clase CSS a aplicar mientras la imagen está cargando
   */
  loadingClassName?: string;
  
  /**
   * Clase CSS base que se aplica siempre
   */
  className?: string;
  
  /**
   * Duración de la transición en milisegundos
   * @default 300
   */
  transitionDuration?: number;
}

/**
 * Componente que muestra una imagen con efecto de transición al cargar
 */
export default function ImageWithLoader({
  src,
  alt,
  loadedClassName,
  loadingClassName,
  className,
  transitionDuration = 300,
  ...props
}: ImageWithLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  // Manejar el evento de carga completada
  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };
  
  // Manejar errores de carga
  const handleError = () => {
    console.warn(`⚠️ Error al cargar imagen: ${alt}`);
    setHasError(true);
    setIsLoaded(false);
  };
  
  // Si hay error, mostrar placeholder
  if (hasError) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-100', className)}>
        <User className="w-16 h-16 text-gray-400" />
      </div>
    );
  }
  
  return (
    <Image
      src={src}
      alt={alt}
      className={cn(
        // Clases base que siempre se aplican
        'transition-opacity duration-300 ease-in-out',
        // Clase personalizada base
        className,
        // Clases condicionales según el estado de carga
        isLoaded 
          ? cn('opacity-100', loadedClassName) 
          : cn('opacity-0', loadingClassName)
      )}
      style={{ 
        transitionDuration: `${transitionDuration}ms` 
      }}
      onLoad={handleLoad}
      onError={handleError}
      {...props}
    />
  );
}
