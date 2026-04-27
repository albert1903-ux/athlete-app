


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."calculate_imc"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Calcular IMC si hay altura y peso: IMC = peso / (altura/100)^2
  IF NEW.altura IS NOT NULL AND NEW.peso IS NOT NULL AND NEW.altura > 0 THEN
    NEW.imc := ROUND((NEW.peso / POWER(NEW.altura / 100.0, 2))::numeric, 2);
  ELSE
    NEW.imc := NULL;
  END IF;
  
  -- Actualizar timestamp
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_imc"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_medidas_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_medidas_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."atleta_club_hist" (
    "atleta_id" integer NOT NULL,
    "club_id" integer NOT NULL,
    "fecha_inicio" "date" NOT NULL,
    "fecha_fin" "date"
);


ALTER TABLE "public"."atleta_club_hist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."atletas" (
    "atleta_id" integer NOT NULL,
    "nombre" character varying NOT NULL,
    "fecha_nac" "date" NOT NULL,
    "licencia" character varying
);


ALTER TABLE "public"."atletas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categorias" (
    "categoria_id" integer NOT NULL,
    "nombre" character varying NOT NULL
);


ALTER TABLE "public"."categorias" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clubes" (
    "club_id" integer NOT NULL,
    "nombre" character varying NOT NULL
);


ALTER TABLE "public"."clubes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."eventos" (
    "evento_id" integer NOT NULL,
    "fecha" "date" NOT NULL,
    "ubicacion" character varying(255) NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "user_id" "uuid"
);


ALTER TABLE "public"."eventos" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."eventos_evento_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."eventos_evento_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."eventos_evento_id_seq" OWNED BY "public"."eventos"."evento_id";



CREATE TABLE IF NOT EXISTS "public"."medidas_corporales" (
    "medida_id" integer NOT NULL,
    "atleta_id" integer NOT NULL,
    "fecha" "date" NOT NULL,
    "altura" numeric(5,2),
    "peso" numeric(5,2),
    "envergadura" numeric(5,2),
    "imc" numeric(4,2),
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "user_id" "uuid",
    CONSTRAINT "check_altura_o_peso" CHECK ((("altura" IS NOT NULL) OR ("peso" IS NOT NULL))),
    CONSTRAINT "check_envergadura_valida" CHECK ((("envergadura" IS NULL) OR ("altura" IS NULL) OR ("envergadura" <= ("altura" * (2)::numeric)))),
    CONSTRAINT "medidas_corporales_altura_check" CHECK ((("altura" > (0)::numeric) AND ("altura" < (300)::numeric))),
    CONSTRAINT "medidas_corporales_envergadura_check" CHECK ((("envergadura" > (0)::numeric) AND ("envergadura" < (300)::numeric))),
    CONSTRAINT "medidas_corporales_imc_check" CHECK ((("imc" > (0)::numeric) AND ("imc" < (100)::numeric))),
    CONSTRAINT "medidas_corporales_peso_check" CHECK ((("peso" > (0)::numeric) AND ("peso" < (300)::numeric)))
);


ALTER TABLE "public"."medidas_corporales" OWNER TO "postgres";


COMMENT ON TABLE "public"."medidas_corporales" IS 'Medidas corporales (altura, peso, envergadura e IMC) de atletas a lo largo del tiempo';



COMMENT ON COLUMN "public"."medidas_corporales"."altura" IS 'Altura en centímetros (ej: 175.5)';



COMMENT ON COLUMN "public"."medidas_corporales"."peso" IS 'Peso en kilogramos (ej: 68.5)';



COMMENT ON COLUMN "public"."medidas_corporales"."envergadura" IS 'Envergadura de brazos en centímetros (ej: 180.0)';



COMMENT ON COLUMN "public"."medidas_corporales"."imc" IS 'Índice de Masa Corporal calculado automáticamente (peso/(altura/100)^2)';



