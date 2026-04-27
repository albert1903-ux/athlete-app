-- Update RLS policies to allow viewing shared calendars

-- 1. Update 'eventos' SELECT policy
DROP POLICY IF EXISTS "Private Read Access" ON "public"."eventos";

CREATE POLICY "Private Read Access" ON "public"."eventos" FOR SELECT TO authenticated USING (
    auth.uid() = user_id OR
    user_id IN (
        SELECT owner_id FROM public.calendar_shares WHERE shared_with_id = auth.uid() AND status = 'accepted'
    )
);

-- 2. Update 'participantes_eventos' SELECT policy
DROP POLICY IF EXISTS "Private Read Access" ON "public"."participantes_eventos";

CREATE POLICY "Private Read Access" ON "public"."participantes_eventos" FOR SELECT TO authenticated USING (
    auth.uid() = user_id OR
    user_id IN (
        SELECT owner_id FROM public.calendar_shares WHERE shared_with_id = auth.uid() AND status = 'accepted'
    )
);
