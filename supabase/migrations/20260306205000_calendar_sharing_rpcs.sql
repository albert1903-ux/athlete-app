-- RPCs to securely fetch shares and notifications with user information attached
-- This is necessary because the client cannot arbitrarily join the auth.users table in PostgREST

CREATE OR REPLACE FUNCTION public.get_my_calendar_shares()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(json_agg(
            json_build_object(
                'id', cs.id,
                'owner_id', cs.owner_id,
                'shared_with_id', cs.shared_with_id,
                'status', cs.status,
                'created_at', cs.created_at,
                'recipient', json_build_object(
                    'email', u.email,
                    'raw_user_meta_data', u.raw_user_meta_data
                )
            )
        ), '[]'::json)
        FROM public.calendar_shares cs
        JOIN auth.users u ON cs.shared_with_id = u.id
        WHERE cs.owner_id = auth.uid()
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_shared_with_me()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(json_agg(
            json_build_object(
                'id', cs.id,
                'owner_id', cs.owner_id,
                'shared_with_id', cs.shared_with_id,
                'status', cs.status,
                'created_at', cs.created_at,
                'owner', json_build_object(
                    'email', u.email,
                    'raw_user_meta_data', u.raw_user_meta_data
                )
            )
        ), '[]'::json)
        FROM public.calendar_shares cs
        JOIN auth.users u ON cs.owner_id = u.id
        WHERE cs.shared_with_id = auth.uid()
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_notifications()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(json_agg(
            json_build_object(
                'id', n.id,
                'user_id', n.user_id,
                'sender_id', n.sender_id,
                'type', n.type,
                'reference_id', n.reference_id,
                'is_read', n.is_read,
                'created_at', n.created_at,
                'sender', CASE WHEN n.sender_id IS NOT NULL THEN
                    json_build_object(
                        'email', u.email,
                        'raw_user_meta_data', u.raw_user_meta_data
                    )
                ELSE NULL END
            ) ORDER BY n.created_at DESC
        ), '[]'::json)
        FROM public.notifications n
        LEFT JOIN auth.users u ON n.sender_id = u.id
        WHERE n.user_id = auth.uid()
    );
END;
$$;
