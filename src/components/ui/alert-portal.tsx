"use client"

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface AlertPortalProps {
  children: React.ReactNode
  containerId: string
}

export function AlertPortal({ children, containerId }: AlertPortalProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    // Buscar el contenedor en el DOM
    const targetContainer = document.getElementById(containerId)
    if (targetContainer) {
      setContainer(targetContainer)
    }
  }, [containerId])

  // Si no se encuentra el contenedor, no renderizar nada
  if (!container) return null

  // Usar createPortal para renderizar el contenido en el contenedor especificado
  return createPortal(children, container)
}

export default AlertPortal
