package repository

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"strings"
	"sync/atomic"
	"time"

	"github.com/redis/go-redis/v9"
)

// Claves y TTL del caché (patrón Cache-Aside).
const (
	KeyProductos = "productos:all"
	PrefixRed    = "red:tree:"
	TTLProductos = 5 * time.Minute  // el catálogo cambia poco
	TTLRed       = 10 * time.Minute // armar el árbol es la operación más costosa
)

// KeyRed devuelve la clave de la red de un usuario: red:tree:{email}.
// Sin email se usa la red global ("red:tree:global").
func KeyRed(email string) string {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		email = "global"
	}
	return PrefixRed + email
}

// CacheAside implementa el patrón Cache-Aside de forma genérica sobre cualquier CacheRepository:
//
//  1. Get en el caché.
//  2. HIT  -> devuelve el valor sin tocar PostgreSQL.
//  3. MISS -> ejecuta load (consulta a PostgreSQL), guarda el resultado con TTL y lo devuelve.
//
// El segundo valor devuelto indica si fue HIT (true) o MISS (false).
// El caché es solo una optimización: cualquier fallo se registra y se trata como MISS.
func CacheAside[T any](ctx context.Context, cache CacheRepository, key string, ttl time.Duration,
	load func(context.Context) (T, error)) (T, bool, error) {

	var v T
	hit, err := cache.Get(ctx, key, &v)
	if err != nil {
		log.Printf("cache: error leyendo %q (se consulta PostgreSQL): %v", key, err)
	} else if hit {
		return v, true, nil // CACHE HIT
	}

	// CACHE MISS: se consulta la fuente de verdad.
	valor, err := load(ctx)
	if err != nil {
		var zero T
		return zero, false, err
	}
	if err := cache.Set(ctx, key, valor, ttl); err != nil {
		log.Printf("cache: no se pudo guardar %q: %v", key, err)
	}
	return valor, false, nil
}

// ---------- Implementación con Redis ----------

// RedisCache implementa CacheRepository con go-redis.
// Si Redis falla en caliente, se "pausa" 15 s: las lecturas pasan directo a PostgreSQL
// sin que cada petición pague el timeout. Las invalidaciones SIEMPRE se intentan.
type RedisCache struct {
	rdb            *redis.Client
	caidoHasta     atomic.Int64 // UnixNano hasta el que se omite el caché
	pausaTrasFallo time.Duration
}

func NewRedisCache(rdb *redis.Client) *RedisCache {
	return &RedisCache{rdb: rdb, pausaTrasFallo: 15 * time.Second}
}

func (c *RedisCache) activo() bool { return time.Now().UnixNano() >= c.caidoHasta.Load() }

func (c *RedisCache) marcarCaido() {
	c.caidoHasta.Store(time.Now().Add(c.pausaTrasFallo).UnixNano())
}

func (c *RedisCache) Get(ctx context.Context, key string, dest any) (bool, error) {
	if !c.activo() {
		return false, nil
	}
	raw, err := c.rdb.Get(ctx, key).Bytes()
	if errors.Is(err, redis.Nil) {
		return false, nil // MISS normal: no existe o expiró
	}
	if err != nil {
		c.marcarCaido()
		return false, err
	}
	if err := json.Unmarshal(raw, dest); err != nil {
		return false, err // valor corrupto: se recalcula y se sobrescribe
	}
	return true, nil
}

func (c *RedisCache) Set(ctx context.Context, key string, value any, ttl time.Duration) error {
	if !c.activo() {
		return nil
	}
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	if err := c.rdb.Set(ctx, key, data, ttl).Err(); err != nil {
		c.marcarCaido()
		return err
	}
	return nil
}

func (c *RedisCache) Delete(ctx context.Context, keys ...string) error {
	if len(keys) == 0 {
		return nil
	}
	return c.rdb.Del(ctx, keys...).Err()
}

// DeleteByPrefix usa SCAN (incremental, no bloquea Redis como lo haría KEYS).
func (c *RedisCache) DeleteByPrefix(ctx context.Context, prefix string) error {
	iter := c.rdb.Scan(ctx, 0, prefix+"*", 100).Iterator()
	var keys []string
	for iter.Next(ctx) {
		keys = append(keys, iter.Val())
	}
	if err := iter.Err(); err != nil {
		return err
	}
	return c.Delete(ctx, keys...)
}

// ---------- Caché nulo ----------

// NopCache se inyecta cuando Redis no está disponible: todo es MISS y no guarda nada.
// Así los controladores nunca preguntan "¿hay caché?": siempre tienen un CacheRepository.
type NopCache struct{}

func (NopCache) Get(context.Context, string, any) (bool, error)        { return false, nil }
func (NopCache) Set(context.Context, string, any, time.Duration) error { return nil }
func (NopCache) Delete(context.Context, ...string) error               { return nil }
func (NopCache) DeleteByPrefix(context.Context, string) error          { return nil }
