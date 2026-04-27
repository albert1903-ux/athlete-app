-- Enable RLS on all tables
ALTER TABLE "public"."atletas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."clubes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."categorias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pruebas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."resultados" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."atleta_club_hist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."eventos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."medidas_corporales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."participantes_eventos" ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might conflict or be too permissive
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."atletas";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."clubes";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."categorias";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."pruebas";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."resultados";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."atleta_club_hist";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."eventos";
DROP POLICY IF EXISTS "Enable events" ON "public"."eventos";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."medidas_corporales";
DROP POLICY IF EXISTS "medidas_delete_own" ON "public"."medidas_corporales";
DROP POLICY IF EXISTS "medidas_insert_own" ON "public"."medidas_corporales";
DROP POLICY IF EXISTS "medidas_update_own" ON "public"."medidas_corporales";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."participantes_eventos";

-- Global Tables: Allow any authenticated user full access (Shared catalog/results)
CREATE POLICY "Global Authenticated Access" ON "public"."atletas" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Global Authenticated Access" ON "public"."clubes" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Global Authenticated Access" ON "public"."categorias" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Global Authenticated Access" ON "public"."pruebas" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Global Authenticated Access" ON "public"."resultados" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Global Authenticated Access" ON "public"."atleta_club_hist" FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Private Tables: Bound to user_id
CREATE POLICY "Private Read Access" ON "public"."eventos" FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Private Insert Access" ON "public"."eventos" FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Private Update Access" ON "public"."eventos" FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Private Delete Access" ON "public"."eventos" FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Private Read Access" ON "public"."medidas_corporales" FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Private Insert Access" ON "public"."medidas_corporales" FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Private Update Access" ON "public"."medidas_corporales" FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Private Delete Access" ON "public"."medidas_corporales" FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Private Read Access" ON "public"."participantes_eventos" FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Private Insert Access" ON "public"."participantes_eventos" FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Private Update Access" ON "public"."participantes_eventos" FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Private Delete Access" ON "public"."participantes_eventos" FOR DELETE TO authenticated USING (auth.uid() = user_id);
