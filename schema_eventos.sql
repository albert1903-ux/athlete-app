-- ============================================
-- ESQUEMA: EVENTOS Y PARTICIPANTES
-- ============================================
-- Este script crea las tablas para almacenar eventos deportivos
-- y sus participantes con pruebas y horarios.
--
-- Ejecutar en Supabase: Dashboard → SQL Editor → New Query
-- ============================================

-- Crear tabla de eventos
CREATE TABLE eventos (
  evento_id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  ubicacion VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla de participantes en eventos
CREATE TABLE participantes_eventos (
  participante_id SERIAL PRIMARY KEY,
  evento_id INTEGER NOT NULL REFERENCES eventos(evento_id) ON DELETE CASCADE,
  nombre_atleta VARCHAR(255) NOT NULL,
  prueba_id INTEGER REFERENCES pruebas(prueba_id) ON DELETE SET NULL,
  prueba_nombre_manual VARCHAR(255), -- Para pruebas que no están en BD
  hora TIME NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- Asegurar que haya al menos un nombre de prueba (desde tabla o manual)
  CONSTRAINT check_prueba_existe CHECK (
    (prueba_id IS NOT NULL) OR (prueba_nombre_manual IS NOT NULL AND TRIM(prueba_nombre_manual) != '')
  )
);

-- Índices para consultas rápidas
CREATE INDEX idx_eventos_fecha ON eventos(fecha DESC);
CREATE INDEX idx_participantes_evento ON participantes_eventos(evento_id);
CREATE INDEX idx_participantes_prueba ON participantes_eventos(prueba_id);

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER trigger_update_eventos_updated_at
  BEFORE UPDATE ON eventos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_participantes_updated_at
  BEFORE UPDATE ON participantes_eventos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