CREATE SEQUENCE IF NOT EXISTS "public"."medidas_corporales_medida_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."medidas_corporales_medida_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."medidas_corporales_medida_id_seq" OWNED BY "public"."medidas_corporales"."medida_id";



CREATE TABLE IF NOT EXISTS "public"."participantes_eventos" (
    "participante_id" integer NOT NULL,
    "evento_id" integer NOT NULL,
    "nombre_atleta" character varying(255) NOT NULL,
    "prueba_id" integer,
    "prueba_nombre_manual" character varying(255),
    "hora" time without time zone NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "user_id" "uuid",
    "atleta_id" integer,
    CONSTRAINT "check_prueba_existe" CHECK ((("prueba_id" IS NOT NULL) OR (("prueba_nombre_manual" IS NOT NULL) AND (TRIM(BOTH FROM "prueba_nombre_manual") <> ''::"text"))))
);


ALTER TABLE "public"."participantes_eventos" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."participantes_eventos_participante_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."participantes_eventos_participante_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."participantes_eventos_participante_id_seq" OWNED BY "public"."participantes_eventos"."participante_id";



CREATE TABLE IF NOT EXISTS "public"."pruebas" (
    "prueba_id" integer NOT NULL,
    "nombre" character varying NOT NULL,
    "tipo_marca" character varying NOT NULL,
    "unidad_default" character varying NOT NULL,
    "max_texto" character varying,
    "max_valor" numeric,
    "tipo_prueba" "text",
    CONSTRAINT "pruebas_tipo_marca_check" CHECK ((("tipo_marca")::"text" = ANY ((ARRAY['tiempo'::character varying, 'distancia'::character varying])::"text"[])))
);


ALTER TABLE "public"."pruebas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resultados" (
    "resultado_id" integer NOT NULL,
    "atleta_id" integer NOT NULL,
    "club_id" integer NOT NULL,
    "prueba_id" integer NOT NULL,
    "fecha" "date" NOT NULL,
    "anio" integer NOT NULL,
    "mes" integer NOT NULL,
    "marca_texto" character varying,
    "marca_valor" numeric,
    "unidad" character varying NOT NULL,
    "genero" character varying NOT NULL,
    "superficie" character varying NOT NULL,
    "categoria_id" integer NOT NULL,
    CONSTRAINT "resultados_genero_check" CHECK ((("genero")::"text" = ANY ((ARRAY['MASC'::character varying, 'FEM'::character varying])::"text"[]))),
    CONSTRAINT "resultados_mes_check" CHECK ((("mes" >= 1) AND ("mes" <= 12))),
    CONSTRAINT "resultados_superficie_check" CHECK ((("superficie")::"text" = ANY ((ARRAY['AL'::character varying, 'PC'::character varying])::"text"[])))
);


