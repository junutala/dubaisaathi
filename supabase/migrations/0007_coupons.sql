-- Coupons: a discount on the one purchase flow, never a second way in (decision 018).
--
-- A code is typed into घर.4 (or arrives on the URL from an advertisement) and takes a
-- percentage — or a flat price — off the pass the traveller was already choosing. A code that
-- brings the price to ₹0 issues the pass on the spot through the `redeem` edge function; one
-- that leaves a balance shows the balance and waits for UPI to open. A redeemed code is a paid
-- pass in every way that matters: same tables, same signature, same "never gated again".
--
-- Same rules as 0001: no account, no contact details and NO IP ADDRESS COLUMN anywhere. RLS is
-- on with no policies; only the edge functions, with the service role, touch these tables.

-- --------------------------------------------------------------------------------------------
-- coupons — one row per code
-- --------------------------------------------------------------------------------------------

create table coupons (
  -- Uppercase, prefix + dash + six characters from an alphabet without 0/O/1/I: `SS-7K3M2X`,
  -- `OP-4HXR9B`. 0009 took the dash out — a hyphen is a keyboard flip on a phone — and rewrote
  -- these rows; read this shape as the one that shipped first, not the one in the table now.
  -- The prefix is a HUMAN CONVENTION and nothing reads it: the app and the
  -- function read `kind`. `npm run coupons` sets both consistently — `SS-` for family, `OP-`
  -- for single — so a code read out over the phone says what it is.
  code text primary key check (code ~ '^[A-Z]{2}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$'),
  -- `family` lets the traveller pick 1–4 phones on the one code; `single` locks it to one.
  kind text not null check (kind in ('family', 'single')),
  discount_percent smallint not null default 0 check (discount_percent between 0 and 100),
  -- A flat price in rupees that wins over the percentage when set. 0 is a free pass.
  price_override_inr integer check (price_override_inr >= 0),
  max_redemptions integer not null check (max_redemptions > 0),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  -- The advertisement or the operator the batch was made for: "Meta launch", "Ravi's counter".
  batch text not null,
  created_at timestamptz not null default now(),
  note text,
  constraint coupon_window_makes_sense check (valid_until is null or valid_until > valid_from)
);

comment on table coupons is
  'One row per code. Prefix is convention; the app reads kind. No account, no IP.';

-- --------------------------------------------------------------------------------------------
-- coupon_redemptions — who took which code, and what it issued
-- --------------------------------------------------------------------------------------------

create table coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  code text not null references coupons (code) on delete restrict,
  device_id uuid not null references devices (id) on delete restrict,
  -- Set when the code issued a pass (₹0). A partial code that only quoted a balance issues
  -- nothing and writes no row here; the balance is settled by an order when UPI opens.
  family_id uuid references families (id) on delete set null,
  slots smallint not null check (slots between 1 and 4),
  redeemed_at timestamptz not null default now(),
  -- One phone cannot take the same code twice. This is the guard the function relies on.
  constraint one_redemption_per_device_per_code unique (code, device_id)
);

create index coupon_redemptions_by_code on coupon_redemptions (code, redeemed_at desc);

-- --------------------------------------------------------------------------------------------
-- coupon_uptake — what the owner reads in the dashboard
-- --------------------------------------------------------------------------------------------
-- `security_invoker` so the view runs with the reader's rights and not its owner's: without it
-- a view is a way around RLS on the tables beneath it.

create view coupon_uptake with (security_invoker = true) as
select
  c.code,
  c.batch,
  c.kind,
  c.discount_percent as discount,
  c.price_override_inr,
  c.max_redemptions,
  count(r.id)::integer as redeemed,
  count(distinct r.device_id)::integer as devices,
  coalesce(sum(r.slots), 0)::integer as slots_issued,
  max(r.redeemed_at) as last_redeemed_at,
  c.valid_from,
  c.valid_until,
  case
    when now() < c.valid_from then 'not yet'
    when c.valid_until is not null and now() >= c.valid_until then 'ended'
    when count(r.id) >= c.max_redemptions then 'exhausted'
    else 'live'
  end as status
