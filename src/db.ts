import { createClient } from "@supabase/supabase-js";
import type { Ingredient, Loan, MenuItem, Order, Purchase, Service } from "./types";

/**
 * Conexión a Supabase. Las credenciales llegan en el build desde
 * VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY, o se usan las del proyecto por defecto.
 */
// Proyecto "SazonControl". La llave publishable es pública por diseño:
// los datos están protegidos por Row Level Security (solo usuarios con sesión).
const DEFAULT_URL = "https://fnakzeakrmaoswrxheyb.supabase.co";
const DEFAULT_KEY = "sb_publishable_BvamrKPM07UC4iaSpE30Xw_iVn9j4-4";

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_URL;
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || DEFAULT_KEY;

// VITE_LOCAL_ONLY=true sirve para probar sin la base (datos solo en el navegador).
const localOnly = import.meta.env.VITE_LOCAL_ONLY === "true";
export const supabase = !localOnly && url && anonKey ? createClient(url, anonKey) : null;
export const cloudEnabled = !!supabase;

function db() {
  if (!supabase) throw new Error("Supabase no está configurado");
  return supabase;
}

async function run<T = unknown>(
  promise: PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data as T;
}

// ---------- Lectura ----------

type ServicioRow = { id: string; fecha: string; turno: "Almuerzo" | "Cena" };
type PreparacionRow = {
  id: string;
  servicio_id: string;
  nombre: string;
  cantidad: number;
  costo_unitario: number;
  precio: number;
};
type IngredienteRow = {
  id: string;
  preparacion_id: string;
  nombre: string;
  unidad: string;
  cantidad_comprada: number;
  precio_compra: number;
  cantidad_usada: number;
};
type PedidoRow = {
  id: string;
  servicio_id: string;
  preparacion_id: string | null;
  cliente: string;
  cantidad: number;
  pagado: boolean;
};
type CompraRow = { id: string; servicio_id: string; nombre: string; precio: number };
type PrestamoRow = {
  id: string;
  prestamista: string;
  monto: number;
  fecha: string;
  nota: string;
  devuelto: boolean;
};

export async function loadAll(): Promise<{ services: Service[]; loans: Loan[] }> {
  const c = db();
  // Si la tabla de compras aún no existe, la app sigue funcionando sin ella.
  const comprasPromise = c
    .from("compras")
    .select("id, servicio_id, nombre, precio")
    .order("creado_en")
    .then(({ data, error }) => (error ? [] : ((data || []) as CompraRow[])));
  const [servicios, preparaciones, ingredientes, pedidos, prestamos, compras] = await Promise.all([
    run<ServicioRow[]>(c.from("servicios").select("id, fecha, turno").order("fecha")),
    run<PreparacionRow[]>(
      c
        .from("preparaciones")
        .select("id, servicio_id, nombre, cantidad, costo_unitario, precio")
        .order("creado_en"),
    ),
    run<IngredienteRow[]>(
      c
        .from("ingredientes")
        .select(
          "id, preparacion_id, nombre, unidad, cantidad_comprada, precio_compra, cantidad_usada",
        )
        .order("creado_en"),
    ),
    run<PedidoRow[]>(
      c
        .from("pedidos")
        .select("id, servicio_id, preparacion_id, cliente, cantidad, pagado")
        .order("creado_en"),
    ),
    run<PrestamoRow[]>(
      c
        .from("prestamos")
        .select("id, prestamista, monto, fecha, nota, devuelto")
        .order("fecha", { ascending: false }),
    ),
    comprasPromise,
  ]);

  const toIngredient = (r: IngredienteRow): Ingredient => ({
    id: r.id,
    name: r.nombre,
    unit: r.unidad,
    buyQty: Number(r.cantidad_comprada),
    buyPrice: Number(r.precio_compra),
    usedQty: Number(r.cantidad_usada),
  });
  const toItem = (r: PreparacionRow): MenuItem => ({
    id: r.id,
    name: r.nombre,
    quantity: r.cantidad,
    unitCost: Number(r.costo_unitario),
    price: Number(r.precio),
    ingredients: ingredientes.filter((i) => i.preparacion_id === r.id).map(toIngredient),
  });
  const toOrder = (r: PedidoRow): Order => ({
    id: r.id,
    customer: r.cliente,
    itemId: r.preparacion_id ?? "",
    quantity: r.cantidad,
    paid: r.pagado,
  });

  return {
    services: servicios.map((s) => ({
      id: s.id,
      date: s.fecha,
      shift: s.turno,
      items: preparaciones.filter((p) => p.servicio_id === s.id).map(toItem),
      orders: pedidos.filter((p) => p.servicio_id === s.id).map(toOrder),
      purchases: compras
        .filter((p) => p.servicio_id === s.id)
        .map((p): Purchase => ({ id: p.id, name: p.nombre, price: Number(p.precio) })),
    })),
    loans: prestamos.map((p) => ({
      id: p.id,
      lender: p.prestamista,
      amount: Number(p.monto),
      date: p.fecha,
      note: p.nota,
      returned: p.devuelto,
    })),
  };
}

