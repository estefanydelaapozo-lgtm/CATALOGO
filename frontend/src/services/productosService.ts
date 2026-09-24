import { productosMock, type Producto } from '../data/productos';

export const getProductos = (): Promise<Producto[]> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(productosMock), 400);
  });

export const getProductoById = (id: number): Promise<Producto | undefined> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(productosMock.find((p) => p.id === id)), 300);
  });
