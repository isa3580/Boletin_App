# U.E. Colegio San Francisco — Sistema de Boletines y Evaluación Académica

Sistema web institucional integral para la gestión de calificaciones, generación de informes cualitativos con Inteligencia Artificial (n8n), supervisión curricular por Coordinación y despacho masivo con firma digital para la Dirección y Administración.

---

## 🏛️ Estructura del Proyecto

```
boletines_app/
├── database/                    # Scripts y esquemas de base de datos SQL
│   ├── esquema.sql              # Esquema PostgreSQL completo (tablas, RLS, relaciones)
│   └── seed_alumnos.js          # Script de carga inicial de estudiantes (5 por aula)
│
├── public/                      # Recursos estáticos públicos
│   └── logo.jpg                 # Logo oficial institucional del colegio
│
├── src/
│   ├── app/                     # Next.js App Router (Páginas y API Routes)
│   │   ├── api/                 # Endpoints del backend
│   │   │   ├── enviar-boletin/  # Webhook de despacho y envío de correos
│   │   │   └── generar-reporte/ # Integración n8n para informes con IA
│   │   │
│   │   ├── dashboard/           # Módulos por Rol de Usuario
│   │   │   ├── admin/           # Control operacional, año escolar, lapsos y candado
│   │   │   ├── coordinador/     # Supervisión pedagógica, revisión y aprobación
│   │   │   ├── director/        # Auditoría institucional, libro de vida y firma
│   │   │   ├── profesor/        # Carga manual (0-20 o A-E) y generación con IA
│   │   │   └── layout.tsx       # Layout común para dashboards
│   │   │
│   │   ├── login/               # Pantalla de acceso multi-rol
│   │   ├── globals.css          # Estilos globales con Tailwind CSS
│   │   ├── layout.tsx           # Layout raíz de la aplicación
│   │   └── page.tsx             # Redirección inteligente inicial
│   │
│   ├── components/              # Componentes de UI reutilizables
│   │   ├── AuthGuard.tsx        # Guardia de seguridad de sesión y roles en cliente
│   │   ├── BoletinDocumento.tsx # Documento oficial / Acta escolar para impresión PDF
│   │   └── Icons.tsx            # Biblioteca de iconos vectoriales SVG limpios
│   │
│   ├── lib/                     # Utilidades y configuración central
│   │   ├── config.ts            # Hook y estado del Año Escolar activo
│   │   ├── constants.ts         # Períodos y constantes del sistema
│   │   ├── generarPdfBoletin.ts # Generador de PDF institucional con jsPDF
│   │   ├── logoBase64.ts        # Logo en base64 para renderizado de documentos
│   │   └── supabase.ts          # Cliente de conexión oficial con Supabase
│   │
│   └── middleware.ts            # Middleware de seguridad y control de acceso Next.js
│
├── .env.local                   # Credenciales de entorno (Supabase / n8n)
├── package.json                 # Dependencias y scripts del proyecto
├── tsconfig.json                # Configuración de TypeScript
└── README.md                    # Documentación del proyecto
```

---

## 🚀 Puesta en Marcha

### 1. Instalación de dependencias
```bash
npm install
```

### 2. Variables de Entorno (`.env.local`)
Asegúrate de contar con tu archivo `.env.local` en la raíz con las credenciales correspondientes:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon
N8N_WEBHOOK_URL=https://tu-n8n.com/webhook/generar-reporte
N8N_EMAIL_WEBHOOK_URL=https://tu-n8n.com/webhook/enviar-boletin
```

### 3. Cargar Estudiantes de Prueba (Opcional)
```bash
node database/seed_alumnos.js
```

### 4. Ejecutar el Servidor de Desarrollo
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 👥 Roles del Sistema

| Rol | Acceso | Responsabilidades |
| :--- | :--- | :--- |
| **Docente** | `/dashboard/profesor` | Carga de notas (0-20 o A-E), generación de informe cualitativo y envío a Coordinación. |
| **Coordinador** | `/dashboard/coordinador` | Supervisión curricular, devolución para ajustes o aprobación pedagógica. |
| **Director** | `/dashboard/director` | Auditoría académica, firma y sello digital de actas oficiales. |
| **Administrador** | `/dashboard/admin` | Control de año escolar, apertura/cierre de lapsos, candado institucional y despacho masivo. |

---

## 🔐 Credenciales de Acceso (Cuentas de Demostración)

Para evaluar y probar cada uno de los paneles y flujos de trabajo del sistema, se encuentran disponibles las siguientes cuentas de prueba:

| Rol / Módulo | Correo Electrónico | Contraseña | Nivel / Asignación |
| :--- | :--- | :--- | :--- |
| **Administrador** | `control@colegio.com` | `123456` | Control de Estudios y Despacho Masivo |
| **Director(a)** | `director@colegio.com` | `123456` | Dirección General (Sello y Firma Digital) |
| **Coordinador(a)** | `coordinador@colegio.com` | `123456` | Coordinación Pedagógica (Revisión/Aprobación) |
| **Docente (Primaria)** | `carmen@colegio.com` | `123456` | 6to Grado "A" (Evaluación Cualitativa Literal A–E) |
| **Docente (Secundaria)** | `jose@colegio.com` | `123456` | 4to Año "B" (Evaluación Cuantitativa Numérica 0–20) |

---

## 🛠️ Tecnologías Principales
- **Framework:** Next.js 16 (App Router + Turbopack + TypeScript)
- **Estilos:** Tailwind CSS
- **Base de Datos & Autenticación:** Supabase (PostgreSQL)
- **Automatización e IA:** n8n Webhooks
- **Exportación:** jsPDF / Window Print Engine