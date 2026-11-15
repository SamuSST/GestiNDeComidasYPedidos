import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Ingredient, Loan, MenuItem, Order, Purchase, Service } from "./types";
import { api, cloudEnabled, loadAll, supabase } from "./db";

type IconName =
  | "home"
  | "calendar"
  | "wallet"
  | "loan"
  | "plus"
  | "arrow"
  | "users"
  | "chef"
  | "trend"
  | "clock"
  | "check"
  | "x"
  | "utensils"
  | "card"
  | "bank";

type Tab = "inicio" | "servicios" | "pagos" | "prestamos";

const INITIAL_SERVICES: Service[] = [];
const INITIAL_LOANS: Loan[] = [];

const money = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
        (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16),
      );

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    wallet: (
      <>
        <path d="M4 6h14a2 2 0 0 1 2 2v11H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12" />
        <path d="M16 11h5v5h-5a2.5 2.5 0 0 1 0-5Z" />
      </>
    ),
    loan: (
      <>
        <path d="M4 7h16M6 7v10M10 7v10M14 7v10M18 7v10M3 20h18M12 3l9 4H3l9-4Z" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: (
      <>
        <path d="m9 18 6-6-6-6" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    chef: (
      <>
        <path d="M6 13h12l-1 8H7l-1-8Z" />
        <path d="M6 13a4 4 0 0 1 1-7.87A5 5 0 0 1 16.8 6 3.5 3.5 0 0 1 18 13" />
        <path d="M9 17h6" />
      </>
    ),
    trend: (
      <>
        <path d="m3 17 6-6 4 4 8-9" />
        <path d="M15 6h6v6" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    x: <path d="m6 6 12 12M18 6 6 18" />,
    utensils: (
      <>
        <path d="M7 3v7M4 3v4a3 3 0 0 0 6 0V3M7 10v11M16 3v18M16 3c3 2 4 5 4 8h-4" />
      </>
    ),
    card: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18M7 15h3" />
      </>
    ),
    bank: (
      <>
        <path d="M4 10h16M6 10v8M10 10v8M14 10v8M18 10v8M3 21h18M12 3l9 4H3l9-4Z" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

const ingredientCost = (ing: Ingredient) =>
  ing.buyQty > 0 ? Math.round((ing.buyPrice / ing.buyQty) * ing.usedQty) : 0;

const recipeCost = (item: MenuItem) =>
  (item.ingredients || []).reduce((sum, ing) => sum + ingredientCost(ing), 0);

/** Si la preparación tiene ingredientes, el costo por plato sale de ellos. */
function itemUnitCost(item: MenuItem) {
  if (item.ingredients?.length) return item.quantity ? recipeCost(item) / item.quantity : 0;
  return item.unitCost;
}

/** Parte de las ventas que se separa para comprar lo de la preparación. */
const PURCHASE_BUDGET_PERCENT = 45;

function serviceTotals(service: Service) {
  const purchases = service.purchases || [];
  const purchased = purchases.reduce((sum, p) => sum + p.price, 0);
  // Si anotaron compras, ese es el costo real; si no, se estima con los ingredientes.
  const cost = purchases.length
    ? purchased
    : Math.round(service.items.reduce((sum, item) => sum + item.quantity * itemUnitCost(item), 0));
  const sales = service.orders.reduce((sum, order) => {
    const item = service.items.find((entry) => entry.id === order.itemId);
    return sum + (item?.price || 0) * order.quantity;
  }, 0);
  const collected = service.orders.reduce((sum, order) => {
    const item = service.items.find((entry) => entry.id === order.itemId);
    return sum + (order.paid ? (item?.price || 0) * order.quantity : 0);
  }, 0);
  const budget = Math.round((sales * PURCHASE_BUDGET_PERCENT) / 100);
  return {
    cost,
    sales,
    collected,
    profit: sales - cost,
    purchased,
    budget,
    budgetLeft: budget - purchased,
  };
}

function dateLabel(date: string) {
  const value = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(value);
}

function shortDate(date: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export default function App() {
  // Con Supabase configurado se pide iniciar sesión; si no, todo queda en este navegador.
  const [session, setSession] = useState<"loading" | "out" | "in">(
    cloudEnabled ? "loading" : "in",
  );

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session ? "in" : "out"));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s ? "in" : "out"));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === "loading") return <LoadingScreen text="Conectando…" />;
  if (session === "out") return <LoginScreen />;
  return <Dashboard />;
}

