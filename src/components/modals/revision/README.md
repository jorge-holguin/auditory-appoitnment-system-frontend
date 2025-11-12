# Sistema de Modales de Revisión de Atención

## 📋 Descripción

Este sistema implementa una arquitectura modular para la revisión de atenciones médicas, dividiendo la funcionalidad en modales separados para mejor organización y mantenibilidad.

## 🏗️ Estructura de Archivos

```
revision/
├── types.ts                      # Tipos e interfaces compartidas
├── SharedComponents.tsx          # Componentes reutilizables (EditableField, SectionObservation)
├── AtencionModal.tsx            # Modal para información de atención y diagnósticos
├── ApoyoDiagnosticoModal.tsx    # Modal para laboratorio, rayos X y ecografía
├── FarmaciaModal.tsx            # Modal para medicamentos e indicaciones
├── LiquidacionesModal.tsx       # Modal para información de facturación
└── README.md                    # Este archivo
```

## 🎯 Características Principales

### 1. **Modales Separados**
Cada sección tiene su propio modal independiente:
- **Atención**: Información clínica, diagnósticos (principal y secundario), plan terapéutico
- **Apoyo al Diagnóstico**: Laboratorio, Rayos X, Ecografía con sus respectivos listados
- **Farmacia**: Listado de fármacos con detalles completos e indicaciones generales
- **Liquidaciones**: Información de facturación con tabla de servicios

### 2. **Campos Editables con Observaciones**
- Cada campo puede tener observaciones de auditoría
- Icono de lápiz aparece al hacer hover
- Los campos con observaciones se destacan en naranja
- Observaciones de sección completa disponibles

### 3. **Interfaz Mejorada**
- **Tabs visuales**: Mejor distinción entre tabs activas e inactivas
- **Botones con iconos**: Cada sección tiene su icono distintivo y color
- **Contador de observaciones**: Badge que muestra cuántas observaciones hay por sección
- **Headers con gradiente**: Diseño moderno para los modales

### 4. **Componentes Reutilizables**

#### `EditableField`
Componente para mostrar campos con capacidad de agregar observaciones:
```tsx
<EditableField
  label="Nombre del Campo"
  value={valor}
  fieldName="nombreCampo"
  onAddObservation={handleAddObservation}
  hasObservation={hasObservation('nombreCampo')}
/>
```

#### `SectionObservation`
Componente para agregar observaciones a nivel de sección completa:
```tsx
<SectionObservation
  sectionName="OBSERVACION_seccion"
  onAddObservation={handleAddObservation}
  hasObservation={hasObservation('OBSERVACION_seccion')}
/>
```

## 📊 Tipos de Datos

### `AtencionData`
Interface principal que contiene todos los campos de:
- Información general (fecha, hora, consultorio, profesional)
- Funciones vitales (temperatura, PA, FC, peso, talla, IMC)
- Bloque de atención (motivo, antecedentes, anamnesis, examen físico, etc.)
- Diagnósticos (principal y secundario con códigos CIE)
- Plan terapéutico
- Apoyo al diagnóstico (laboratorio, rayos X, ecografía)
- Farmacia (fármacos e indicaciones)
- Liquidaciones (facturación y servicios)

### `FieldObservation`
```typescript
interface FieldObservation {
  fieldName: string        // Nombre del campo
  originalValue: string    // Valor original del campo
  observation: string      // Observación del auditor
}
```

## 🎨 Esquema de Colores

- **Atención**: Azul (`border-l-blue-500`, `bg-blue-100`)
- **Apoyo al Diagnóstico**: Verde (`border-l-green-500`, `bg-green-100`)
- **Farmacia**: Púrpura (`border-l-purple-500`, `bg-purple-100`)
- **Liquidaciones**: Ámbar (`border-l-amber-500`, `bg-amber-100`)
- **Observaciones**: Naranja (`bg-orange-50`, `text-orange-600`)

## 🔄 Flujo de Uso

1. Usuario abre el modal principal de revisión
2. Ve un resumen con 4 botones de sección (cada uno muestra contador de observaciones)
3. Al hacer clic en una sección, se abre el modal específico
4. En el modal específico:
   - Puede ver todos los campos de esa sección
   - Puede agregar observaciones a campos individuales
   - Puede agregar observaciones a nivel de sección
5. Las observaciones se guardan en el estado global
6. Al cerrar el modal específico, vuelve al modal principal
7. El contador de observaciones se actualiza automáticamente
8. Al finalizar, guarda todas las observaciones

## 🚀 Uso del Modal Principal

```tsx
import { RevisionAtencionModal } from './RevisionAtencionModal_v2'

<RevisionAtencionModal
  open={isOpen}
  onClose={handleClose}
  patient={patientData}
  atencion={atencionData}
  onSave={(observations) => {
    // Guardar observaciones
    console.log(observations)
  }}
/>
```

## 📝 Notas Importantes

1. **Archivo v2**: El archivo `RevisionAtencionModal_v2.tsx` es la nueva versión mejorada
2. **Compatibilidad**: Mantiene la misma interface que la versión anterior
3. **Extensibilidad**: Fácil agregar nuevos campos o secciones
4. **Performance**: Cada modal se carga solo cuando se necesita

## 🔧 Mantenimiento

Para agregar un nuevo campo:
1. Agregar el campo a la interface `AtencionData` en `types.ts`
2. Agregar el `EditableField` en el modal correspondiente
3. Actualizar la lista de campos en `getSectionObservationCount` si es necesario

Para agregar una nueva sección:
1. Crear un nuevo archivo modal (ej: `NuevaSeccionModal.tsx`)
2. Agregar el tipo a `ModalSection` en el modal principal
3. Agregar el botón de sección en el modal principal
4. Agregar la instancia del modal al final del componente principal
