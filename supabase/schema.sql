-- =====================================================================
-- SazónControl · Base de datos (Supabase / PostgreSQL)
-- Negocio de almuerzos y cenas de Samuel y Luisa.
--
-- Cómo usarlo: en Supabase → SQL Editor → New query → pegar todo → Run.
-- Se puede volver a ejecutar sin perder datos (usa "if not exists").
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Servicios: cada almuerzo o cena de un día.
-- Viernes: almuerzo y cena · Sábado: cena · Domingo: cena si el lunes es festivo.
-- ---------------------------------------------------------------------
create table if not exists public.servicios (
  id          uuid primary key default gen_random_uuid(),
  fecha       date not null,
  turno       text not null check (turno in ('Almuerzo', 'Cena')),
  creado_en   timestamptz not null default now(),
  unique (fecha, turno)
);

-- ---------------------------------------------------------------------
-- Preparaciones: los platos del menú de cada servicio.
-- costo_unitario se usa solo si la preparación no tiene ingredientes.
-- ---------------------------------------------------------------------
create table if not exists public.preparaciones (
  id              uuid primary key default gen_random_uuid(),
  servicio_id     uuid not null references public.servicios (id) on delete cascade,
  nombre          text not null,
  cantidad        integer not null default 1 check (cantidad > 0),
  costo_unitario  numeric(12, 2) not null default 0 check (costo_unitario >= 0),
  precio          numeric(12, 2) not null default 0 check (precio >= 0),
  creado_en       timestamptz not null default now()
);
create index if not exists preparaciones_servicio_idx on public.preparaciones (servicio_id);

-- ---------------------------------------------------------------------
-- Ingredientes y gastos de cada preparación.
-- Costo = precio_compra / cantidad_comprada * cantidad_usada
-- ---------------------------------------------------------------------
create table if not exists public.ingredientes (
  id                 uuid primary key default gen_random_uuid(),
  preparacion_id     uuid not null references public.preparaciones (id) on delete cascade,
  nombre             text not null,
  unidad             text not null default 'unid',
  cantidad_comprada  numeric(12, 3) not null check (cantidad_comprada > 0),
  precio_compra      numeric(12, 2) not null default 0 check (precio_compra >= 0),
  cantidad_usada     numeric(12, 3) not null check (cantidad_usada >= 0),
  creado_en          timestamptz not null default now()
);
create index if not exists ingredientes_preparacion_idx on public.ingredientes (preparacion_id);

-- ---------------------------------------------------------------------
-- Pedidos: quién pidió, qué plato, cuántos y si ya pagó.
-- ---------------------------------------------------------------------
create table if not exists public.pedidos (
  id              uuid primary key default gen_random_uuid(),
  servicio_id     uuid not null references public.servicios (id) on delete cascade,
  preparacion_id  uuid references public.preparaciones (id) on delete set null,
  cliente         text not null,
  cantidad        integer not null default 1 check (cantidad > 0),
  pagado          boolean not null default false,
  pagado_en       timestamptz,
  creado_en       timestamptz not null default now()
);
create index if not exists pedidos_servicio_idx on public.pedidos (servicio_id);
create index if not exists pedidos_pendientes_idx on public.pedidos (pagado) where not pagado;

-- ---------------------------------------------------------------------
-- Préstamos: dinero que les prestan a Samuel y Luisa para el negocio.
-- ---------------------------------------------------------------------
create table if not exists public.prestamos (
  id          uuid primary key default gen_random_uuid(),
  prestamista text not null,
  monto       numeric(12, 2) not null check (monto > 0),
  fecha       date not null default current_date,
  nota        text not null default '',
  devuelto    boolean not null default false,
  creado_en   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Seguridad: solo usuarios con sesión iniciada (Samuel y Luisa) pueden
-- leer y escribir. Nadie más puede ver los datos con la llave pública.
-- ---------------------------------------------------------------------
alter table public.servicios     enable row level security;
alter table public.preparaciones enable row level security;
alter table public.ingredientes  enable row level security;
alter table public.pedidos       enable row level security;
alter table public.prestamos     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['servicios', 'preparaciones', 'ingredientes', 'pedidos', 'prestamos'] loop
    execute format('drop policy if exists "equipo_acceso_total" on public.%I', t);
    execute format(
      'create policy "equipo_acceso_total" on public.%I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;
