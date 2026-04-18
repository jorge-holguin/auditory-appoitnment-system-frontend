import { NavLink } from "react-router-dom"
import { ShieldCheck, Layers, Package, FileBarChart } from "lucide-react"
import { cn } from "@/lib/utils"

export function Sidebar() {
  const menuItems = [
    {
      title: "Auditoría",
      url: "/audit",
      icon: ShieldCheck,
    },
    {
      title: "Tramas",
      url: "/plot",
      icon: Layers,
    },
    {
      title: "Paquetes",
      url: "/packages",
      icon: Package,
    },
    {
      title: "Reportes",
      url: "/report",
      icon: FileBarChart,
    },
  ]

  return (
    <aside className="w-64 bg-white border-r border-[#9CD2D3]/30 shadow-sm flex flex-col">
      <div className="p-4 border-b border-[#9CD2D3]/20">
        <p className="text-xs font-semibold text-[#114C5F]/60 uppercase tracking-wider">Interoperabilidad</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-[#4F9BB6] to-[#4A6EB0] text-white shadow-md"
                  : "text-[#114C5F] hover:bg-[#9CD2D3]/20 hover:text-[#4F9BB6]"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
