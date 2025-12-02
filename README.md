# Sistema de Auditoría de FUAs - HJATCH

Sistema frontend para la gestión y auditoría de Formularios Únicos de Atención (FUA) del Hospital José Agurto Tello de Chosica.

## Tecnologías Principales

| Tecnología | Versión | Descripción |
|------------|---------|-------------|
| React | 18.3.1 | Biblioteca principal de UI |
| TypeScript | 5.9.3 | Tipado estático |
| Vite | 7.1.14 | Bundler y servidor de desarrollo |
| TailwindCSS | 3.4.18 | Framework de estilos |
| React Router DOM | 7.9.5 | Enrutamiento SPA |
| Radix UI | Latest | Componentes accesibles (Dialog, Select, etc.) |
| Lucide React | 0.552.0 | Iconografía |
| date-fns | 4.1.0 | Manipulación de fechas |

---

## Estructura del Proyecto

```
src/
├── App.tsx                    # Configuración de rutas y providers
├── main.tsx                   # Punto de entrada
├── index.css                  # Estilos globales
│
├── components/
│   ├── autentication/         # Componentes de autenticación
│   │   ├── AuthProvider.tsx   # Context de autenticación
│   │   └── ProtectedRoute.tsx # HOC para rutas protegidas
│   │
│   ├── modals/                # Modales principales
│   │   ├── PdfReviewModal.tsx # Modal de revisión de FUA (PDF)
│   │   ├── RevisionAtencionModal.tsx # Modal de revisión detallada
│   │   └── revision/          # Subcomponentes del modal de revisión
│   │       ├── tabs/          # Pestañas del modal
│   │       │   ├── AtencionTab.tsx
│   │       │   ├── DiagnosticosTab.tsx
│   │       │   ├── ApoyoDiagnosticoTab.tsx
│   │       │   └── FarmaciaTab.tsx
│   │       ├── PatientSidebar.tsx
│   │       ├── LiquidacionesModal.tsx
│   │       ├── SharedComponents.tsx
│   │       └── types.ts
│   │
│   ├── selectors/             # Componentes selectores reutilizables
│   │   ├── OrigenSelector.tsx
│   │   ├── EspecialidadSimpleSelector.tsx
│   │   ├── EstadoSelector.tsx
│   │   ├── EstadoFuaSelector.tsx
│   │   ├── EstadoPaqueteSelector.tsx
│   │   └── MedicoSelector.tsx
│   │
│   ├── shared/                # Componentes compartidos
│   │   ├── Navbar.tsx
│   │   └── Sidebar.tsx
│   │
│   └── ui/                    # Componentes UI base (shadcn/ui)
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── ComboboxSelect.tsx
│       ├── table.tsx
│       └── ...
│
├── contexts/
│   └── CatalogosContext.tsx   # Context para catálogos (orígenes, especialidades, estados)
│
├── layouts/
│   └── ProtectedAppLayout.tsx # Layout principal con Navbar y Sidebar
│
├── pages/
│   ├── login/page.tsx         # Página de inicio de sesión
│   ├── audit/page.tsx         # Página de auditoría de citas
│   ├── plot/page.tsx          # Página de generación de tramas
│   └── packages/page.tsx      # Página de gestión de paquetes
│
├── services/
│   ├── citaService.ts         # Servicios de citas y auditoría
│   ├── tramaService.ts        # Servicios de tramas y paquetes SIS
│   └── observacionService.ts  # Servicios de observaciones
│
├── lib/
│   ├── auth.ts                # Utilidades de autenticación
│   └── utils.ts               # Utilidades generales (cn, etc.)
│
├── utils/
│   └── jwtUtils.ts            # Utilidades para JWT
│
└── styles/
    └── datepicker-custom.css  # Estilos personalizados del DatePicker
```

---

## Páginas Principales

### 1. Login (`/login`)
Página de autenticación con JWT. Redirige a `/audit` tras login exitoso.

### 2. Auditoría (`/audit`)
Página principal para auditar citas médicas.

**Funcionalidades:**
- Filtrar citas por fecha, especialidad, médico, estado y turno
- Buscar cita por ID específico
- Ver FUA en PDF
- Aprobar o agregar observaciones a citas
- Revertir estado de citas
- Estados de auditoría: `PENDIENTE`, `EN_REVISION`, `APROBADO`, `OBSERVADO`, `SUBSANADO`

