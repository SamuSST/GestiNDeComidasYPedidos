import { FormEvent, useEffect, useMemo, useState } from "react";

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

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  buyQty: number;
  buyPrice: number;
  usedQty: number;
};

type MenuItem = {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  price: number;
  ingredients?: Ingredient[];
};

type Order = {
  id: string;
  customer: string;
  itemId: string;
  quantity: number;
  paid: boolean;
};

type Service = {
  id: string;
  date: string;
  shift: "Almuerzo" | "Cena";
  items: MenuItem[];
  orders: Order[];
};

type Loan = {
  id: string;
  lender: string;
  amount: number;
  date: string;
  note: string;
  returned: boolean;
};

type Tab = "inicio" | "servicios" | "pagos" | "prestamos";

const INITIAL_SERVICES: Service[] = [
  {
    id: "s1",
    date: "2025-06-13",
    shift: "Almuerzo",
    items: [
      { id: "m1", name: "Pollo al horno", quantity: 18, unitCost: 11500, price: 22000 },
      { id: "m2", name: "Lasaña de carne", quantity: 10, unitCost: 14000, price: 26000 },
    ],
    orders: [
      { id: "o1", customer: "Ana María", itemId: "m1", quantity: 2, paid: true },
      { id: "o2", customer: "Carlos Ríos", itemId: "m2", quantity: 1, paid: false },
      { id: "o3", customer: "Laura Pérez", itemId: "m1", quantity: 1, paid: true },
      { id: "o4", customer: "Mateo Silva", itemId: "m2", quantity: 2, paid: false },
    ],
  },
  {
    id: "s2",
    date: "2025-06-13",
    shift: "Cena",
    items: [
      {
        id: "m3",
        name: "Hamburguesa artesanal",
        quantity: 22,
        unitCost: 9000,
        price: 19000,
        ingredients: [
          { id: "i1", name: "Pan de hamburguesa", unit: "unid", buyQty: 12, buyPrice: 9600, usedQty: 22 },
          { id: "i2", name: "Carne molida", unit: "g", buyQty: 1000, buyPrice: 28000, usedQty: 2640 },
          { id: "i3", name: "Queso tajado", unit: "tajadas", buyQty: 30, buyPrice: 21000, usedQty: 22 },
          { id: "i4", name: "Tocineta", unit: "g", buyQty: 500, buyPrice: 14000, usedQty: 660 },
          { id: "i5", name: "Tomate", unit: "g", buyQty: 1000, buyPrice: 4000, usedQty: 800 },
          { id: "i6", name: "Lechuga", unit: "unid", buyQty: 1, buyPrice: 3000, usedQty: 2 },
          { id: "i7", name: "Papas a la francesa", unit: "g", buyQty: 2500, buyPrice: 15000, usedQty: 3300 },
          { id: "i8", name: "Salsas", unit: "kit", buyQty: 1, buyPrice: 12000, usedQty: 1 },
          { id: "i9", name: "Empaques", unit: "unid", buyQty: 50, buyPrice: 25000, usedQty: 22 },
        ],
      },
      { id: "m4", name: "Wrap vegetariano", quantity: 8, unitCost: 7500, price: 17000 },
    ],
    orders: [
      { id: "o5", customer: "Sofía Acosta", itemId: "m3", quantity: 2, paid: false },
      { id: "o6", customer: "Daniel Gómez", itemId: "m4", quantity: 1, paid: true },
      { id: "o7", customer: "Valentina Ruiz", itemId: "m3", quantity: 1, paid: false },
    ],
  },
  {
    id: "s3",
    date: "2025-06-14",
    shift: "Cena",
    items: [
      { id: "m5", name: "Costillas BBQ", quantity: 20, unitCost: 16000, price: 30000 },
      { id: "m6", name: "Bowl mediterráneo", quantity: 7, unitCost: 10000, price: 21000 },
    ],
    orders: [
      { id: "o8", customer: "Andrés Mora", itemId: "m5", quantity: 2, paid: false },
      { id: "o9", customer: "Juliana León", itemId: "m6", quantity: 1, paid: false },
    ],
  },
];

const INITIAL_LOANS: Loan[] = [
  {
    id: "l1",
    lender: "Marta",
    amount: 350000,
    date: "2025-05-28",
    note: "Compra inicial de insumos",
    returned: false,
  },
];

const money = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

const uid = () => Math.random().toString(36).slice(2, 10);

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

