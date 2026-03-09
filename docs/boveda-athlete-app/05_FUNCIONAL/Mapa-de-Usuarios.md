---
title: "Mapa de Usuarios y Casos de Uso"
description: "Modelado funcional de los actores de la plataforma mediante User Stories"
tags: [actores, roles, rbac, user_stories]
---

# 🗺️ Mapa de Usuarios (Casos de Uso)

Este documento enfoca los permisos técnicos descritos en [[Roles-Permisos]] desde una óptica funcional (historias de usuario). Permite testear que la plataforma cubre las necesidades humanas por las que fue diseñada.

## Actor: Usuario No Verificado (Pendiente)
Accede a la app pero la base de datos aún no conoce sus intenciones.

- **Como** usuario no verificado, **quiero** registrar mis credenciales **para** ponerme en la cola de activación de una cuenta en el sistema.
- **Como** usuario no verificado logueado, **quiero** ver una pantalla informativa de espera (`PendingApprovalPage`) **para** entender por qué no veo gráficos ni atletas.

## Actor: Atleta / Padre / Aficionado (Rol `consulta`)
Es el consumidor final del producto de visualización de datos. Le interesa comparar tiempos y rastrear progresos, pero no alterar la fuente de la verdad.

- **Como** usuario tipo consulta, **quiero** buscar mi nombre usando un autocompletado rápido **para** ver la página de Tracking.
- **Como** usuario tipo consulta, **quiero** añadir a mi atleta a «⭐ Favoritos» (Guardado localmente) **para** cargar mis gráficas instantáneamente al abrir la App.
- **Como** usuario tipo consulta, **quiero** añadir múltiples oponentes a mi gráfico radar temporal **para** descubrir en qué disciplinas soy estructuralmente superior o inferior visualmente.
- **Como** usuario tipo consulta, **quiero** navegar por mi calendario personal privado **para** agendar competiciones venideras sin mezclarlas con la base de datos pública de atletas.

## Actor: Administrador (Rol `admin`)
El gestor del sistema. Asegura que la información sea fidedigna e incorpora los datos semanales o corrige los errores.

- **Como** Administrador, **quiero** revisar la lista de `PendingApprovalPage` **para** vetar cuentas de bots u ojos ajenos indocumentados, y aprobar a los atletas fiables.
- **Como** Administrador, **quiero** poder utilizar el `MarksManagementDialog` **para** inyectar, editar o borrar directamente un resultado concreto de una competición que la Federación olvidó publicar en su boletín PDF semanal.
- **Como** Administrador logueado, **quiero** designar a otro usuario de confianza como `admin` **para** descentralizar mi carga de mantenimiento, utilizando los triggers SQL de seguridad.

> *Nota Estratégica:* Si la aplicación agregase Roles adicionales (ej. "Técnico de Club"), deberemos inyectar una nueva capa funcional aquí (e.g. *Como Técnico quiero ver reportes de mi Club*).
