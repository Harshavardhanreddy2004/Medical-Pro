-- 1. Create PRODUCTS table
create table public.products (
    id uuid primary key default gen_random_uuid(),
    sku text not null unique,
    name text not null,
    category text,
    brand text,
    batch_number text,
    manufacturing_date date,
    expiry_date date,
    unit text,
    purchase_price numeric(12, 2) not null default 0.00,
    selling_price numeric(12, 2) not null default 0.00,
    gst numeric(5, 2) not null default 0.00,
    description text,
    storage_location text,
    minimum_stock integer not null default 10,
    qr_uuid uuid not null unique default gen_random_uuid(),
    status text not null default 'ACTIVE',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    constraint chk_dates check (expiry_date is null or manufacturing_date is null or expiry_date >= manufacturing_date),
    constraint chk_min_stock check (minimum_stock >= 0)
);

-- Index for soft deletes and lookups
create index idx_products_sku on public.products(sku);
create index idx_products_qr_uuid on public.products(qr_uuid);
create index idx_products_deleted_at on public.products(deleted_at);

-- 2. Create INVENTORY table
create table public.inventory (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null unique references public.products(id) on delete cascade,
    current_stock integer not null default 0,
    reserved_stock integer not null default 0,
    available_stock integer not null default 0,
    updated_at timestamptz not null default now(),
    constraint chk_current_stock check (current_stock >= 0),
    constraint chk_reserved_stock check (reserved_stock >= 0),
    constraint chk_available_stock check (available_stock >= 0)
);

create index idx_inventory_product_id on public.inventory(product_id);

-- 3. Create INVENTORY_TRANSACTIONS table
create table public.inventory_transactions (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id) on delete restrict,
    transaction_type text not null check (transaction_type in ('STOCK_IN', 'STOCK_OUT')),
    quantity integer not null check (quantity > 0),
    before_stock integer not null default 0,
    after_stock integer not null default 0,
    notes text,
    operator text not null default 'System',
    created_at timestamptz not null default now()
);

create index idx_transactions_product_id on public.inventory_transactions(product_id);
create index idx_transactions_created_at on public.inventory_transactions(created_at);

-- 4. Create QR_CODES table
create table public.qr_codes (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null unique references public.products(id) on delete cascade,
    qr_uuid uuid not null unique,
    pdf_generated boolean not null default false,
    last_printed timestamptz,
    created_at timestamptz not null default now()
);

create index idx_qr_codes_qr_uuid on public.qr_codes(qr_uuid);

-- Trigger: Automatically initialize inventory and qr_codes on product creation
create or replace function public.fn_handle_new_product()
returns trigger as $$
begin
    -- Create inventory record
    insert into public.inventory (product_id, current_stock, reserved_stock, available_stock)
    values (new.id, 0, 0, 0);

    -- Create qr_code record
    insert into public.qr_codes (product_id, qr_uuid)
    values (new.id, new.qr_uuid);

    return new;
end;
$$ language plpgsql;

create trigger tr_after_product_insert
    after insert on public.products
    for each row
    execute function public.fn_handle_new_product();

-- Trigger: Maintain stock balance on transactions, set before_stock and after_stock
create or replace function public.fn_process_inventory_transaction()
returns trigger as $$
declare
    v_current_stock integer;
    v_reserved_stock integer;
    v_new_stock integer;
begin
    -- Lock inventory row for the product to prevent race conditions
    select current_stock, reserved_stock into v_current_stock, v_reserved_stock
    from public.inventory
    where product_id = new.product_id
    for update;

    if not found then
        raise exception 'Inventory record not found for product ID %', new.product_id;
    end if;

    -- Calculate stock levels
    if new.transaction_type = 'STOCK_IN' then
        v_new_stock := v_current_stock + new.quantity;
    elsif new.transaction_type = 'STOCK_OUT' then
        v_new_stock := v_current_stock - new.quantity;
        if v_new_stock < 0 then
            raise exception 'Insufficient stock. Current stock is %, requested stock out is %', v_current_stock, new.quantity;
        end if;
    else
        raise exception 'Invalid transaction type %', new.transaction_type;
    end if;

    -- Set before_stock and after_stock in the transaction record
    new.before_stock := v_current_stock;
    new.after_stock := v_new_stock;

    -- Update inventory
    update public.inventory
    set current_stock = v_new_stock,
        available_stock = v_new_stock - v_reserved_stock,
        updated_at = now()
    where product_id = new.product_id;

    return new;
end;
$$ language plpgsql;

create trigger tr_before_transaction_insert
    before insert on public.inventory_transactions
    for each row
    execute function public.fn_process_inventory_transaction();

-- Enable Row Level Security (RLS) but make all tables publicly readable/writable for MVP ease (skip auth entirely as requested)
alter table public.products enable row level security;
alter table public.inventory enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.qr_codes enable row level security;

create policy "Allow public read access on products" on public.products for select using (true);
create policy "Allow public insert access on products" on public.products for insert with check (true);
create policy "Allow public update access on products" on public.products for update using (true);
create policy "Allow public delete access on products" on public.products for delete using (true);

create policy "Allow public read access on inventory" on public.inventory for select using (true);
create policy "Allow public insert access on inventory" on public.inventory for insert with check (true);
create policy "Allow public update access on inventory" on public.inventory for update using (true);
create policy "Allow public delete access on inventory" on public.inventory for delete using (true);

create policy "Allow public read access on inventory_transactions" on public.inventory_transactions for select using (true);
create policy "Allow public insert access on inventory_transactions" on public.inventory_transactions for insert with check (true);
create policy "Allow public update access on inventory_transactions" on public.inventory_transactions for update using (true);
create policy "Allow public delete access on inventory_transactions" on public.inventory_transactions for delete using (true);

create policy "Allow public read access on qr_codes" on public.qr_codes for select using (true);
create policy "Allow public insert access on qr_codes" on public.qr_codes for insert with check (true);
create policy "Allow public update access on qr_codes" on public.qr_codes for update using (true);
create policy "Allow public delete access on qr_codes" on public.qr_codes for delete using (true);