from coupons c
left join coupon_redemptions r on r.code = c.code
group by c.code;

comment on view coupon_uptake is
  'Per code: batch, kind, discount, cap, taken, phones, slots issued, last use, window, status.';

-- --------------------------------------------------------------------------------------------
-- redeem_coupon — the ₹0 path, in one transaction
-- --------------------------------------------------------------------------------------------
-- The edge function computes the price, generates the ids and signs the passes (the key exists
-- only there); this function is what makes the family, the passes, the binding of slot 1 and
-- the redemption row one atomic step. It re-checks the window and the cap under a row lock so
-- two phones redeeming the last use of a code at the same moment cannot both get it, and the
-- unique constraint above catches the same phone twice.
--
-- Raises with a one-word message the function turns into a `reason`: unknown, not-yet, ended,
-- exhausted, already-redeemed, slots, single.

create function redeem_coupon(
  p_code text,
  p_device_id uuid,
  p_family_id uuid,
  p_slots smallint,
  p_counter_off_at timestamptz,
  p_pass_ids uuid[],
  p_signatures text[]
) returns void
language plpgsql
as $$
declare
  c coupons%rowtype;
  taken integer;
  i integer;
begin
  select * into c from coupons where code = p_code for update;
  if not found then raise exception 'unknown'; end if;
  if now() < c.valid_from then raise exception 'not-yet'; end if;
  if c.valid_until is not null and now() >= c.valid_until then raise exception 'ended'; end if;
  if p_slots < 1 or p_slots > 4 then raise exception 'slots'; end if;
  if c.kind = 'single' and p_slots <> 1 then raise exception 'single'; end if;
  if array_length(p_pass_ids, 1) <> p_slots or array_length(p_signatures, 1) <> p_slots then
    raise exception 'slots';
  end if;

  select count(*) into taken from coupon_redemptions where code = p_code;
  if taken >= c.max_redemptions then raise exception 'exhausted'; end if;
  if exists (select 1 from coupon_redemptions where code = p_code and device_id = p_device_id)
  then raise exception 'already-redeemed'; end if;

  insert into families (id, slots, counter_off_at) values (p_family_id, p_slots, p_counter_off_at);

  for i in 1..p_slots loop
    insert into passes (id, family_id, slot, kind, status, counter_off_at, signature, device_id, bound_at)
    values (
      p_pass_ids[i], p_family_id, i, 'paid',
      case when i = 1 then 'bound'::pass_status else 'issued'::pass_status end,
      p_counter_off_at, p_signatures[i],
      case when i = 1 then p_device_id else null end,
      case when i = 1 then now() else null end
    );
  end loop;

  insert into coupon_redemptions (code, device_id, family_id, slots)
  values (p_code, p_device_id, p_family_id, p_slots);
end;
$$;

-- Callable only through the service role, like everything else here. `anon` and
-- `authenticated` are Supabase's roles; the block skips them on a plain Postgres so the test
-- file in supabase/tests runs there too.
revoke execute on function redeem_coupon(text, uuid, uuid, smallint, timestamptz, uuid[], text[])
  from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function redeem_coupon(text, uuid, uuid, smallint, timestamptz, uuid[], text[])
      from anon;
    revoke all on coupon_uptake from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke execute on function redeem_coupon(text, uuid, uuid, smallint, timestamptz, uuid[], text[])
      from authenticated;
    revoke all on coupon_uptake from authenticated;
  end if;
end;
$$;

-- --------------------------------------------------------------------------------------------
-- No access to anyone, by default (see 0001 for why this is not an oversight)
-- --------------------------------------------------------------------------------------------

alter table coupons enable row level security;
alter table coupon_redemptions enable row level security;
