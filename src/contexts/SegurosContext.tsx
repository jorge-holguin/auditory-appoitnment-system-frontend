"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface Seguro {
  codigo: string;
  descripcion: string;
}

interface SegurosContextType {
  seguros: Seguro[];
  loading: boolean;
  getSegurosDescripcion: (codigo: string) => string;
}

const SegurosContext = createContext<SegurosContextType | undefined>(undefined);

export function SegurosProvider({ children }: { children: ReactNode }) {
  const [seguros, setSeguros] = useState<Seguro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Datos de ejemplo - en producción vendrían de una API
    const segurosData: Seguro[] = [
      { codigo: 'S001', descripcion: 'Seguro de Salud Básico' },
      { codigo: 'S002', descripcion: 'Seguro de Salud Premium' },
      { codigo: 'S003', descripcion: 'Seguro Familiar' },
      { codigo: 'S004', descripcion: 'Seguro Dental' },
      { codigo: 'S005', descripcion: 'Seguro de Visión' },
    ];
    
    setSeguros(segurosData);
    setLoading(false);
  }, []);

  const getSegurosDescripcion = (codigo: string): string => {
    const seguro = seguros.find(s => s.codigo === codigo);
    return seguro?.descripcion || codigo;
  };

  return (
    <SegurosContext.Provider value={{ seguros, loading, getSegurosDescripcion }}>
      {children}
    </SegurosContext.Provider>
  );
}

export function useSeguros(): SegurosContextType {
  const context = useContext(SegurosContext);
  if (context === undefined) {
    throw new Error('useSeguros must be used within a SegurosProvider');
  }
  return context;
}
