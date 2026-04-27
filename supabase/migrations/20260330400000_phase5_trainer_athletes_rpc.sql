-- Phase 5: RPC for fetching athletes scoped to the trainer's groups

CREATE OR REPLACE FUNCTION get_trainer_athletes()
RETURNS TABLE (atleta_id INTEGER, nombre TEXT, fecha_nac DATE)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (auth.jwt() -> 'app_metadata' ->> 'role') NOT IN ('superadmin', 'trainer') THEN
        RAISE EXCEPTION 'Access denied. Must be superadmin or trainer.';
    END IF;

    RETURN QUERY
    SELECT DISTINCT
        a.atleta_id,
        a.nombre::TEXT,
        a.fecha_nac
    FROM public.group_athletes ga
    JOIN public.trainer_groups tg ON ga.group_id = tg.id
    JOIN public.atletas a ON a.atleta_id = ga.atleta_id
    WHERE tg.trainer_user_id = auth.uid()
    ORDER BY a.nombre::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION get_trainer_athletes() TO authenticated;
