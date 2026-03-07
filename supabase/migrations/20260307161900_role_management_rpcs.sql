-- Función para obtener todos los usuarios (solo admin)
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  raw_user_meta_data jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo el admin puede invocarla
  IF (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email, u.raw_user_meta_data, u.created_at
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

-- Función para actualizar el rol de un usuario (solo admin)
CREATE OR REPLACE FUNCTION update_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo el admin puede invocarla
  IF (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  -- Validar valores aceptados
  IF new_role NOT IN ('admin', 'consulta') THEN
    RAISE EXCEPTION 'Rol no válido: %', new_role;
  END IF;

  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('role', new_role)
  WHERE id = target_user_id;
END;
$$;
