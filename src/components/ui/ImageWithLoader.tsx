"use client";

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface ImageWithLoaderProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  loadedClassName?: string;
  loadingClassName?: string;
  className?: string;
  transitionDuration?: number;
}

export default function ImageWithLoader({
  src,
  alt,
  width,
  height,
  loadedClassName,
  loadingClassName,
  className,
  transitionDuration = 300,
}: ImageWithLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = () => {
    console.warn(`⚠️ Error al cargar imagen: ${alt}`);
    setHasError(true);
    setIsLoaded(false);
  };

  if (hasError) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-100', className)}>
        <User className="w-16 h-16 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn(
        'transition-opacity duration-300 ease-in-out',
        className,
        isLoaded
          ? cn('opacity-100', loadedClassName)
          : cn('opacity-0', loadingClassName)
      )}
      style={{
        transitionDuration: `${transitionDuration}ms`
      }}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}
