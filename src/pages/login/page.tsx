import type React from "react"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Lock } from "lucide-react"
import { useAuth } from "@/components/autentication/AuthProvider"
import loginBgImage from "@/assets/login-bg.png"


// API base URL
const API_AUTH = import.meta.env.VITE_AUTH_API_URL;

export default function LoginPage() {
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch(`${API_AUTH}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error en la autenticación');
      }
      
      if (data.success && data.data) {
        // Use the login function from AuthProvider
        login(data.data.jwt, data.data.primerInicio);
      } else {
        setError(data.message || 'Error en la autenticación');
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex">
      {/* Left side - Hospital Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <div className="absolute inset-0 bg-blue-800/50 z-10"></div>
        <img 
          src={loginBgImage} 
          alt="Hospital Building" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="text-white text-center p-8 bg-blue-900/40 backdrop-blur-sm rounded-lg shadow-lg">
            <h1 className="text-4xl font-bold mb-4 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">HOSPITAL</h1>
            <h2 className="text-2xl font-semibold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">JOSÉ AGURTO TELLO DE CHOSICA</h2>
            <p className="text-lg mt-2 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">ATENCIÓN EMERGENCIAS 24 HORAS</p>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-blue-900 mb-2">SISTEMA DE REVISION DE ATENCIONES</h1>
              <p className="text-blue-700">Hospital José Agurto Tello de Chosica</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6" autoComplete="off">
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold text-gray-700">Ingreso al sistema</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                    Documento de Identidad
                  </Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-5 h-5" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="Documento de Identidad"
                      value={credentials.username}
                      onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                      className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      autoComplete="off"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Contraseña
                  </Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-5 h-5" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Contraseña"
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>
              </div>

              {error && <div className="text-red-600 text-sm text-center">{error}</div>}

              <Button
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                disabled={isLoading}
              >
                {isLoading ? "PROCESANDO..." : "INGRESAR AL SISTEMA"}
              </Button>
            </form>

            <div className="mt-8 text-center text-xs text-gray-500">© Derechos Reservados HJATCH - UEI - 2025</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
