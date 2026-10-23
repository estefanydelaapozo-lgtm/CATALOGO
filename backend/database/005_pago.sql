-- Migración 005: datos del método de pago en el pedido (idempotente).
-- detalle_pago: JSON con los datos NO sensibles (titular, últimos 4, referencia, datos de entrega...).
-- comprobante: data URL del voucher de la transferencia (solo se llena con "Transferencia bancaria").
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS detalle_pago JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS comprobante  TEXT;
