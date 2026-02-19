# Idea: Módulo de Gestión de Usuarios (CRM)

## Objetivo
Implementar un sistema integral para administrar los usuarios registrados en la plataforma, permitiendo monitoreo, edición y análisis de su actividad.

## 1. Arquitectura Backend (API)

### User Controller (`controllers/userController.js`)
Endpoints necesarios:
- **GET** `/api/admin/users`: Listado paginado con filtros.
  - Query Params: `page`, `limit`, `search` (nombre/email), `role`.
- **GET** `/api/admin/users/:id`: Detalle completo del usuario.
  - Incluir `virtuals` o `lookup` de sus últimas órdenes.
- **PUT** `/api/admin/users/:id`: Modificar datos.
  - Cambiar Rol (User <-> Admin).
  - Bloquear/Desbloquear (`isActive`).
- **DELETE** `/api/admin/users/:id`: Eliminación lógica (Soft Delete).

### Métricas Clave (Aggregations)
- **LTV (Lifetime Value):** Calcular cuánto gastó cada usuario en total.
- **Frecuencia de Compra:** Promedio de días entre órdenes.

## 2. Frontend (Dashboard)

### Página Principal (`/admin/users`)
- **Tabla Interactiva (Data Table):**
  - Columnas: Avatar, Nombre, Email, Rol (Badge Color), Estado, Fecha Registro, Total Gastado.
  - Ordenamiento por columnas.
- **Buscador Real-time:** Búsqueda por nombre o email con debounce.
- **Acciones por Fila:**
  - Menú desplegable: "Ver Detalle", "Editar", "Eliminar".

### Detalle de Usuario (`/admin/users/[id]`)
- **Perfil:** Datos básicos editables.
- **Historial de Órdenes:** Lista de compras pasadas con estado y montos.
- **Log de Actividad:** (Opcional) Cuándo se logueó por última vez.

## 3. Funcionalidades Avanzadas ("Nice to have")
- **Impersonation:** Botón "Loguearse como este usuario" para soporte técnico.
- **Exportación:** Botón "Exportar CSV" para Email Marketing.
- **Ban System:** Bloqueo preventivo de usuarios sospechosos.
