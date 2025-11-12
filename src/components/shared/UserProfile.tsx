import { User } from "lucide-react"
import { useAuth } from "@/components/autentication/AuthProvider"

export function UserProfile() {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="flex items-center space-x-4">
        <div className="text-right">
          <p className="text-sm font-medium">Cargando...</p>
          <p className="text-xs opacity-90">Usuario</p>
        </div>
        <User className="w-8 h-8 bg-blue-500 text-white rounded-full p-1" />
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="text-right">
        <p className="text-sm font-medium">{user.nombreCompleto}</p>
        <p className="text-xs opacity-90">{user.puesto}</p>
      </div>
      <User className="w-8 h-8 bg-blue-500 text-white rounded-full p-1" />
    </div>
  )
}