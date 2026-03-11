---
title: "Roles y Permisos (RBAC)"
description: "Matriz de roles y control de acceso basado en roles."
tags: [roles, permisos, rbac, seguridad]
---

# 🛂 Matriz de Roles y Permisos (RBAC)

Este documento detalla las acciones permitidas y denegadas dentro de la plataforma para los roles disponibles. En caso de expandir el sistema a futuros roles (e.g. `editor`, `supervisor`), este listado servirá como base escalable.

---

## 🔑 Rol: Administrador (`admin`)

El rol de mayor jerarquía. Otorga privilegios plenos y sin restricciones en toda la aplicación. Este es el comportamiento por defecto de la app inicial.

| Página / Módulo | Acciones Permitidas |
| :--- | :--- |
| **Global** | - Iniciar sesión.<br>- Navegar por el *Bottom Navigation Bar* completo. |
| **Seguimiento** | - Ver gráficas de progreso y comparar.<br>- Seleccionar atleta principal.<br>- Añadir y eliminar atletas comparadores.<br>- **Añadir nuevas marcas (resultados).**<br>- **Gestionar marcas (editar / borrar).**<br>- Visualizar "Próxima Competición". |
| **Análisis** | - **Acceso completo a la página.**<br>- Añadir mediciones corporales.<br>- Ver historial y estadísticas físicas. |
| **Calendario** | - Acceso completo.<br>- Crear nuevos eventos y recordatorios.<br>- Editar y eliminar eventos propios. |
| **Más (Config.)**| - Gestión completa: Ver Atletas Favoritos, Editar Perfil, Configuración de la App, Ayuda, Acerca de.<br>- **Solicitudes de Acceso:** Aprobar o rechazar nuevos registros.<br>- **Gestión de Roles:** Ver todos los usuarios registrados y cambiar su rol (`admin` ↔ `consulta`).<br>- Cerrar Sesión. |

---

## 👁️ Rol: Consulta (`consulta`)

Un rol orientado a la visualización y personalización de la experiencia local para un observador, sin privilegios para alterar las estadísticas o resultados compartidos (BBDD global).

| Página / Módulo | Estado | Acciones Permitidas / Restringidas |
| :--- | :---: | :--- |
| **Global** | 🔵 | - Iniciar sesión.<br> - Navegar por Seguimiento, Calendario y Más. (Botón de "Análisis" **oculto**). |
| **Seguimiento** | 🟡 | ✅ Seleccionar atleta principal.<br>✅ Ver gráficas de progreso de lectura.<br>✅ Añadir/Quitar atletas a la compartiva local.<br>❌ **Restringido:** No aparece la opción de "Añadir marca".<br>❌ **Restringido:** No aparece la opción de "Gestionar marcas". |
| **Análisis** | 🔴 | ❌ **Restringido:** Acceso denegado a la ruta `/analisis`. Redirige a Seguimiento si se fuerza la URL. |
| **Calendario** | 🟢 | ✅ Acceso completo para gestionar el calendario personal vinculado a su usuario (crear, editar, eliminar eventos). Esto no altera datos de terceros. |
| **Más (Config.)**| 🟢 | ✅ Gestión completa operativa de opciones locales (Atletas Favoritos manejados local o vinculados a su user id en BBDD, Perfil, Contraseñas, Cerrar Sesión).<br>❌ **Restringido:** Las opciones "Solicitudes de Acceso" y "Gestión de Roles" **no son visibles**. |

---

### Cómo expandir el tablero (Notas de futuro)
Si en el futuro se requiriese un rol `entrenador_equipo` (que solo pueda "Gestionar marcas" de ciertos clubes), este modelo permite inyectar fácilmente una nueva columna. Las comprobaciones en React evaluarían algo como `if (userRoles.includes('entrenador_equipo') && checkClubPermission())`.

> **Nota sobre Gestión de Roles y Seguridad (`app_metadata` vs `user_metadata`):** 
> Los roles determinantes (`admin`, `consulta`, y el `status` de aprobación) **nunca** deben vivir en `user_metadata`. Supabase permite a un usuario cliente actualizar libremente cualquier valor de su `user_metadata`, por lo que anclar políticas RLS a este campo provoca una vulnerabilidad de *Escalada de Privilegios*. Por ello, los roles en Atleta App se gestionan exclusivamente mutando e interrogando el `app_metadata` desde funciones RPC (`SECURITY DEFINER`) protegidas, garantizando que un usuario no pueda concederse a sí mismo privilegios arbitrariamente.
