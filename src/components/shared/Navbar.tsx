import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronDown, LogOut } from "lucide-react"
import { UserProfile } from "./UserProfile"
import { useAuth } from "@/components/autentication/AuthProvider"
import hjatchLogo from "@/assets/hjatch-logo.jpg"

interface NavbarProps {
  title?: string
  subtitle?: string
  showBackButton?: boolean
  backUrl?: string
}

export function Navbar({ 
  title = "Sistema de Admisión Web", 
  subtitle = "HOSPITAL JOSÉ AGURTO TELLO DE CHOSICA - HJATCH", 
  showBackButton = false,
  backUrl = "/"
}: NavbarProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleLogout = () => {
    logout()
  }

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen)
  }

  return (
    <header className="bg-gradient-to-r from-[#114C5F] to-[#4A6EB0] text-white shadow-md border-b border-[#9CD2D3]/20">
      <div className="flex items-center justify-between px-8 py-3">
        <div className="flex items-center space-x-4">
          {showBackButton && (
            <button
              onClick={() => navigate(backUrl)}
              className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-[#9CD2D3] h-9 rounded-md px-3"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <path d="m12 19-7-7 7-7"></path>
                <path d="M19 12H5"></path>
              </svg>
              Volver
            </button>
          )}
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md overflow-hidden">
            <img src={hjatchLogo} alt="HJATCH Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            <p className="text-xs text-white/80 font-light">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <button 
              onClick={toggleDropdown}
              className="flex items-center space-x-2 focus:outline-none"
            >
              <UserProfile />
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                  <p className="font-medium">Mi cuenta</p>
                </div>
                {/* <Link 
                  href="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  onClick={() => setDropdownOpen(false)}
                >
                  <User className="w-4 h-4 mr-2" />
                  <span>Perfil</span>
                </Link>
                <Link 
                  href="/settings"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  onClick={() => setDropdownOpen(false)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  <span>Configuración</span>
                </Link> */}
                <button 
                  onClick={() => {
                    setDropdownOpen(false)
                    handleLogout()
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