function Dashboard() {
  const [tab, setTab] = useState<Tab>("inicio");
  const [services, setServices] = useState<Service[]>(() =>
    cloudEnabled ? [] : readStorage("sazon-v2-services", INITIAL_SERVICES),
  );
  const [loans, setLoans] = useState<Loan[]>(() =>
    cloudEnabled ? [] : readStorage("sazon-v2-loans", INITIAL_LOANS),
  );
  const [loading, setLoading] = useState(cloudEnabled);
  const [syncError, setSyncError] = useState<string | null>(null);

  const reload = () =>
    loadAll()
      .then((data) => {
        setServices(data.services);
        setLoans(data.loans);
        setSyncError(null);
      })
      .catch((e: Error) => setSyncError(`No se pudieron cargar los datos: ${e.message}`))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (cloudEnabled) reload();
  }, []);

  /** Guarda en Supabase; si falla, avisa y recarga lo que hay en la base. */
  const persist = (action: () => Promise<void>) => {
    if (!cloudEnabled) return;
    action().catch((e: Error) => {
      setSyncError(`No se guardó el último cambio: ${e.message}`);
      reload();
    });
  };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [recipeItemId, setRecipeItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!cloudEnabled) localStorage.setItem("sazon-v2-services", JSON.stringify(services));
  }, [services]);
  useEffect(() => {
    if (!cloudEnabled) localStorage.setItem("sazon-v2-loans", JSON.stringify(loans));
  }, [loans]);

  const allTotals = useMemo(
    () =>
      services.reduce(
        (result, service) => {
          const values = serviceTotals(service);
          result.sales += values.sales;
          result.cost += values.cost;
          result.collected += values.collected;
          return result;
        },
        { sales: 0, cost: 0, collected: 0 },
      ),
    [services],
  );
  const selected = services.find((service) => service.id === selectedId);
  const pendingOrders = services.flatMap((service) =>
    service.orders
      .filter((order) => !order.paid)
      .map((order) => ({
        service,
        order,
        item: service.items.find((item) => item.id === order.itemId),
      })),
  );
  const pendingAmount = allTotals.sales - allTotals.collected;
  const profit = allTotals.sales - allTotals.cost;
  const margin = allTotals.sales ? Math.round((profit / allTotals.sales) * 100) : 0;

  const updatePayment = (serviceId: string, orderId: string) => {
    const order = services
      .find((s) => s.id === serviceId)
      ?.orders.find((o) => o.id === orderId);
    if (order) persist(() => api.setOrderPaid(orderId, !order.paid));
    setServices((current) =>
      current.map((service) =>
        service.id === serviceId
          ? {
              ...service,
              orders: service.orders.map((order) =>
                order.id === orderId ? { ...order, paid: !order.paid } : order,
              ),
            }
          : service,
      ),
    );
  };

  const nav = [
    { id: "inicio" as Tab, label: "Inicio", icon: "home" as IconName },
    { id: "servicios" as Tab, label: "Servicios", icon: "calendar" as IconName },
    { id: "pagos" as Tab, label: "Pagos", icon: "wallet" as IconName, count: pendingOrders.length },
    { id: "prestamos" as Tab, label: "Préstamos", icon: "loan" as IconName },
  ];

  const goToService = (id: string) => {
    setSelectedId(id);
    setTab("servicios");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setTab("inicio")}>
          <span className="brand-mark">
            <Icon name="utensils" size={21} />
          </span>
          <span>
            Sazón<span>Control</span>
          </span>
        </button>
        <nav className="side-nav">
          {nav.map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? "active" : ""}
              onClick={() => {
                setTab(item.id);
                setSelectedId(null);
              }}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {!!item.count && <b>{item.count}</b>}
            </button>
          ))}
        </nav>
        <div className="service-note">
          <span>
            <Icon name="clock" size={17} />
          </span>
          <div>
            <strong>Días de servicio</strong>
            <p>
              Viernes · Almuerzo y cena
              <br />
              Sábado · Cena
              <br />
              Domingo festivo · Cena
            </p>
          </div>
        </div>
        <div className="local-note">
          <span className="status-dot" />
          {cloudEnabled ? "Datos en la nube · compartidos" : "Datos guardados en este dispositivo"}
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark">
              <Icon name="utensils" size={18} />
            </span>
            <b>SazónControl</b>
          </div>
          <div className="top-date">
            {new Intl.DateTimeFormat("es-CO", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date())}
          </div>
          <button
            className="avatar"
            aria-label={cloudEnabled ? "Cerrar sesión" : "Perfil"}
            title={cloudEnabled ? "Cerrar sesión" : undefined}
            onClick={() => {
              if (supabase && confirmSignOut()) supabase.auth.signOut();
            }}
          >
            SL
          </button>
        </header>

        <div className="content">
          {syncError && (
            <div className="sync-error" role="alert">
              <span>{syncError}</span>
              <button onClick={() => setSyncError(null)} aria-label="Cerrar aviso">
                <Icon name="x" size={14} />
              </button>
            </div>
          )}
          {loading && <p className="loading-note">Cargando datos…</p>}
          {tab === "inicio" && (
            <>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">Resumen general</p>
                  <h1>Hola, Samuel y Luisa</h1>
                  <p>Tu negocio, claro y bajo control.</p>
                </div>
                <button className="primary" onClick={() => setShowServiceForm(true)}>
                  <Icon name="plus" size={18} /> Nuevo servicio
                </button>
              </section>

              <section className="metric-grid">
                <Metric
                  icon="card"
                  label="Ventas registradas"
                  value={money(allTotals.sales)}
                  detail={`${services.reduce((n, s) => n + s.orders.length, 0)} pedidos en total`}
                  tone="green"
                />
                <Metric
                  icon="chef"
                  label="Costo de preparación"
                  value={money(allTotals.cost)}
                  detail={`${services.reduce((n, s) => n + s.items.reduce((a, i) => a + i.quantity, 0), 0)} preparaciones`}
                  tone="cream"
                />
                <Metric
                  icon="trend"
                  label="Ganancia estimada"
                  value={money(profit)}
                  detail={`${margin}% de margen sobre ventas`}
                  tone="mint"
                />
                <Metric
                  icon="clock"
                  label="Pendiente por cobrar"
                  value={money(pendingAmount)}
                  detail={`${pendingOrders.length} clientes por pagar`}
                  tone="orange"
                />
              </section>

              <section className="dashboard-grid">
                <div className="panel">
                  <div className="panel-title">
                    <div>
                      <p className="eyebrow">Agenda</p>
                      <h2>Próximos servicios</h2>
                    </div>
                    <button className="text-button" onClick={() => setTab("servicios")}>
                      Ver todos <Icon name="arrow" size={16} />
                    </button>
                  </div>
                  <div className="service-list">
                    {services.slice(0, 3).map((service, index) => {
                      const totals = serviceTotals(service);
                      return (
                        <button
                          className="service-row"
                          key={service.id}
                          onClick={() => goToService(service.id)}
                        >
                          <div className={`date-block ${index === 0 ? "featured" : ""}`}>
                            <span>
                              {new Date(`${service.date}T12:00:00`).toLocaleDateString("es-CO", {
                                month: "short",
                              })}
                            </span>
                            <strong>{new Date(`${service.date}T12:00:00`).getDate()}</strong>
                          </div>
                          <div className="service-info">
                            <strong>{dateLabel(service.date)}</strong>
                            <span>
                              {service.shift} · {service.items.map((item) => item.name).join(" y ")}
                            </span>
                          </div>
                          <div className="service-stats">
                            <strong>{service.orders.reduce((n, o) => n + o.quantity, 0)}</strong>
                            <span>platos pedidos</span>
                          </div>
                          <div className="service-sales">
                            <strong>{money(totals.sales)}</strong>
                            <span>en ventas</span>
                          </div>
                          <Icon name="arrow" size={18} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="panel payment-summary">
                  <div className="panel-title">
                    <div>
                      <p className="eyebrow">Cobros</p>
                      <h2>Estado de pagos</h2>
                    </div>
                    <button className="icon-button" onClick={() => setTab("pagos")}>
                      <Icon name="arrow" size={18} />
                    </button>
                  </div>
                  <div className="donut-wrap">
                    <div
                      className="donut"
                      style={
                        {
                          "--paid": `${allTotals.sales ? (allTotals.collected / allTotals.sales) * 360 : 0}deg`,
                        } as React.CSSProperties
                      }
                    >
                      <div>
                        <strong>
                          {allTotals.sales
                            ? Math.round((allTotals.collected / allTotals.sales) * 100)
                            : 0}
                          %
                        </strong>
                        <span>cobrado</span>
                      </div>
                    </div>
                    <div className="legend">
                      <p>
                        <i className="paid" />
                        <span>Cobrado</span>
                        <strong>{money(allTotals.collected)}</strong>
                      </p>
                      <p>
                        <i className="pending" />
                        <span>Pendiente</span>
                        <strong>{money(pendingAmount)}</strong>
                      </p>
                    </div>
                  </div>
                  <button className="secondary wide" onClick={() => setTab("pagos")}>
                    Revisar pagos pendientes
                  </button>
                </div>
              </section>
            </>
          )}

          {tab === "servicios" && !selected && (
            <>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">Producción y pedidos</p>
                  <h1>Servicios</h1>
                  <p>Administra cada jornada, sus preparaciones y clientes.</p>
                </div>
                <button className="primary" onClick={() => setShowServiceForm(true)}>
                  <Icon name="plus" size={18} /> Nuevo servicio
                </button>
              </section>
              <div className="services-cards">
                {services.map((service) => {
                  const totals = serviceTotals(service);
                  const pending = service.orders.filter((order) => !order.paid).length;
                  return (
                    <button
                      className="service-card"
                      key={service.id}
                      onClick={() => setSelectedId(service.id)}
                    >
                      <div className="service-card-top">
                        <span className="shift">
                          <Icon name={service.shift === "Cena" ? "clock" : "utensils"} size={15} />{" "}
                          {service.shift}
                        </span>
                        <Icon name="arrow" />
                      </div>
                      <h3>{dateLabel(service.date)}</h3>
                      <p>
                        {service.items.map((item) => item.name).join(" · ") ||
                          "Sin menú registrado"}
                      </p>
                      <div className="card-numbers">
                        <div>
                          <span>Preparaciones</span>
                          <strong>{service.items.reduce((n, i) => n + i.quantity, 0)}</strong>
                        </div>
                        <div>
                          <span>Pedidos</span>
                          <strong>{service.orders.length}</strong>
                        </div>
                        <div>
                          <span>Ventas</span>
                          <strong>{money(totals.sales)}</strong>
                        </div>
                      </div>
                      <div className={pending ? "pending-pill" : "paid-pill"}>
                        {pending ? `${pending} pagos pendientes` : "Todos pagaron"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {tab === "servicios" && selected && (
            <ServiceDetail
              service={selected}
              onBack={() => setSelectedId(null)}
              onTogglePayment={(id) => updatePayment(selected.id, id)}
              onAddPurchase={(purchase) => {
                persist(() => api.addPurchase(selected.id, purchase));
                setServices((all) =>
                  all.map((s) =>
                    s.id === selected.id
                      ? { ...s, purchases: [...(s.purchases || []), purchase] }
                      : s,
                  ),
                );
              }}
              onRemovePurchase={(id) => {
                persist(() => api.deletePurchase(id));
                setServices((all) =>
                  all.map((s) =>
                    s.id === selected.id
                      ? { ...s, purchases: (s.purchases || []).filter((p) => p.id !== id) }
                      : s,
                  ),
                );
              }}
              onRemoveOrder={(id) => {
                const order = selected.orders.find((o) => o.id === id);
                if (!order || !window.confirm(`¿Quitar a ${order.customer} de este servicio?`)) return;
                const prev = selected.items.find((i) => i.id === order.itemId);
                const next = prev && { ...prev, quantity: Math.max(0, prev.quantity - order.quantity) };
                persist(async () => {
                  await api.deleteOrder(id);
                  if (prev && next) await api.syncItem(selected.id, prev, next);
                });
                setServices((all) =>
                  all.map((s) =>
                    s.id === selected.id
                      ? {
                          ...s,
                          orders: s.orders.filter((o) => o.id !== id),
                          items: s.items.map((i) => (next && i.id === next.id ? next : i)),
                        }
                      : s,
                  ),
                );
              }}
              onAddOrder={() => setShowOrderForm(true)}
              onAddMenu={() => setShowMenuForm(true)}
              onOpenRecipe={(id) => setRecipeItemId(id)}
            />
          )}

          {tab === "pagos" && (
            <>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">Cuentas por cobrar</p>
                  <h1>Pagos</h1>
                  <p>Marca a cada cliente cuando recibas su pago.</p>
                </div>
                <div className="heading-stat">
                  <span>Pendiente total</span>
                  <strong>{money(pendingAmount)}</strong>
                </div>
              </section>
              <div className="panel payment-panel">
                <div className="filter-row">
                  <span className="filter active">
                    Pendientes <b>{pendingOrders.length}</b>
                  </span>
                  <span className="filter">Todos los pedidos</span>
                </div>
                {pendingOrders.length ? (
                  <div className="payment-list">
                    {pendingOrders.map(({ service, order, item }) => (
                      <div className="payment-row" key={order.id}>
                        <span className="customer-initial">{order.customer.charAt(0)}</span>
                        <div className="payment-person">
                          <strong>{order.customer}</strong>
                          <span>
                            {dateLabel(service.date)} · {service.shift}
                          </span>
                        </div>
                        <div className="payment-item">
                          <span>{item?.name}</span>
                          <small>
                            {order.quantity} {order.quantity === 1 ? "plato" : "platos"}
                          </small>
                        </div>
                        <strong className="payment-value">
                          {money((item?.price || 0) * order.quantity)}
                        </strong>
                        <button
                          className="pay-button"
                          onClick={() => updatePayment(service.id, order.id)}
                        >
                          <Icon name="check" size={16} /> Marcar pagado
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Todo está al día"
                    text="No tienes pagos pendientes por cobrar."
                  />
                )}
              </div>
            </>
          )}

          {tab === "prestamos" && (
            <>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">Dinero recibido</p>
                  <h1>Préstamos</h1>
                  <p>Controla el dinero que te han prestado y debes devolver.</p>
                </div>
                <button className="primary" onClick={() => setShowLoanForm(true)}>
                  <Icon name="plus" size={18} /> Registrar préstamo
                </button>
              </section>
              <section className="loan-summary">
                <div>
                  <span className="summary-icon">
                    <Icon name="bank" />
                  </span>
                  <div>
                    <span>Deuda pendiente</span>
                    <strong>
                      {money(loans.filter((l) => !l.returned).reduce((n, l) => n + l.amount, 0))}
                    </strong>
                  </div>
                </div>
                <div>
                  <span>Préstamos activos</span>
                  <strong>{loans.filter((l) => !l.returned).length}</strong>
                </div>
                <div>
                  <span>Total devuelto</span>
                  <strong>
                    {money(loans.filter((l) => l.returned).reduce((n, l) => n + l.amount, 0))}
                  </strong>
                </div>
              </section>
              <div className="panel">
                <div className="panel-title">
                  <div>
                    <p className="eyebrow">Historial</p>
                    <h2>Préstamos registrados</h2>
                  </div>
                </div>
                {loans.length ? (
                  <div className="loan-list">
                    {loans.map((loan) => (
                      <div className="loan-row" key={loan.id}>
                        <span className="customer-initial">{loan.lender.charAt(0)}</span>
                        <div>
                          <strong>{loan.lender}</strong>
                          <span>
                            {loan.note || "Sin nota"} · {shortDate(loan.date)}
                          </span>
                        </div>
                        <strong>{money(loan.amount)}</strong>
                        <span className={loan.returned ? "paid-pill" : "pending-pill"}>
                          {loan.returned ? "Devuelto" : "Pendiente"}
                        </span>
                        <button
                          className="secondary"
                          disabled={loan.returned}
                          onClick={() => {
                            persist(() => api.setLoanReturned(loan.id, true));
                            setLoans((all) =>
                              all.map((l) => (l.id === loan.id ? { ...l, returned: true } : l)),
                            );
                          }}
                        >
                          {loan.returned ? "Completado" : "Marcar devuelto"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Sin préstamos"
                    text="Cuando recibas un préstamo, regístralo aquí."
                  />
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <nav className="mobile-nav">
        {nav.map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? "active" : ""}
            onClick={() => {
              setTab(item.id);
              setSelectedId(null);
            }}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {showServiceForm && (
        <ServiceForm
          onClose={() => setShowServiceForm(false)}
          onSave={(service) => {
            persist(async () => {
              await api.addService(service);
              for (const item of service.items) await api.addItem(service.id, item);
            });
            setServices((all) =>
              [...all, service].sort((a, b) => a.date.localeCompare(b.date)),
            );
            setShowServiceForm(false);
            setSelectedId(service.id);
            setTab("servicios");
            setShowOrderForm(true);
          }}
        />
      )}
      {showLoanForm && (
        <LoanForm
          onClose={() => setShowLoanForm(false)}
          onSave={(loan) => {
            persist(() => api.addLoan(loan));
            setLoans((all) => [loan, ...all]);
            setShowLoanForm(false);
          }}
        />
      )}
      {showOrderForm && selected && (
        <OrderForm
          service={selected}
          onClose={() => setShowOrderForm(false)}
          onAdd={(order) => {
            const prev = selected.items.find((i) => i.id === order.itemId);
            const next = prev && { ...prev, quantity: prev.quantity + order.quantity };
            persist(async () => {
              await api.addOrder(selected.id, order);
              if (prev && next) await api.syncItem(selected.id, prev, next);
            });
            setServices((all) =>
              all.map((s) =>
                s.id === selected.id
                  ? {
                      ...s,
                      orders: [...s.orders, order],
                      items: s.items.map((i) => (next && i.id === next.id ? next : i)),
                    }
                  : s,
              ),
            );
          }}
        />
      )}
      {showMenuForm && selected && (
        <MenuForm
          onClose={() => setShowMenuForm(false)}
          onSave={(item) => {
            persist(() => api.addItem(selected.id, item));
            setServices((all) =>
              all.map((s) => (s.id === selected.id ? { ...s, items: [...s.items, item] } : s)),
            );
            setShowMenuForm(false);
          }}
        />
      )}
      {recipeItemId && selected && selected.items.some((i) => i.id === recipeItemId) && (
        <RecipeModal
          item={selected.items.find((i) => i.id === recipeItemId)!}
          onClose={() => setRecipeItemId(null)}
          onChange={(item) => {
            const prev = selected.items.find((i) => i.id === item.id);
            if (prev) persist(() => api.syncItem(selected.id, prev, item));
            setServices((all) =>
              all.map((s) =>
                s.id === selected.id
                  ? { ...s, items: s.items.map((i) => (i.id === item.id ? item : i)) }
                  : s,
              ),
            );
          }}
        />
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: IconName;
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <div className={`metric ${tone}`}>
      <span className="metric-icon">
        <Icon name={icon} />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <span>
        <Icon name="check" size={24} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function ServiceDetail({
  service,
  onBack,
  onTogglePayment,
  onRemoveOrder,
  onAddOrder,
  onAddMenu,
  onOpenRecipe,
  onAddPurchase,
  onRemovePurchase,
}: {
  service: Service;
  onBack: () => void;
  onTogglePayment: (id: string) => void;
  onRemoveOrder: (id: string) => void;
  onAddOrder: () => void;
  onAddMenu: () => void;
  onOpenRecipe: (id: string) => void;
  onAddPurchase: (purchase: Purchase) => void;
  onRemovePurchase: (id: string) => void;
}) {
  const totals = serviceTotals(service);
  const margin = totals.sales ? Math.round((totals.profit / totals.sales) * 100) : 0;
  return (
    <>
      <button className="back-button" onClick={onBack}>
        ← Volver a servicios
      </button>
      <section className="page-heading detail-heading">
        <div>
          <span className="shift">{service.shift}</span>
          <h1>{dateLabel(service.date)}</h1>
          <p>
            {service.items.map((item) => item.name).join(" · ") ||
              "Agrega la primera preparación al menú"}
          </p>
        </div>
        <div className="button-group">
          <button className="secondary" onClick={onAddMenu}>
            <Icon name="plus" size={17} /> Otra comida
          </button>
          <button className="primary" onClick={onAddOrder}>
            <Icon name="plus" size={17} /> Agregar personas
          </button>
        </div>
      </section>
      <section className="metric-grid detail-metrics">
        <Metric
          icon="chef"
          label="Preparaciones"
          value={String(service.items.reduce((n, i) => n + i.quantity, 0))}
          detail={service.items.length === 1 ? "1 comida en el menú" : `${service.items.length} comidas en el menú`}
          tone="cream"
        />
        <Metric
          icon="users"
          label="Personas que pidieron"
          value={String(service.orders.length)}
          detail={`${service.orders.reduce((n, o) => n + o.quantity, 0)} platos pedidos`}
          tone="green"
        />
        <Metric
          icon="trend"
          label="Ganancia estimada"
          value={money(totals.profit)}
          detail={`${margin}% de margen`}
          tone="mint"
        />
        <Metric
          icon="wallet"
          label="Por cobrar"
          value={money(totals.sales - totals.collected)}
          detail={`${service.orders.filter((o) => !o.paid).length} pagos pendientes`}
          tone="orange"
        />
      </section>
      <section className="detail-grid">
        <div className="panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">Producción</p>
              <h2>Preparaciones del menú</h2>
            </div>
          </div>
          <div className="menu-table">
            <div className="table-head">
              <span>Preparación</span>
              <span>Platos</span>
              <span>Costo unit.</span>
              <span>Precio</span>
            </div>
            {service.items.map((item) => (
              <div className="table-row" key={item.id}>
                <div className="prep-cell">
                  <strong>{item.name}</strong>
                  <button className="recipe-link" onClick={() => onOpenRecipe(item.id)}>
                    <Icon name="chef" size={13} />
                    {item.ingredients?.length
                      ? `${item.ingredients.length} ingredientes · ${money(itemUnitCost(item))} c/u`
                      : "Agregar ingredientes"}
                  </button>
                </div>
                <span>{item.quantity}</span>
                <span>{money(itemUnitCost(item))}</span>
                <strong>{money(item.price)}</strong>
              </div>
            ))}
          </div>
          {!service.items.length && (
            <EmptyState title="Menú vacío" text="Agrega tus preparaciones y sus costos." />
          )}
        </div>
        <div className="panel profit-card">
          <p className="eyebrow">Rentabilidad</p>
          <h2>Balance del servicio</h2>
          <div className="balance-line">
            <span>Ventas</span>
            <strong>{money(totals.sales)}</strong>
          </div>
          <div className="balance-line">
            <span>{service.purchases?.length ? "Compras" : "Costos estimados"}</span>
            <strong>− {money(totals.cost)}</strong>
          </div>
          <div className="balance-total">
            <span>Ganancia</span>
            <strong>{money(totals.profit)}</strong>
          </div>
          <div className="margin-bar">
            <span style={{ width: `${Math.max(0, Math.min(margin, 100))}%` }} />
          </div>
          <small>
            Tu margen sobre ventas es del <b>{margin}%</b>.
          </small>
        </div>
      </section>
      <PurchasesPanel
        service={service}
        totals={totals}
        onAdd={onAddPurchase}
        onRemove={onRemovePurchase}
      />
      <div className="panel orders-panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">Clientes</p>
            <h2>Pedidos y pagos</h2>
          </div>
          <span className="pending-pill">
            {service.orders.filter((o) => !o.paid).length} pendientes
          </span>
        </div>
        {service.orders.length ? (
          <div className="order-table">
            <div className="table-head">
              <span>Cliente</span>
              <span>Pedido</span>
              <span>Total</span>
              <span>Estado</span>
            </div>
            {service.orders.map((order) => {
              const item = service.items.find((entry) => entry.id === order.itemId);
              return (
                <div className="table-row" key={order.id}>
                  <div className="name-cell">
                    <button
                      className="mini-initial remove-order"
                      title={`Quitar a ${order.customer}`}
                      aria-label={`Quitar a ${order.customer}`}
                      onClick={() => onRemoveOrder(order.id)}
                    >
                      <span>{order.customer.charAt(0)}</span>
                      <Icon name="x" size={12} />
                    </button>
                    <strong>{order.customer}</strong>
                  </div>
                  <span>
                    {order.quantity} × {item?.name}
                  </span>
                  <strong>{money((item?.price || 0) * order.quantity)}</strong>
                  <button
                    className={
                      order.paid ? "paid-pill status-button" : "pending-pill status-button"
                    }
                    onClick={() => onTogglePayment(order.id)}
                  >
                    {order.paid ? (
                      <>
                        <Icon name="check" size={14} /> Pagado
                      </>
                    ) : (
                      "Marcar pagado"
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Aún no hay pedidos"
            text="Agrega el nombre de cada persona que pidió."
          />
        )}
      </div>
    </>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="close" onClick={onClose}>
          <Icon name="x" />
        </button>
        <p className="eyebrow">Nuevo registro</p>
        <h2>{title}</h2>
        <p className="modal-subtitle">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

function ServiceForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (service: Service) => void;
}) {
  const [date, setDate] = useState(localToday());
  const day = new Date(`${date}T12:00:00`).getDay();
  const [shift, setShift] = useState<"Almuerzo" | "Cena">(day === 5 ? "Almuerzo" : "Cena");
  const [holiday, setHoliday] = useState(false);
  const [dish, setDish] = useState("");
  const [price, setPrice] = useState("");
  const validDay =
    day === 5 || (day === 6 && shift === "Cena") || (day === 0 && shift === "Cena" && holiday);
  const valid = validDay && dish.trim() && Number(price) > 0;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSave({
      id: uid(),
      date,
      shift,
      items: [{ id: uid(), name: dish.trim(), quantity: 0, unitCost: 0, price: Number(price) }],
      orders: [],
    });
  };
  return (
    <Modal
      title={shift === "Cena" ? "Nueva cena" : "Nuevo almuerzo"}
      subtitle="Escribe qué comida es y cuánto vale el plato. Después agregas a las personas."
      onClose={onClose}
    >
      <form onSubmit={submit} className="form">
        <label>
          Fecha
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <div className="shift-toggle">
          <span>Horario</span>
          <div>
            {(["Almuerzo", "Cena"] as const).map((option) => (
              <button
                type="button"
                key={option}
                className={shift === option ? "active" : ""}
                onClick={() => setShift(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        {day === 0 && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={holiday}
              onChange={(e) => setHoliday(e.target.checked)}
            />
            <span>El lunes siguiente es festivo</span>
          </label>
        )}
        <label className="full">
          ¿Qué comida es?
          <input
            autoFocus
            value={dish}
            onChange={(e) => setDish(e.target.value)}
            placeholder="Ej. Hamburguesa artesanal"
            required
          />
        </label>
        <label className="full">
          Precio de cada plato
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Ej. 19000"
            required
          />
        </label>
        {!validDay && (
          <div className="form-warning">
            Ese día no hay {shift.toLowerCase()}: viernes almuerzo y cena, sábado cena, domingo
            cena solo si el lunes es festivo.
          </div>
        )}
        <div className="form-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" disabled={!valid}>
            Crear y agregar personas
          </button>
        </div>
      </form>
    </Modal>
  );
}

function OrderForm({
  service,
  onClose,
  onAdd,
}: {
  service: Service;
  onClose: () => void;
  onAdd: (order: Order) => void;
}) {
  const [customer, setCustomer] = useState("");
  const [itemId, setItemId] = useState(service.items[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [addedNames, setAddedNames] = useState<string[]>([]);
  const item = service.items.find((i) => i.id === itemId);
  const plates = service.items.reduce((n, i) => n + i.quantity, 0);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const cleanName = customer.trim();
    if (!cleanName || !item) return;
    onAdd({ id: uid(), customer: cleanName, itemId: item.id, quantity, paid: false });
    setAddedNames((names) => [...names, quantity > 1 ? `${cleanName} ×${quantity}` : cleanName]);
    setCustomer("");
    setQuantity(1);
  };
  return (
    <Modal
      title="Agregar personas"
      subtitle="Escribe el nombre y presiona Enter. Cada persona suma a las preparaciones y queda pendiente de pago."
      onClose={onClose}
    >
      <form onSubmit={submit} className="form quick-order-form">
        <div className="plates-counter full">
          <span>Preparaciones de este servicio</span>
          <strong>{plates}</strong>
        </div>
        <label className="full">
          Nombre de la persona
          <input
            autoFocus
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="Ej. Catalina López"
          />
        </label>
        {service.items.length > 1 && (
          <div className="dish-picker full">
            {service.items.map((i) => (
              <button
                type="button"
                key={i.id}
                className={i.id === itemId ? "active" : ""}
                onClick={() => setItemId(i.id)}
              >
                <strong>{i.name}</strong>
                <span>{money(i.price)}</span>
              </button>
            ))}
          </div>
        )}
        <div className="order-product full">
          <div>
            <span>{item ? item.name : "Sin comida"}</span>
            <b>{money((item?.price || 0) * quantity)}</b>
          </div>
          <div className="qty-stepper">
            <button
              type="button"
              aria-label="Menos platos"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <strong>{quantity}</strong>
            <button type="button" aria-label="Más platos" onClick={() => setQuantity((q) => q + 1)}>
              <Icon name="plus" size={14} />
            </button>
          </div>
        </div>
        {!service.items.length && (
          <div className="form-warning">Primero agrega la comida de este servicio.</div>
        )}
        {!!addedNames.length && (
          <div className="added-people full">
            <span>
              <Icon name="check" size={15} />
              {addedNames.length === 1
                ? "1 persona agregada"
                : `${addedNames.length} personas agregadas`}
            </span>
            <div>
              {addedNames.map((name, index) => (
                <small key={`${name}-${index}`}>{name}</small>
              ))}
            </div>
          </div>
        )}
        <button className="primary full quick-add-button" disabled={!item || !customer.trim()}>
          <Icon name="plus" size={17} /> Agregar persona
        </button>
        <div className="form-actions quick-order-actions">
          <small>Luego marcas en la lista quién ya pagó</small>
          <button type="button" className="secondary" onClick={onClose}>
            Listo
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MenuForm({ onClose, onSave }: { onClose: () => void; onSave: (item: MenuItem) => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !(Number(price) > 0)) return;
    onSave({ id: uid(), name: name.trim(), quantity: 0, unitCost: 0, price: Number(price) });
  };
  return (
    <Modal
      title="Agregar otra comida"
      subtitle="Para cuando en el mismo servicio vendes más de una comida."
      onClose={onClose}
    >
      <form onSubmit={submit} className="form">
        <label className="full">
          ¿Qué comida es?
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Pollo en salsa"
            required
          />
        </label>
        <label className="full">
          Precio de cada plato
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </label>
        <div className="form-actions full">
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary">Agregar comida</button>
        </div>
      </form>
    </Modal>
  );
}

function LoanForm({ onClose, onSave }: { onClose: () => void; onSave: (loan: Loan) => void }) {
  const [lender, setLender] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({ id: uid(), lender, amount, date, note, returned: false });
  };
  return (
    <Modal
      title="Registrar préstamo"
      subtitle="Anota el dinero que recibiste y quién te lo prestó."
      onClose={onClose}
    >
      <form onSubmit={submit} className="form">
        <label>
          ¿Quién te prestó?
          <input
            value={lender}
            onChange={(e) => setLender(e.target.value)}
            placeholder="Nombre de la persona"
            required
          />
        </label>
        <label>
          Monto
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            required
          />
        </label>
        <label>
          Fecha
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label>
          Nota
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Motivo del préstamo"
          />
        </label>
        <div className="form-actions full">
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary">Guardar préstamo</button>
        </div>
      </form>
    </Modal>
  );
}

function RecipeModal({
  item,
  onClose,
  onChange,
}: {
  item: MenuItem;
  onClose: () => void;
  onChange: (item: MenuItem) => void;
}) {
  const ingredients = item.ingredients || [];
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("g");
  const [buyQty, setBuyQty] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [usedQty, setUsedQty] = useState("");

  const total = recipeCost(item);
  const perPlate = itemUnitCost(item);
  const profitPerPlate = item.price - perPlate;
  const margin = item.price ? Math.round((profitPerPlate / item.price) * 100) : 0;
  const preview = ingredientCost({
    id: "",
    name,
    unit,
    buyQty: Number(buyQty),
    buyPrice: Number(buyPrice),
    usedQty: Number(usedQty),
  });

  const update = (patch: Partial<MenuItem>) => onChange({ ...item, ...patch });

  const addIngredient = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !Number(buyQty) || !Number(usedQty)) return;
    update({
      ingredients: [
        ...ingredients,
        {
          id: uid(),
          name: name.trim(),
          unit: unit.trim() || "unid",
          buyQty: Number(buyQty),
          buyPrice: Number(buyPrice),
          usedQty: Number(usedQty),
        },
      ],
    });
    setName("");
    setBuyQty("");
    setBuyPrice("");
    setUsedQty("");
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal recipe-modal">
        <button className="close" onClick={onClose}>
          <Icon name="x" />
        </button>
        <p className="eyebrow">Costo de la preparación</p>
        <h2>{item.name}</h2>
        <p className="modal-subtitle">
          Anota lo que compraste y cuánto usaste. La app calcula el costo de cada plato.
        </p>

        <div className="recipe-basics">
          <label>
            Platos pedidos
            <input type="number" value={item.quantity} readOnly title="Sube solo al agregar personas" />
          </label>
          <label>
            Precio de venta
            <input
              type="number"
              min="0"
              value={item.price}
              onChange={(e) => update({ price: Number(e.target.value) })}
            />
          </label>
        </div>

        <div className="recipe-summary">
          <div>
            <span>Costo total</span>
            <strong>{money(total)}</strong>
          </div>
          <div>
            <span>Costo por plato</span>
            <strong>{money(perPlate)}</strong>
          </div>
          <div>
            <span>Ganancia por plato</span>
            <strong className={profitPerPlate < 0 ? "negative" : ""}>
              {money(profitPerPlate)} <small>({margin}%)</small>
            </strong>
          </div>
        </div>

        <div className="ingredient-list">
          {ingredients.length ? (
            ingredients.map((ing) => (
              <div className="ingredient-row" key={ing.id}>
                <div>
                  <strong>{ing.name}</strong>
                  <span>
                    Usé {ing.usedQty.toLocaleString("es-CO")} {ing.unit} · compré{" "}
                    {ing.buyQty.toLocaleString("es-CO")} {ing.unit} por {money(ing.buyPrice)}
                  </span>
                </div>
                <b>{money(ingredientCost(ing))}</b>
                <button
                  className="remove-ingredient"
                  aria-label={`Quitar ${ing.name}`}
                  onClick={() => update({ ingredients: ingredients.filter((i) => i.id !== ing.id) })}
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))
          ) : (
            <p className="ingredient-empty">
              Aún no hay ingredientes. Agrega el primero abajo (pan, carne, queso, empaques…).
            </p>
          )}
        </div>

        <form className="form ingredient-form" onSubmit={addIngredient}>
          <label className="full">
            Ingrediente o gasto
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Pan de hamburguesa"
            />
          </label>
          <label>
            Unidad
            <input
              list="units"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="g, unid, ml…"
            />
            <datalist id="units">
              <option value="g" />
              <option value="kg" />
              <option value="ml" />
              <option value="l" />
              <option value="unid" />
              <option value="tajadas" />
              <option value="paquete" />
            </datalist>
          </label>
          <label>
            Cantidad que compré
            <input
              type="number"
              min="0"
              step="any"
              value={buyQty}
              onChange={(e) => setBuyQty(e.target.value)}
              placeholder="Ej. 12"
            />
          </label>
          <label>
            Lo que pagué
            <input
              type="number"
              min="0"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              placeholder="Ej. 9600"
            />
          </label>
          <label>
            Cantidad que usé
            <input
              type="number"
              min="0"
              step="any"
              value={usedQty}
              onChange={(e) => setUsedQty(e.target.value)}
              placeholder="Ej. 22"
            />
          </label>
          <div className="ingredient-preview full">
            <span>Costo de este ingrediente</span>
            <strong>{money(preview)}</strong>
          </div>
          <div className="form-actions full">
            <button type="button" className="secondary" onClick={onClose}>
              Listo
            </button>
            <button className="primary" disabled={!name.trim() || !Number(buyQty) || !Number(usedQty)}>
              <Icon name="plus" size={16} /> Agregar ingrediente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function confirmSignOut() {
  return window.confirm("¿Cerrar sesión en este dispositivo?");
}

function LoadingScreen({ text }: { text: string }) {
  return (
    <div className="auth-screen">
      <p className="loading-note">{text}</p>
    </div>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError("Correo o contraseña incorrectos.");
    setBusy(false);
  };

  return (
    <div className="auth-screen">
      <form className="auth-card form" onSubmit={submit}>
        <span className="brand-mark auth-mark">
          <Icon name="utensils" size={22} />
        </span>
        <div className="full">
          <h1>SazónControl</h1>
          <p className="modal-subtitle">Ingresa con tu cuenta para ver los pedidos del negocio.</p>
        </div>
        <label className="full">
          Correo
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="full">
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <div className="form-warning">{error}</div>}
        <button className="primary full" disabled={busy}>
          {busy ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}

function PurchasesPanel({
  service,
  totals,
  onAdd,
  onRemove,
}: {
  service: Service;
  totals: ReturnType<typeof serviceTotals>;
  onAdd: (purchase: Purchase) => void;
  onRemove: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const purchases = service.purchases || [];
  const over = totals.budgetLeft < 0;
  const used = totals.budget ? Math.min(100, (totals.purchased / totals.budget) * 100) : 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !(Number(price) > 0)) return;
    onAdd({ id: uid(), name: name.trim(), price: Number(price) });
    setName("");
    setPrice("");
  };

  return (
    <div className="panel purchases-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Lo que nos costó</p>
          <h2>Compras para la preparación</h2>
        </div>
      </div>

      <div className="budget-grid">
        <div>
          <span>Para compras ({PURCHASE_BUDGET_PERCENT}% de lo vendido)</span>
          <strong>{money(totals.budget)}</strong>
        </div>
        <div>
          <span>Gastamos</span>
          <strong>{money(totals.purchased)}</strong>
        </div>
        <div className={over ? "over" : "left"}>
          <span>{over ? "Nos pasamos" : "Nos queda"}</span>
          <strong>{money(Math.abs(totals.budgetLeft))}</strong>
        </div>
      </div>
      <div className={`budget-bar${over ? " over" : ""}`}>
        <span style={{ width: `${used}%` }} />
      </div>
      <p className="budget-note">
        {totals.sales
          ? over
            ? `Las compras superan el ${PURCHASE_BUDGET_PERCENT}% de lo vendido.`
            : `Van ${Math.round(used)}% del dinero para compras.`
          : "Cuando agreguen personas, aquí verán cuánto hay para compras."}{" "}
        Ganancia después de compras: <b>{money(totals.sales - totals.purchased)}</b>
      </p>

      {purchases.length > 0 && (
        <div className="ingredient-list purchase-list">
          {purchases.map((p) => (
            <div className="ingredient-row" key={p.id}>
              <div>
                <strong>{p.name}</strong>
              </div>
              <b>{money(p.price)}</b>
              <button
                className="remove-ingredient"
                aria-label={`Quitar ${p.name}`}
                onClick={() => onRemove(p.id)}
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <form className="purchase-form" onSubmit={submit}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="¿Qué compraron? Ej. Carne molida"
          aria-label="Qué compraron"
        />
        <input
          type="number"
          inputMode="numeric"
          min="1"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Precio"
          aria-label="Precio"
        />
        <button className="primary" disabled={!name.trim() || !(Number(price) > 0)}>
          <Icon name="plus" size={16} /> Agregar
        </button>
      </form>
    </div>
  );
}
