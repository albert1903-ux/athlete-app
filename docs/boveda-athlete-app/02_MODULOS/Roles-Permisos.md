---
title: "Roles y Permisos (RBAC)"
description: "Matriz de roles y control de acceso basado en roles."
tags: [roles, permisos, rbac, seguridad]
---

# Matriz de Roles y Permisos (RBAC)

Este documento detalla las acciones permitidas y denegadas dentro de la plataforma para los 5 roles disponibles.

---

## Roles del sistema

| Rol | Valor en `app_metadata` | Descripción |
|:----|:------------------------|:------------|
| **Superadmin** | `superadmin` | Acceso total al sistema. Gestiona organizaciones, usuarios, roles |
| **Club** | `club` | Administrador de un club. Gestiona entrenadores, grupos y atletas de su club |
| **Entrenador** | `trainer` | Gestiona marcas y mediciones de los atletas de sus grupos asignados |
| **Atleta** | `athlete` | Ve sus propias marcas (lectura). Puede añadir sus propias mediciones corporales |
| **Consulta** | `consulta` | Solo lectura. Sin acceso a Análisis ni gestión de marcas |

---

## Matriz de permisos por módulo

| Módulo / Acción | Superadmin | Club | Entrenador | Atleta | Consulta |
|:---|:---:|:---:|:---:|:---:|:---:|
| **GLOBAL** | | | | | |
| Iniciar sesión | ✅ | ✅ | ✅ | ✅ | ✅ |
| Bottom Nav completo (incl. Análisis) | ✅ | ✅ | ✅ | ✅ | ❌ sin Análisis |
| **SEGUIMIENTO** | | | | | |
| Ver gráficas / comparar | ✅ todos | ✅ todos | ✅ todos | ✅ todos | ✅ todos |
| Seleccionar atleta principal | ✅ todos | ✅ todos | ✅ todos | ✅ solo él | ✅ todos |
| Añadir/quitar comparadores | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Añadir marcas** | ✅ cualquiera | ✅ su club | ✅ su grupo | ❌ | ❌ |
| **Gestionar marcas** (editar/borrar) | ✅ cualquiera | ✅ su club | ✅ su grupo | ❌ | ❌ |
| Próxima Competición | ✅ | ✅ | ✅ | ✅ | ✅ |
| **ANÁLISIS** | | | | | |
| Acceso a `/analisis` | ✅ | ✅ | ✅ | ✅ solo él | ❌ |
| Añadir mediciones corporales | ✅ cualquiera | ✅ su club | ✅ su grupo | ✅ solo él | ❌ |
| Ver historial/estadísticas | ✅ cualquiera | ✅ su club | ✅ su grupo | ✅ solo él | ❌ |
| **CALENDARIO** | | | | | |
| Gestionar eventos propios | ✅ | ✅ | ✅ | ✅ | ✅ |
| Compartir/recibir calendario | ✅ | ✅ su club | ✅ su club | ❌ | ❌ |
| **MÁS** | | | | | |
| Atletas Favoritos / Perfil / Config | ✅ | ✅ | ✅ | ✅ | ✅ |
| Solicitudes de Acceso | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gestión de Roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| Organizaciones (crear/listar) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Mi Organización (panel club) | ❌ | ✅ | ❌ | ❌ | ❌ |
| Invitar entrenadores + asignar grupo | ❌ | ✅ | ❌ | ❌ | ❌ |
| Gestionar atletas del grupo | ❌ | ✅ todos del club | ❌ | ❌ | ❌ |

---

## Modelo de datos para acceso basado en grupo

```
organizations ──(club_id)──▶ clubes
     │
     │ organization_id
     ▼
trainer_groups ──(trainer_user_id)──▶ auth.users
     │
     │ group_id
     ▼
group_athletes ──(atleta_id)──▶ atletas
```

- **`organizations.club_id`**: vincula la organización SaaS con el club deportivo
- **`trainer_groups`**: grupos dentro de un club (SUB10, SUB12 Fem, etc.), cada uno asignado a un entrenador
- **`group_athletes`**: atletas asignados a cada grupo

---

## Estado de implementación

| Fase | Descripción | Estado |
|:-----|:------------|:------:|
| Fase 1 | Renombrar roles + nuevas tablas (trainer_groups, group_athletes) | ✅ Completada |
| Fase 2 | RLS scoped por club/grupo en resultados y medidas_corporales | ✅ Completada |
| Fase 3 | Frontend: crear organización vinculada a club existente | ✅ Completada |
| Fase 4 | Frontend: panel Club ampliado (grupos, asignar entrenadores/atletas) | ✅ Completada |
| Fase 5 | Frontend: vista scoped para Entrenador | ✅ Completada |
| Fase 6 | Frontend: vista scoped para Atleta | ✅ Completada |
| Fase 7 | Migración a producción: aplicar SQL, verificar RLS, smoke test end-to-end | Pendiente |

---

> **Nota sobre seguridad (`app_metadata` vs `user_metadata`):**
> Los roles determinantes (`superadmin`, `club`, `trainer`, `athlete`, `consulta` y el `status` de aprobación) **nunca** deben vivir en `user_metadata`. Supabase permite a un usuario cliente actualizar libremente cualquier valor de su `user_metadata`, por lo que anclar políticas RLS a este campo provoca una vulnerabilidad de *Escalada de Privilegios*. Por ello, los roles en Athlete App se gestionan exclusivamente mutando e interrogando el `app_metadata` desde funciones RPC (`SECURITY DEFINER`) protegidas.
