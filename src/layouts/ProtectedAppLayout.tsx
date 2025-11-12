import { Outlet } from "react-router-dom"
import { Navbar } from "@/components/shared/Navbar"
import { Sidebar } from "@/components/shared/Sidebar"

export default function ProtectedAppLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* Navbar - Full width at top */}
      <Navbar title="Módulo de Generación de Tramas" subtitle="HOSPITAL JOSÉ AGURTO TELLO DE CHOSICA - HJATCH" />
      
      {/* Content area with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
