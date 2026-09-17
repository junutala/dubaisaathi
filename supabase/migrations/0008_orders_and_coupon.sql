-- Buying a pass: the order carries the code, and one function settles it (decision 019).
--
-- 0001 made the `orders` table and 0007 made coupons, and nothing joined them: a code that took
-- ₹299 down to ₹149 left no record of itself once UPI took the ₹149, so the cap on a code could
-- be walked past by paying the balance over and over. The column below closes that — an order
-- carries the code it was priced with, and settling the order burns the code.
--
-- `settle_order` is the paid sibling of `redeem_coupon`: the edge function signs the passes (the
-- key exists only there) and this makes the family, the passes, the binding of slot 1, the
-- redemption row and the order's own `paid` one atomic step, under a row lock on the order so
-- two deliveries of the same webhook cannot both issue a family.
--
-- Same rules as 0001 and 0007: no account, no contact details and NO IP ADDRESS COLUMN anywhere.
-- RLS stays on with no policies; only the edge functions, with the service role, touch these.

-- --------------------------------------------------------------------------------------------
-- The code an order was priced with
-- --------------------------------------------------------------------------------------------
-- `on delete set null` and not `restrict`: a code withdrawn from a batch must not make a paid
-- order unreadable. The money and the passes are the record; the code is how it was priced.

alter table orders add column coupon_code text references coupons (code) on delete set null;

comment on column orders.coupon_code is
  'The code this order was priced with, burned into coupon_redemptions when the order is paid.';

-- --------------------------------------------------------------------------------------------
-- settle_order — the paid path, in one transaction
-- --------------------------------------------------------------------------------------------
-- Raises with a one-word message the webhook turns into its own answer: unknown-order,
-- already-settled, slots.

create function settle_order(
  p_order_id uuid,
  p_family_id uuid,
  p_slots smallint,
  p_counter_off_at timestamptz,
  p_pass_ids uuid[],
  p_signatures text[]
) returns void
language plpgsql
as $$
declare
  o orders%rowtype;
  i integer;
begin
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'unknown-order'; end if;
  -- Razorpay retries a webhook it did not hear a 200 for, and a captured payment can arrive
  -- twice. A second settlement must never issue a second family.
  if o.status <> 'created' then raise exception 'already-settled'; end if;
  if p_slots <> o.slots then raise exception 'slots'; end if;
  if array_length(p_pass_ids, 1) <> p_slots or array_length(p_signatures, 1) <> p_slots then
    raise exception 'slots';
  end if;

  insert into families (id, slots, counter_off_at) values (p_family_id, p_slots, p_counter_off_at);

  for i in 1..p_slots loop
    insert into passes (id, family_id, slot, kind, status, counter_off_at, signature, device_id, bound_at)
    values (
      p_pass_ids[i], p_family_id, i, 'paid',
      case when i = 1 then 'bound'::pass_status else 'issued'::pass_status end,
      p_counter_off_at, p_signatures[i],
      case when i = 1 then o.device_id else null end,
      case when i = 1 then now() else null end
    );
  end loop;

  -- The code is burned here, so its cap counts a discounted purchase the same as a free one.
  -- A phone that had already quoted and redeemed this code keeps its one redemption row: the
  -- purchase still stands, and refusing it over a duplicate would take money and give nothing.
  if o.coupon_code is not null then
    begin
      insert into coupon_redemptions (code, device_id, family_id, slots)
      values (o.coupon_code, o.device_id, p_family_id, p_slots);
    exception when unique_violation then
      null;
    end;
  end if;

  update orders
    set status = 'paid', paid_at = now(), family_id = p_family_id
    where id = p_order_id;
end;
$$;

-- Callable only through the service role, like everything else here. `anon` and
-- `authenticated` are Supabase's roles; the block skips them on a plain Postgres so the test
-- file in supabase/tests runs there too.
revoke execute on function settle_order(uuid, uuid, smallint, timestamptz, uuid[], text[])
  from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function settle_order(uuid, uuid, smallint, timestamptz, uuid[], text[])
      from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke execute on function settle_order(uuid, uuid, smallint, timestamptz, uuid[], text[])
      from authenticated;
  end if;
end;
$$;
