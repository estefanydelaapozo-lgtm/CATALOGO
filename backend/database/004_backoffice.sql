-- Migración 004: back-office MLM (idempotente).
-- Extiende el esquema de Fase 4 para registro, CRUD, pedidos, ledger y liquidaciones.

-- ---------- usuarios ----------
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nombre VARCHAR(150) NOT NULL DEFAULT '';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS creado_en TIMESTAMPTZ NOT NULL DEFAULT now();
-- referido_id ya existe desde migracion_fase4

-- ---------- referidos ----------
ALTER TABLE referidos ADD COLUMN IF NOT EXISTS codigo VARCHAR(40);
-- Códigos de invitación para el seed
UPDATE referidos SET codigo = 'TU'    WHERE id = 0 AND (codigo IS NULL OR codigo = '');
UPDATE referidos SET codigo = 'ANA'   WHERE id = 1 AND (codigo IS NULL OR codigo = '');
UPDATE referidos SET codigo = 'LUIS'  WHERE id = 2 AND (codigo IS NULL OR codigo = '');
UPDATE referidos SET codigo = 'MARTA' WHERE id = 3 AND (codigo IS NULL OR codigo = '');
UPDATE referidos SET codigo = 'CARLOS' WHERE id = 4 AND (codigo IS NULL OR codigo = '');
UPDATE referidos SET codigo = 'SOFIA' WHERE id = 5 AND (codigo IS NULL OR codigo = '');
UPDATE referidos SET codigo = 'PEDRO' WHERE id = 6 AND (codigo IS NULL OR codigo = '');
UPDATE referidos SET codigo = 'DIANA' WHERE id = 7 AND (codigo IS NULL OR codigo = '');
-- Unique parcial (permite NULL en filas futuras sin código aún)
CREATE UNIQUE INDEX IF NOT EXISTS idx_referidos_codigo ON referidos(codigo) WHERE codigo IS NOT NULL AND codigo <> '';

-- Secuencia para nuevos nodos de referidos (el seed usa ids fijos 0..7)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'referidos_id_seq') THEN
    CREATE SEQUENCE referidos_id_seq;
    PERFORM setval('referidos_id_seq', COALESCE((SELECT MAX(id) FROM referidos), 0) + 1, false);
    ALTER TABLE referidos ALTER COLUMN id SET DEFAULT nextval('referidos_id_seq');
    ALTER SEQUENCE referidos_id_seq OWNED BY referidos.id;
  ELSE
    PERFORM setval('referidos_id_seq', COALESCE((SELECT MAX(id) FROM referidos), 0) + 1, false);
  END IF;
END $$;

-- ---------- productos ----------
ALTER TABLE productos ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;

-- ---------- pedidos ----------
-- estado: pendiente → preparando → enviado → entregado | cancelado
-- (fase4 usaba 'pagado'; normalizamos a 'pendiente' para filas viejas)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS estado VARCHAR(20);
UPDATE pedidos SET estado = 'pendiente' WHERE estado IS NULL OR estado = 'pagado' OR estado = '';
ALTER TABLE pedidos ALTER COLUMN estado SET DEFAULT 'pendiente';
ALTER TABLE pedidos ALTER COLUMN estado SET NOT NULL;

-- ---------- comisiones (ledger) ----------
ALTER TABLE comisiones ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'pendiente';
ALTER TABLE comisiones ADD COLUMN IF NOT EXISTS liquidacion_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_comisiones_referido ON comisiones(referido_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_estado ON comisiones(estado);

-- ---------- liquidaciones ----------
CREATE TABLE IF NOT EXISTS liquidaciones (
    id          SERIAL PRIMARY KEY,
    referido_id INTEGER       NOT NULL REFERENCES referidos(id),
    total       NUMERIC(12,2) NOT NULL CHECK (total >= 0),
    estado      VARCHAR(20)   NOT NULL DEFAULT 'pagada',
    creado_en   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    pagada_en   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_referido ON liquidaciones(referido_id);

-- FK comisiones → liquidaciones (añadir solo si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'comisiones_liquidacion_id_fkey'
  ) THEN
    ALTER TABLE comisiones
      ADD CONSTRAINT comisiones_liquidacion_id_fkey
      FOREIGN KEY (liquidacion_id) REFERENCES liquidaciones(id);
  END IF;
END $$;

-- ---------- seed: vincular usuarios a la red ----------
UPDATE usuarios SET nombre = 'Administrador UPSE' WHERE email = 'admin@upse.edu.ec' AND (nombre IS NULL OR nombre = '');
UPDATE usuarios SET nombre = 'Cliente Demo'       WHERE email = 'cliente@upse.edu.ec' AND (nombre IS NULL OR nombre = '');
-- admin → raíz (0 "Tú"); cliente → Luis Poveda (2) según plan
UPDATE usuarios SET referido_id = 0 WHERE email = 'admin@upse.edu.ec';
UPDATE usuarios SET referido_id = 2 WHERE email = 'cliente@upse.edu.ec';

-- Índices de pedidos
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario ON pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_email ON pedidos(cliente_email);
