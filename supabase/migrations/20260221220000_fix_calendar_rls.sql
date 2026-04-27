-- Force user_id at the database level so the frontend doesn't need to pass it explicitly
ALTER TABLE "public"."eventos" ALTER COLUMN "user_id" SET DEFAULT auth.uid();
ALTER TABLE "public"."participantes_eventos" ALTER COLUMN "user_id" SET DEFAULT auth.uid();
ALTER TABLE "public"."medidas_corporales" ALTER COLUMN "user_id" SET DEFAULT auth.uid();

-- Ensure RLS policies are strict for Calendar schemas
DROP POLICY IF EXISTS "Private Read Access" ON "public"."eventos";
DROP POLICY IF EXISTS "Private Insert Access" ON "public"."eventos";
DROP POLICY IF EXISTS "Private Update Access" ON "public"."eventos";
DROP POLICY IF EXISTS "Private Delete Access" ON "public"."eventos";

DROP POLICY IF EXISTS "Private Read Access" ON "public"."participantes_eventos";
DROP POLICY IF EXISTS "Private Insert Access" ON "public"."participantes_eventos";
DROP POLICY IF EXISTS "Private Update Access" ON "public"."participantes_eventos";
DROP POLICY IF EXISTS "Private Delete Access" ON "public"."participantes_eventos";

-- Recreation of policies matching exactly the auth.uid
CREATE POLICY "Private Read Access" ON "public"."eventos" FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Private Insert Access" ON "public"."eventos" FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Private Update Access" ON "public"."eventos" FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Private Delete Access" ON "public"."eventos" FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Private Read Access" ON "public"."participantes_eventos" FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Private Insert Access" ON "public"."participantes_eventos" FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Private Update Access" ON "public"."participantes_eventos" FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Private Delete Access" ON "public"."participantes_eventos" FOR DELETE TO authenticated USING (auth.uid() = user_id);