function serviceTotals(service: Service) {
  const cost = Math.round(
    service.items.reduce((sum, item) => sum + item.quantity * itemUnitCost(item), 0),
  );
  const sales = service.orders.reduce((sum, order) => {
    const item = service.items.find((entry) => entry.id === order.itemId);
    return sum + (item?.price || 0) * order.quantity;
  }, 0);
  const collected = service.orders.reduce((sum, order) => {
    const item = service.items.find((entry) => entry.id === order.itemId);
    return sum + (order.paid ? (item?.price || 0) * order.quantity : 0);
  }, 0);
  return { cost, sales, collected, profit: sales - cost };
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
  const [tab, setTab] = useState<Tab>("inicio");
  const [services, setServices] = useState<Service[]>(() =>
    readStorage("sazon-services", INITIAL_SERVICES),
  );
  const [loans, setLoans] = useState<Loan[]>(() => readStorage("sazon-loans", INITIAL_LOANS));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [recipeItemId, setRecipeItemId] = useState<string | null>(null);

  useEffect(() => localStorage.setItem("sazon-services", JSON.stringify(services)), [services]);
  useEffect(() => localStorage.setItem("sazon-loans", JSON.stringify(loans)), [loans]);

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
          Datos guardados en este dispositivo
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
          <button className="avatar" aria-label="Perfil">
            MC
          </button>
        </header>

        <div className="content">
          {tab === "inicio" && (
            <>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">Resumen general</p>
                  <h1>Hola, María</h1>
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
                          onClick={() =>
                            setLoans((all) =>
                              all.map((l) => (l.id === loan.id ? { ...l, returned: true } : l)),
                            )
                          }
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
            setServices((all) => [...all, service]);
            setShowServiceForm(false);
            setTab("servicios");
          }}
        />
      )}
      {showLoanForm && (
        <LoanForm
          onClose={() => setShowLoanForm(false)}
          onSave={(loan) => {
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
            setServices((all) =>
              all.map((s) => (s.id === selected.id ? { ...s, orders: [...s.orders, order] } : s)),
            );
          }}
        />
      )}
      {showMenuForm && selected && (
        <MenuForm
          onClose={() => setShowMenuForm(false)}
          onSave={(item) => {
            setServices((all) =>
              all.map((s) => (s.id === selected.id ? { ...s, items: [...s.items, item] } : s)),
            );
            setShowMenuForm(false);
            setRecipeItemId(item.id);
          }}
        />
      )}
      {recipeItemId && selected && selected.items.some((i) => i.id === recipeItemId) && (
        <RecipeModal
          item={selected.items.find((i) => i.id === recipeItemId)!}
          onClose={() => setRecipeItemId(null)}
          onChange={(item) =>
            setServices((all) =>
              all.map((s) =>
                s.id === selected.id
                  ? { ...s, items: s.items.map((i) => (i.id === item.id ? item : i)) }
                  : s,
              ),
            )
          }
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
  onAddOrder,
  onAddMenu,
  onOpenRecipe,
}: {
  service: Service;
  onBack: () => void;
  onTogglePayment: (id: string) => void;
  onAddOrder: () => void;
  onAddMenu: () => void;
  onOpenRecipe: (id: string) => void;
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
            <Icon name="plus" size={17} /> Preparación
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
          detail={`${service.items.length} opciones de menú`}
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
              <span>Cantidad</span>
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
            <span>Costos</span>
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
                    <span className="mini-initial">{order.customer.charAt(0)}</span>
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
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [shift, setShift] = useState<"Almuerzo" | "Cena">("Cena");
  const [holiday, setHoliday] = useState(false);
  const day = new Date(`${date}T12:00:00`).getDay();
  const valid =
    day === 5 || (day === 6 && shift === "Cena") || (day === 0 && shift === "Cena" && holiday);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid) onSave({ id: uid(), date, shift, items: [], orders: [] });
  };
  return (
    <Modal
      title="Crear servicio"
      subtitle="Programa una jornada para comenzar a registrar tu menú."
      onClose={onClose}
    >
      <form onSubmit={submit} className="form">
        <label>
          Fecha
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label>
          Horario
          <select value={shift} onChange={(e) => setShift(e.target.value as "Almuerzo" | "Cena")}>
            <option>Cena</option>
            <option>Almuerzo</option>
          </select>
        </label>
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
        {!valid && (
          <div className="form-warning">
            La fecha o el horario no coincide con tus días de servicio.
          </div>
        )}
        <div className="form-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" disabled={!valid}>
            Crear servicio
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
  const [addedNames, setAddedNames] = useState<string[]>([]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const cleanName = customer.trim();
    if (!cleanName || !service.items[0]) return;
    onAdd({
      id: uid(),
      customer: cleanName,
      itemId: service.items[0].id,
      quantity: 1,
      paid: false,
    });
    setAddedNames((names) => [...names, cleanName]);
    setCustomer("");
  };
  return (
    <Modal
      title="Agregar personas"
      subtitle="Cada nombre crea un pedido de un plato y queda pendiente de pago."
      onClose={onClose}
    >
      <form onSubmit={submit} className="form quick-order-form">
        <label className="full">
          Nombre de la persona
          <input
            autoFocus
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="Ej. Catalina López"
            required
          />
        </label>
        {!!service.items[0] && (
          <div className="order-product full">
            <span>Pedido asignado</span>
            <strong>{service.items[0].name}</strong>
            <b>{money(service.items[0].price)}</b>
          </div>
        )}
        {!service.items.length && (
          <div className="form-warning">Primero debes agregar una preparación al menú.</div>
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
        <button
          className="primary full quick-add-button"
          disabled={!service.items.length || !customer.trim()}
        >
          <Icon name="plus" size={17} /> Agregar persona
        </button>
        <div className="form-actions quick-order-actions">
          <small>También puedes presionar Enter para agregar</small>
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
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [price, setPrice] = useState(0);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({ id: uid(), name, quantity, unitCost, price });
  };
  return (
    <Modal
      title="Agregar preparación"
      subtitle="Registra cuántos platos prepararás y su precio. Luego puedes agregar los ingredientes para calcular el costo exacto."
      onClose={onClose}
    >
      <form onSubmit={submit} className="form">
        <label className="full">
          Nombre de la preparación
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Pollo en salsa"
            required
          />
        </label>
        <label>
          Cantidad a preparar
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
          />
        </label>
        <label>
          Costo por plato (opcional)
          <input
            type="number"
            min="0"
            value={unitCost}
            onChange={(e) => setUnitCost(Number(e.target.value))}
            required
          />
        </label>
        <label>
          Precio de venta
          <input
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            required
          />
        </label>
        <div className="form-actions full">
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary">Agregar al menú</button>
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
            Platos que salen
            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => update({ quantity: Math.max(1, Number(e.target.value)) })}
            />
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
