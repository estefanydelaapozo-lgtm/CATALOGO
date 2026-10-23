-- Deja la demo de la Fase 4 como al inicio (útil entre clases):
--   docker cp database/reset_demo_fase4.sql multicatalogo-db:/tmp/r.sql
--   docker exec multicatalogo-db psql -U multicatalogo -d multicatalogo -f /tmp/r.sql
--   docker exec multicatalogo-redis redis-cli FLUSHALL
TRUNCATE comisiones, pedido_items, pedidos RESTART IDENTITY;
UPDATE productos SET stock = 100;
UPDATE referidos r SET saldo = 0, ventas = v.ventas
FROM (VALUES (0,2400),(1,1200),(2,850),(3,430),(4,500),(5,430),(6,380),(7,300)) AS v(id, ventas)
WHERE r.id = v.id;