### 3. Generación de Tramas (`/plot`)
Página para generar y enviar paquetes de FUAs al SIS.

**Funcionalidades:**
- Filtrar FUAs por origen, especialidad, estado y rango de fechas
- Generar paquetes ZIP con tramas
- Descargar paquetes generados
- Enviar paquetes al SIS (ConectaSIS)
- Valores por defecto: Origen=CE, Estado=PENDIENTE (id=2)

### 4. Paquetes (`/packages`)
Gestión de paquetes SIS generados.

---

## Componentes Selectores

Todos los selectores utilizan el componente base `ComboboxSelect` que proporciona búsqueda y filtrado.

### `OrigenSelector`
Selector de origen de atención (CE=Consulta Externa, EM=Emergencia, etc.).
```tsx
<OrigenSelector
  value={origen}
  onChange={setOrigen}
  label="Origen"
/>
```

### `EspecialidadSimpleSelector`
Selector de especialidades médicas. Carga datos desde `CatalogosContext`.
```tsx
<EspecialidadSimpleSelector
  value={especialidad}
  onChange={setEspecialidad}
  label="Especialidad"
  defaultOpen={true}  // Abre automáticamente al cargar
/>
```

### `EstadoSelector`
Selector de estados de auditoría (para página de Auditoría).
```tsx
// Opciones: PENDIENTE, EN_REVISION, APROBADO, OBSERVADO, SUBSANADO
<EstadoSelector
  value={estado}
  onChange={setEstado}
  label="Estado"
/>
```

### `EstadoFuaSelector`
Selector de estados de FUA (para página de Tramas). Usa IDs numéricos.
```tsx
// Opciones: 2=PENDIENTE, 3=EN PROCESO, etc.
<EstadoFuaSelector
  value={estado}
  onChange={setEstado}
  label="Estado"
/>
```

### `MedicoSelector`
Selector dinámico de médicos. Carga médicos según fecha y especialidad.
```tsx
<MedicoSelector
  value={medico}
  onChange={setMedico}
  fechaInicio={fechaInicio}
  fechaFin={fechaFin}
  idEspecialidad={especialidad}
/>
```

---

## Modales

### `PdfReviewModal`
Modal para visualizar el FUA en formato PDF.

**Props:**
| Prop | Tipo | Descripción |
|------|------|-------------|
| `open` | boolean | Estado de apertura |
| `onClose` | () => void | Callback al cerrar |
| `citaId` | string | ID de la cita |
| `citaContext` | CitaContext | Contexto de la cita |
| `estadoAuditoria` | string | Estado actual de auditoría |
| `onAprobar` | () => void | Callback al aprobar |
| `onRefresh` | () => void | Callback para refrescar lista |

**Funcionalidades:**
- Visualización de PDF embebido
- Botón "Ver completo" para abrir en nueva pestaña
- Botón "Aprobar" (deshabilitado si ya está APROBADO u OBSERVADO)
- Botón "Observar" (abre modal de revisión detallada)

### `RevisionAtencionModal`
Modal completo para revisar una atención con múltiples pestañas.

**Pestañas:**
1. **Atención**: Funciones vitales, motivo de consulta, antecedentes
2. **Diagnósticos**: Diagnósticos CIE-10 y procedimientos
3. **Apoyo Diagnóstico**: Laboratorio, Rayos X, Ecografía
4. **Farmacia**: Medicamentos prescritos

**Funcionalidades:**
- Sidebar con información del paciente y foto
- Agregar observaciones por sección
- Guardar y marcar como "Observado"
- Ver liquidaciones asociadas

---

## Servicios

### `citaService.ts`
Servicios para gestión de citas y auditoría.

```typescript
// Funciones principales
buscarCitas(params)           // Buscar citas con filtros
buscarCitaPorId(citaId)       // Buscar cita específica
obtenerAtencionCompleta(id)   // Obtener datos completos de atención
obtenerPacienteConFoto(codigo)// Obtener paciente con foto base64
marcarEnRevision(citaId)      // Cambiar estado a EN_REVISION
aprobarCita(citaId)           // Cambiar estado a APROBADO
observarCita(citaId)          // Cambiar estado a OBSERVADO
revertirCita(citaId)          // Revertir a PENDIENTE

// Utilidades
getEstadoString(numero)       // Convertir ID a nombre de estado
getEstadoNumero(string)       // Convertir nombre a ID de estado
```

