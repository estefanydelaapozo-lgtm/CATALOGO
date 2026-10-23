// Package domain: funciones puras de negocio (sin I/O).
package domain

// Tasas por nivel ascendente (1.er upline 10 %, 2.º 5 %, 3.º 2 %).
var TasasComision = [3]float64{0.10, 0.05, 0.02}

// LineaComision es el resultado de repartir un total entre niveles.
type LineaComision struct {
	Nivel      int
	Porcentaje float64
	Monto      float64
}

// RepartirComisiones calcula montos por nivel sobre un total de pedido.
// No tiene I/O: testeable unitariamente.
func RepartirComisiones(total float64, tasas [3]float64) []LineaComision {
	out := make([]LineaComision, 0, 3)
	for i, t := range tasas {
		if t <= 0 {
			continue
		}
		monto := float64(int64(total*t*100+0.5)) / 100 // redondeo a céntimos
		out = append(out, LineaComision{Nivel: i + 1, Porcentaje: t, Monto: monto})
	}
	return out
}