ALTER TABLE "public"."resultados" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."atletas_favoritos" (
    "id" integer NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "atleta_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."atletas_favoritos" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."atletas_favoritos_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE "public"."atletas_favoritos_id_seq" OWNER TO "postgres";
ALTER SEQUENCE "public"."atletas_favoritos_id_seq" OWNED BY "public"."atletas_favoritos"."id";


ALTER TABLE ONLY "public"."atletas_favoritos" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."atletas_favoritos_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."eventos" ALTER COLUMN "evento_id" SET DEFAULT "nextval"('"public"."eventos_evento_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."medidas_corporales" ALTER COLUMN "medida_id" SET DEFAULT "nextval"('"public"."medidas_corporales_medida_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."participantes_eventos" ALTER COLUMN "participante_id" SET DEFAULT "nextval"('"public"."participantes_eventos_participante_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."atleta_club_hist"
    ADD CONSTRAINT "atleta_club_hist_pkey" PRIMARY KEY ("atleta_id", "club_id", "fecha_inicio");



ALTER TABLE ONLY "public"."atletas"
    ADD CONSTRAINT "atletas_pkey" PRIMARY KEY ("atleta_id");


ALTER TABLE ONLY "public"."atletas_favoritos"
    ADD CONSTRAINT "atletas_favoritos_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."atletas_favoritos"
    ADD CONSTRAINT "atletas_favoritos_user_id_atleta_id_key" UNIQUE ("user_id", "atleta_id");



ALTER TABLE ONLY "public"."categorias"
    ADD CONSTRAINT "categorias_nombre_key" UNIQUE ("nombre");



ALTER TABLE ONLY "public"."categorias"
    ADD CONSTRAINT "categorias_pkey" PRIMARY KEY ("categoria_id");



ALTER TABLE ONLY "public"."clubes"
    ADD CONSTRAINT "clubes_nombre_key" UNIQUE ("nombre");



ALTER TABLE ONLY "public"."clubes"
    ADD CONSTRAINT "clubes_pkey" PRIMARY KEY ("club_id");



ALTER TABLE ONLY "public"."eventos"
    ADD CONSTRAINT "eventos_pkey" PRIMARY KEY ("evento_id");



ALTER TABLE ONLY "public"."medidas_corporales"
    ADD CONSTRAINT "medidas_corporales_pkey" PRIMARY KEY ("medida_id");



ALTER TABLE ONLY "public"."participantes_eventos"
    ADD CONSTRAINT "participantes_eventos_pkey" PRIMARY KEY ("participante_id");



ALTER TABLE ONLY "public"."pruebas"
    ADD CONSTRAINT "pruebas_nombre_key" UNIQUE ("nombre");



ALTER TABLE ONLY "public"."pruebas"
    ADD CONSTRAINT "pruebas_pkey" PRIMARY KEY ("prueba_id");



ALTER TABLE ONLY "public"."resultados"
    ADD CONSTRAINT "resultados_pkey" PRIMARY KEY ("resultado_id");



CREATE INDEX "idx_eventos_fecha" ON "public"."eventos" USING "btree" ("fecha" DESC);



CREATE INDEX "idx_eventos_user_id" ON "public"."eventos" USING "btree" ("user_id");



CREATE INDEX "idx_medidas_atleta_fecha" ON "public"."medidas_corporales" USING "btree" ("atleta_id", "fecha" DESC);



CREATE INDEX "idx_medidas_corporales_user_id" ON "public"."medidas_corporales" USING "btree" ("user_id");



CREATE INDEX "idx_medidas_fecha" ON "public"."medidas_corporales" USING "btree" ("fecha" DESC);



CREATE INDEX "idx_participantes_evento" ON "public"."participantes_eventos" USING "btree" ("evento_id");



CREATE INDEX "idx_participantes_eventos_user_id" ON "public"."participantes_eventos" USING "btree" ("user_id");



CREATE INDEX "idx_participantes_prueba" ON "public"."participantes_eventos" USING "btree" ("prueba_id");



CREATE OR REPLACE TRIGGER "trigger_calculate_imc" BEFORE INSERT OR UPDATE OF "altura", "peso" ON "public"."medidas_corporales" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_imc"();



CREATE OR REPLACE TRIGGER "trigger_update_eventos_updated_at" BEFORE UPDATE ON "public"."eventos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_update_medidas_updated_at" BEFORE UPDATE ON "public"."medidas_corporales" FOR EACH ROW EXECUTE FUNCTION "public"."update_medidas_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_participantes_updated_at" BEFORE UPDATE ON "public"."participantes_eventos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."atletas_favoritos"
    ADD CONSTRAINT "atletas_favoritos_atleta_id_fkey" FOREIGN KEY ("atleta_id") REFERENCES "public"."atletas"("atleta_id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."resultados"
    ADD CONSTRAINT "fk_resultados_atleta" FOREIGN KEY ("atleta_id") REFERENCES "public"."atletas"("atleta_id");



ALTER TABLE ONLY "public"."resultados"
    ADD CONSTRAINT "fk_resultados_categoria" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("categoria_id");



ALTER TABLE ONLY "public"."resultados"
    ADD CONSTRAINT "fk_resultados_club" FOREIGN KEY ("club_id") REFERENCES "public"."clubes"("club_id");



ALTER TABLE ONLY "public"."resultados"
    ADD CONSTRAINT "fk_resultados_prueba" FOREIGN KEY ("prueba_id") REFERENCES "public"."pruebas"("prueba_id");



ALTER TABLE ONLY "public"."participantes_eventos"
    ADD CONSTRAINT "participantes_eventos_atleta_id_fkey" FOREIGN KEY ("atleta_id") REFERENCES "public"."atletas"("atleta_id");



ALTER TABLE ONLY "public"."participantes_eventos"
    ADD CONSTRAINT "participantes_eventos_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("evento_id") ON DELETE CASCADE;



CREATE POLICY "Enable events" ON "public"."eventos" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."eventos" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."medidas_corporales" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."participantes_eventos" FOR SELECT USING (true);



ALTER TABLE "public"."atletas_favoritos" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus favoritos" ON "public"."atletas_favoritos" FOR SELECT USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Usuarios insertan favoritos" ON "public"."atletas_favoritos" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Usuarios eliminan favoritos" ON "public"."atletas_favoritos" FOR DELETE USING (("auth"."uid"() = "user_id"));


ALTER TABLE "public"."medidas_corporales" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "medidas_delete_own" ON "public"."medidas_corporales" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "medidas_insert_own" ON "public"."medidas_corporales" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "medidas_update_own" ON "public"."medidas_corporales" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_imc"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_imc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_imc"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_medidas_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_medidas_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_medidas_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."atleta_club_hist" TO "anon";
GRANT ALL ON TABLE "public"."atleta_club_hist" TO "authenticated";
GRANT ALL ON TABLE "public"."atleta_club_hist" TO "service_role";



GRANT ALL ON TABLE "public"."atletas" TO "anon";
GRANT ALL ON TABLE "public"."atletas" TO "authenticated";
GRANT ALL ON TABLE "public"."atletas" TO "service_role";



GRANT ALL ON TABLE "public"."atletas_favoritos" TO "anon";
GRANT ALL ON TABLE "public"."atletas_favoritos" TO "authenticated";
GRANT ALL ON TABLE "public"."atletas_favoritos" TO "service_role";

GRANT ALL ON SEQUENCE "public"."atletas_favoritos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."atletas_favoritos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."atletas_favoritos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."categorias" TO "anon";
GRANT ALL ON TABLE "public"."categorias" TO "authenticated";
GRANT ALL ON TABLE "public"."categorias" TO "service_role";



GRANT ALL ON TABLE "public"."clubes" TO "anon";
GRANT ALL ON TABLE "public"."clubes" TO "authenticated";
GRANT ALL ON TABLE "public"."clubes" TO "service_role";



GRANT ALL ON TABLE "public"."eventos" TO "anon";
GRANT ALL ON TABLE "public"."eventos" TO "authenticated";
GRANT ALL ON TABLE "public"."eventos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."eventos_evento_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."eventos_evento_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."eventos_evento_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."medidas_corporales" TO "anon";
GRANT ALL ON TABLE "public"."medidas_corporales" TO "authenticated";
GRANT ALL ON TABLE "public"."medidas_corporales" TO "service_role";



GRANT ALL ON SEQUENCE "public"."medidas_corporales_medida_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."medidas_corporales_medida_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."medidas_corporales_medida_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."participantes_eventos" TO "anon";
GRANT ALL ON TABLE "public"."participantes_eventos" TO "authenticated";
GRANT ALL ON TABLE "public"."participantes_eventos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."participantes_eventos_participante_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."participantes_eventos_participante_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."participantes_eventos_participante_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pruebas" TO "anon";
GRANT ALL ON TABLE "public"."pruebas" TO "authenticated";
GRANT ALL ON TABLE "public"."pruebas" TO "service_role";



GRANT ALL ON TABLE "public"."resultados" TO "anon";
GRANT ALL ON TABLE "public"."resultados" TO "authenticated";
GRANT ALL ON TABLE "public"."resultados" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







