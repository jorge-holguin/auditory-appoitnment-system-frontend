import { createContext, useContext, useState, useEffect } from "react"
import type { ReactNode } from "react"

interface Origen {
  id: string
  nombre: string
}

interface Especialidad {
  id: string
  descripcion: string
}

interface EstadoAtencion {
  id: number
  nombre: string
  fase: number
  editar: boolean
}

interface CatalogosContextType {
  origenes: Origen[]
  especialidades: Especialidad[]
  estadosAtencion: EstadoAtencion[]
  loadingOrigenes: boolean
  loadingEspecialidades: boolean
  loadingEstados: boolean
  errorOrigenes: string | null
  errorEspecialidades: string | null
  errorEstados: string | null
  refetchOrigenes: () => void
  refetchEspecialidades: () => void
  refetchEstados: (fase?: number) => void
}

const CatalogosContext = createContext<CatalogosContextType | undefined>(undefined)

export function CatalogosProvider({ children }: { children: ReactNode }) {
  const [origenes, setOrigenes] = useState<Origen[]>([])
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([])
  const [estadosAtencion, setEstadosAtencion] = useState<EstadoAtencion[]>([])
  
  const [loadingOrigenes, setLoadingOrigenes] = useState(true)
  const [loadingEspecialidades, setLoadingEspecialidades] = useState(true)
  const [loadingEstados, setLoadingEstados] = useState(true)
  
  const [errorOrigenes, setErrorOrigenes] = useState<string | null>(null)
  const [errorEspecialidades, setErrorEspecialidades] = useState<string | null>(null)
  const [errorEstados, setErrorEstados] = useState<string | null>(null)

  const fetchOrigenes = async () => {
    try {
      setLoadingOrigenes(true)
      setErrorOrigenes(null)
      const response = await fetch("http://192.168.0.252:9004/interoperabilidadsis/api/v1/origen")
      const result = await response.json()
      
      if (result.success) {
        setOrigenes(result.data)
      } else {
        setErrorOrigenes("Error al cargar orígenes")
      }
    } catch (err) {
      setErrorOrigenes("Error de conexión")
      console.error("Error fetching origenes:", err)
    } finally {
      setLoadingOrigenes(false)
    }
  }

  const fetchEspecialidades = async () => {
    try {
      setLoadingEspecialidades(true)
      setErrorEspecialidades(null)
      const response = await fetch("http://192.168.0.252:9004/interoperabilidadsis/api/v1/especialidad")
      const result = await response.json()
      
      if (result.success) {
        setEspecialidades(result.data)
      } else {
        setErrorEspecialidades("Error al cargar especialidades")
      }
    } catch (err) {
      setErrorEspecialidades("Error de conexión")
      console.error("Error fetching especialidades:", err)
    } finally {
      setLoadingEspecialidades(false)
    }
  }

  const fetchEstados = async (fase: number = 1) => {
    try {
      setLoadingEstados(true)
      setErrorEstados(null)
      const response = await fetch(`http://192.168.0.252:9004/interoperabilidadsis/api/v1/estadoAtencion/fase?fase=${fase}`)
      const result = await response.json()
      
      if (result.success) {
        setEstadosAtencion(result.data)
      } else {
        setErrorEstados("Error al cargar estados")
      }
    } catch (err) {
      setErrorEstados("Error de conexión")
      console.error("Error fetching estados:", err)
    } finally {
      setLoadingEstados(false)
    }
  }

  useEffect(() => {
    fetchOrigenes()
    fetchEspecialidades()
    fetchEstados(1)
  }, [])

  return (
    <CatalogosContext.Provider
      value={{
        origenes,
        especialidades,
        estadosAtencion,
        loadingOrigenes,
        loadingEspecialidades,
        loadingEstados,
        errorOrigenes,
        errorEspecialidades,
        errorEstados,
        refetchOrigenes: fetchOrigenes,
        refetchEspecialidades: fetchEspecialidades,
        refetchEstados: fetchEstados,
      }}
    >
      {children}
    </CatalogosContext.Provider>
  )
}

export function useCatalogos() {
  const context = useContext(CatalogosContext)
  if (context === undefined) {
    throw new Error("useCatalogos must be used within a CatalogosProvider")
  }
  return context
}
