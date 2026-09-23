# 🏦 Simulador Financiero Institucional & Onboarding Biométrico

Sistema web completo para instituciones financieras (Bancos y Cooperativas de Ahorro y Crédito) que permite la simulación de créditos (Sistemas Francés y Alemán), simulación de inversiones a plazo fijo (DPF), proceso de solicitud en línea con verificación biométrica facial por cámara en vivo, portal del cliente y panel administrativo multi-marca.

---

## 🔑 Credenciales de Acceso (Administrador)

Para ingresar al panel de administración e inspeccionar/aprobar solicitudes o configurar la institución:

* **URL de Login**: [http://localhost:3000/login](http://localhost:3000/login) o [http://localhost:3000/admin](http://localhost:3000/admin)
* **Correo Electrónico**: `admin@admin.com`
* **Contraseña**: `admin`

---

## 🛠️ Requisitos Previos

Asegúrate de tener instalado en tu equipo:
* **Node.js**: v18.0.0 o superior (recomendado v20.x)
* **npm**: v9.0.0 o superior

---

## 🚀 Guía de Instalación y Ejecución

Sigue estos sencillos pasos para levantar el proyecto en tu entorno local:

### 1️⃣ Levantar el Backend (NestJS + Prisma + PostgreSQL)

Abre una terminal en la carpeta raíz del proyecto y ejecuta:

```bash
# 1. Navegar a la carpeta del backend
cd backend

# 2. Instalar dependencias
npm install

# 3. Generar el cliente de Prisma
npx prisma generate

# 4. Sincronizar la base de datos (PostgreSQL Neon)
npx prisma db push

# 5. Iniciar el servidor backend en modo desarrollo
npm run start:dev
```

> 🌐 **Backend corriendo en**: `http://localhost:3001`  
> 📑 **Documentación Swagger / OpenAPI**: `http://localhost:3001/api/docs`

---

### 2️⃣ Levantar el Frontend (Next.js 15 + TailwindCSS)

Abre **otra terminal diferente** en la carpeta raíz del proyecto y ejecuta:

```bash
# 1. Navegar a la carpeta del frontend
cd frontend

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo frontend
npm run dev
```

> 🌐 **Frontend corriendo en**: `http://localhost:3000`

---

## 📌 Rutas Principales del Sistema

| Ruta | Descripción | Acceso |
| :--- | :--- | :--- |
| `http://localhost:3000/` | Página de Inicio Institucional | Público |
| `http://localhost:3000/simulator` | Simulador de Créditos (Francés/Alemán) + Descarga en PDF | Público (Sin Login) |
| `http://localhost:3000/investments` | Simulador de Inversiones a Plazo Fijo (DPF) | Público (Sin Login) |
| `http://localhost:3000/investments/request` | Wizard de Solicitud de Inversión + Biometría Facial | Cliente Autenticado |
| `http://localhost:3000/my-applications` | Portal del Cliente: Seguimiento de Solicitudes en Vivo | Cliente (`CUSTOMER`) |
| `http://localhost:3000/forgot-password` | Recuperación Biométrica de Contraseña con Cámara | Público |
| `http://localhost:3000/login` | Inicio de Sesión y Registro de Clientes | Público |
| `http://localhost:3000/admin` | Panel de Administración Institucional | Administrador (`ADMIN`) |

---

## 🌟 Características Destacadas

1. **Simulación de Créditos (Sistemas Francés y Alemán)**:
   - Cálculo de cuotas fijas o decrecientes, desglose de interés, amortización y cobros indirectos obligatorios (Seguro de desgravamen, SOLCA) u opcionales (Fundaciones).
   - Generación y **descarga de reporte en formato PDF** con la marca institucional.

2. **Personalización Multi-Marca (Branding Dinámico)**:
   - El administrador puede cambiar en tiempo real desde `/admin/institution` el Nombre de la Institución, Logo, RUC, Representante Legal y la **Paleta de Colores (Primario, Secundario, Navbar, Tarjetas)**.

3. **Verificación Biométrica Facial**:
   - Integración de cámara web en vivo para captura de rostro, análisis de vivacidad y comprobación de coincidencia facial contra la cédula del cliente mediante IA (`face-api.js`).

4. **Recuperación Biométrica de Clave**:
   - Permite a los clientes cambiar su contraseña si olvidan la clave mediante la verificación facial por webcam.

---

## 📄 Licencia

Desarrollado para la materia de Evaluación Financiera y Sistemas Institucionales. Todos los derechos reservados.
