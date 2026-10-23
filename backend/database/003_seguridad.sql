-- Migración 003: seguridad (bcrypt + índices). Idempotente.
-- Las contraseñas se actualizan a bcrypt de "123456".
-- El token estático deja de usarse (JWT se genera en login); se mantiene la columna por compatibilidad.

-- Extensión pgcrypto (opcional; el hash lo genera Go, pero la dejamos disponible).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Índices de rendimiento (idempotentes)
CREATE INDEX IF NOT EXISTS idx_referidos_parent ON referidos(parent_id);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_email ON pedidos(cliente_email);
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido ON pedido_items(pedido_id);

-- Actualizar passwords a bcrypt de "123456" (solo si aún están en texto plano).
-- Hash generado con bcrypt.DefaultCost (cost 10).
UPDATE usuarios
SET password = '$2a$10$25xR7ldVklwrNocB0WJVf.K2bQDpSGc/Y1nKgVATU8ovRQ/aRwWxK'
WHERE password = '123456' OR length(password) < 60;
