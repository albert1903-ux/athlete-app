---
title: "Autenticación"
description: "Manejo de acceso al sistema con aprobación manual basada en Supabase Auth y triggers SQL."
tags: [auth, login, seguridad, rls]
---

# 🛡️ Módulo: Autenticación y Perfiles

Ante la necesidad de proteger la propiedad de los datos y restringir la visibilidad competitiva a los usuarios no deseados, la **Athlete App** implementa un flujo estricto de **Autenticación en Diferido**.

## Lógica del Flujo de Registro
El proceso de Onboarding consta de múltiples bloques:

1. **Signup (Client):** El usuario introduce sus credenciales desde el frontend (React/Vite) vía `supabase.auth.signUp()`.
2. **Registro Parcial:** Las credenciales entran en `auth.users`, pero el acceso al dashboard no está garantizado.
3. **Estado "En Espera":** El RLS impide que este usuario extraiga datos maestros (`atletas`, `resultados`), y la interfaz lo confina a la vista `Waitlist`.
4. **Trigger de Perfil Público:** Un trigger (`user_profiles`) inscribe al usuario en la tabla local `profiles` marcando una flag por defecto a falso.
5. **Panel del Administrador:** Un usuario con rol de *Admin* puede visualizar los perfiles registrados y hacer trigger manual de la aprobación ejecutando un procedimiento almacenado RLS-bypassado (`admin_approve_user.sql`).
6. **Aprobación Final:** La flag interna cambia. Las políticas RLS de lectura en Supabase se relajan para el UID del consultante y el Next App router/Vite redirige automáticamente al Dashboard Core (`/seguimiento`).
