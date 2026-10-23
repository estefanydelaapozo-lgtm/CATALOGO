-- MultiCatálogo · Fase 4: pedidos transaccionales + comisiones.
-- Es IDEMPOTENTE: el backend la ejecuta automáticamente en cada arranque (database/embed.go),
-- así funciona tanto con una BD nueva como con la BD de las fases 2/3 que ya tienes.
-- Para volver a empezar desde cero:  docker compose down -v && docker compose up -d

-- Stock simulado (el checkout lo resta dentro de la transacción)
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 100 CHECK (stock >= 0);

-- Saldo de comisiones acumulado por cada nodo de la red
ALTER TABLE referidos ADD COLUMN IF NOT EXISTS saldo NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (saldo >= 0);

-- A qué nodo de la red pertenece cada usuario (de ahí se suben los niveles 1, 2 y 3)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS referido_id INTEGER REFERENCES referidos(id);

CREATE TABLE IF NOT EXISTS pedidos (
    id                    SERIAL PRIMARY KEY,
    -- Número legible derivado del id: MC-000001
    numero                VARCHAR(20) GENERATED ALWAYS AS ('MC-' || LPAD(id::text, 6, '0')) STORED,
    usuario_id            INTEGER       NOT NULL REFERENCES usuarios(id),
    cliente_nombre        VARCHAR(150)  NOT NULL,
    cliente_email         VARCHAR(255)  NOT NULL,
    direccion             VARCHAR(255)  NOT NULL,
    ciudad                VARCHAR(100)  NOT NULL,
    telefono              VARCHAR(40)   NOT NULL,
    metodo_pago           VARCHAR(50)   NOT NULL,
    total                 NUMERIC(12,2) NOT NULL CHECK (total >= 0),
    estado                VARCHAR(20)   NOT NULL DEFAULT 'pagado',
    -- Marca que evita pagar comisiones dos veces por el mismo pedido
    comisiones_calculadas BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pedido_items (
    id              SERIAL PRIMARY KEY,
    pedido_id       INTEGER       NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id     INTEGER       NOT NULL REFERENCES productos(id),
    cantidad        INTEGER       NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0)
);
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido ON pedido_items(pedido_id);

-- Libro de comisiones: una fila por cada referido ascendente que gana algo en un pedido
CREATE TABLE IF NOT EXISTS comisiones (
    id          SERIAL PRIMARY KEY,
    pedido_id   INTEGER       NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    referido_id INTEGER       NOT NULL REFERENCES referidos(id),
    nivel       INTEGER       NOT NULL CHECK (nivel BETWEEN 1 AND 3),
    porcentaje  NUMERIC(5,4)  NOT NULL,
    monto       NUMERIC(12,2) NOT NULL CHECK (monto >= 0),
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comisiones_pedido ON comisiones(pedido_id);

-- Datos de prueba: el admin es la raíz de la red; el cliente es "Diana Paz" (nivel 3),
-- por lo que sus compras generan comisión para Carlos Ruiz (10 %), Ana García (5 %) y "Tú" (2 %).
UPDATE usuarios SET referido_id = 0 WHERE email = 'admin@upse.edu.ec'   AND referido_id IS NULL;
UPDATE usuarios SET referido_id = 7 WHERE email = 'cliente@upse.edu.ec' AND referido_id IS NULL;