### `tramaService.ts`
Servicios para generación de tramas y paquetes SIS.

```typescript
// Funciones principales
listarFuas(params)            // Listar FUAs con filtros
descargarZip(request)         // Generar y descargar ZIP de tramas
descargarBlob(blob, nombre)   // Descargar blob como archivo
enviarPaqueteAlSis(blob, nombre) // Enviar paquete a ConectaSIS
actualizarEstadoPaqueteSis(id, estado) // Actualizar estado del paquete
```

### `observacionService.ts`
Servicios para gestión de observaciones.

```typescript
// Funciones principales
obtenerObservacionesPorCita(idCita)  // Obtener observaciones de una cita
crearObservacion(request)            // Crear nueva observación
editarObservacion(id, request)       // Editar observación existente

// Mapeo de secciones
SECCION_IDS = {
  OBSERVACION_funciones_vitales: 1,
  OBSERVACION_Atención_Principal_Motivo_Antecedentes: 2,
  OBSERVACION_diagnosticos: 3,
  OBSERVACION_destino: 4,
  OBSERVACION_farmacia: 5,
  OBSERVACION_laboratorio: 6,
  OBSERVACION_rayosx: 7,
  OBSERVACION_ecografia: 8,
  OBSERVACION_procedimientos: 9
}
```

---

## Contextos

### `CatalogosContext`
Provee catálogos globales cargados al iniciar la aplicación.

```typescript
const { 
  origenes,           // Lista de orígenes
  especialidades,     // Lista de especialidades
  estadosAtencion,    // Lista de estados de atención
  loadingOrigenes,    // Estado de carga
  loadingEspecialidades,
  loadingEstados,
  refetchOrigenes,    // Función para recargar
  refetchEspecialidades,
  refetchEstados
} = useCatalogos()
```

### `AuthContext`
Provee estado de autenticación y funciones de login/logout.

```typescript
const {
  isAuthenticated,    // Estado de autenticación
  user,               // Información del usuario
  login,              // Función de login
  logout,             // Función de logout
  refreshUserToken,   // Refrescar token
  loading             // Estado de carga inicial
} = useAuth()
```

---

## Configuración

### Variables de Entorno

Crear archivo `.env` basado en `env.template`:

```env
# APIs del sistema
VITE_AUTH_API_URL=<URL>    # API de autenticación
VITE_API_CITAS_URL=<URL>   # API de citas
VITE_API_INTEROP_URL=<URL> # API de interoperabilidad
```

### Scripts Disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Preview del build
npm run lint     # Ejecutar ESLint
```

---

## Estados de Auditoría

| ID | Estado | Descripción |
|----|--------|-------------|
| 1 | PENDIENTE | Cita pendiente de revisión |
| 2 | EN_REVISION | Cita siendo revisada |
| 3 | APROBADO | Cita aprobada por auditor |
| 4 | OBSERVADO | Cita con observaciones |
| 5 | SUBSANADO | Observaciones subsanadas |

### Flujo de Estados

```
PENDIENTE → EN_REVISION → APROBADO
                       ↘ OBSERVADO → SUBSANADO
```

**Reglas de negocio:**
- Si está OBSERVADO o APROBADO: No cambia a EN_REVISION al dar click en "Revisar"
- Si está SUBSANADO: Botón "Revertir" deshabilitado
- Si está OBSERVADO: Puede agregar más observaciones
- Si está APROBADO: No puede observar ni aprobar

---

## Componentes UI Base

El proyecto utiliza componentes de **shadcn/ui** personalizados:

- `Button` - Botones con variantes
- `Dialog` - Modales accesibles
- `AlertDialog` - Diálogos de confirmación
- `Table` - Tablas con estilos
- `Tabs` - Pestañas navegables
- `ComboboxSelect` - Select con búsqueda
- `Card` - Contenedores con estilos
- `Badge` - Etiquetas/badges
- `Checkbox` - Checkboxes accesibles

---

## Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd fuas-audit

# Instalar dependencias
npm install

# Configurar variables de entorno
cp env.template .env
# Editar .env con las URLs correctas

# Iniciar desarrollo
npm run dev
```

---

## Autores

**Hospital José Agurto Tello de Chosica - HJATCH**

Equipo de Desarrollo de Sistemas - Jorge Holguin