// ---------- Escritura ----------

const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** Agrupa cambios rápidos sobre el mismo registro y ejecuta solo el último. */
function debounced(key: string, task: () => Promise<unknown>, wait = 600): Promise<void> {
  clearTimeout(timers.get(key));
  return new Promise((resolve, reject) => {
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        task().then(() => resolve(), reject);
      }, wait),
    );
  });
}

const ingredientRow = (preparacionId: string, i: Ingredient) => ({
  id: i.id,
  preparacion_id: preparacionId,
  nombre: i.name,
  unidad: i.unit,
  cantidad_comprada: i.buyQty,
  precio_compra: i.buyPrice,
  cantidad_usada: i.usedQty,
});

const itemRow = (servicioId: string, item: MenuItem) => ({
  id: item.id,
  servicio_id: servicioId,
  nombre: item.name,
  cantidad: item.quantity,
  costo_unitario: item.unitCost,
  precio: item.price,
});

export const api = {
  async addService(s: Service) {
    await run(db().from("servicios").insert({ id: s.id, fecha: s.date, turno: s.shift }));
  },

  async addItem(serviceId: string, item: MenuItem) {
    await run(db().from("preparaciones").insert(itemRow(serviceId, item)));
    if (item.ingredients?.length) {
      await run(
        db()
          .from("ingredientes")
          .insert(item.ingredients.map((i) => ingredientRow(item.id, i))),
      );
    }
  },

  /** Guarda los cambios de una preparación y sus ingredientes (agregados o quitados). */
  async syncItem(serviceId: string, prev: MenuItem, next: MenuItem) {
    const c = db();
    if (
      prev.name !== next.name ||
      prev.quantity !== next.quantity ||
      prev.price !== next.price ||
      prev.unitCost !== next.unitCost
    ) {
      // Espera a que se deje de escribir para guardar solo el valor final.
      await debounced(`prep:${next.id}`, () =>
        run(c.from("preparaciones").update(itemRow(serviceId, next)).eq("id", next.id)),
      );
    }
    const before = new Set((prev.ingredients || []).map((i) => i.id));
    const after = new Set((next.ingredients || []).map((i) => i.id));
    const added = (next.ingredients || []).filter((i) => !before.has(i.id));
    const removed = [...before].filter((id) => !after.has(id));
    if (added.length) {
      await run(c.from("ingredientes").insert(added.map((i) => ingredientRow(next.id, i))));
    }
    if (removed.length) {
      await run(c.from("ingredientes").delete().in("id", removed));
    }
  },

  async addOrder(serviceId: string, order: Order) {
    await run(
      db()
        .from("pedidos")
        .insert({
          id: order.id,
          servicio_id: serviceId,
          preparacion_id: order.itemId || null,
          cliente: order.customer,
          cantidad: order.quantity,
          pagado: order.paid,
        }),
    );
  },

  async addPurchase(serviceId: string, purchase: Purchase) {
    await run(
      db()
        .from("compras")
        .insert({ id: purchase.id, servicio_id: serviceId, nombre: purchase.name, precio: purchase.price }),
    );
  },

  async deletePurchase(purchaseId: string) {
    await run(db().from("compras").delete().eq("id", purchaseId));
  },

  async deleteOrder(orderId: string) {
    await run(db().from("pedidos").delete().eq("id", orderId));
  },

  async setOrderPaid(orderId: string, paid: boolean) {
    await run(
      db()
        .from("pedidos")
        .update({ pagado: paid, pagado_en: paid ? new Date().toISOString() : null })
        .eq("id", orderId),
    );
  },

  async addLoan(loan: Loan) {
    await run(
      db().from("prestamos").insert({
        id: loan.id,
        prestamista: loan.lender,
        monto: loan.amount,
        fecha: loan.date,
        nota: loan.note,
        devuelto: loan.returned,
      }),
    );
  },

  async setLoanReturned(loanId: string, returned: boolean) {
    await run(db().from("prestamos").update({ devuelto: returned }).eq("id", loanId));
  },
};
