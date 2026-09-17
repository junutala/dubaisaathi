-- A coupon code loses its dash: eight characters, letters and digits, nothing else.
--
-- A code is typed by a person standing in an airport, bag in the other hand, on a phone
-- keyboard whose letters and whose punctuation are two different keyboards. `SS-7K3M2X` made
-- them leave the letters for the `?123` page to find one hyphen and come back — three taps for
-- a character that carries no information. The prefix is two letters and the body is six, and
-- the eye finds that break by itself.
--
-- So the shape becomes `SSW9VASX` / `OP4HXR9B`, and the codes already in the table are rewritten
-- rather than retired: an advertisement that has gone out carries the dashed spelling, and
-- `normaliseCouponCode` strips every non-alphanumeric before it asks, so the old printing and
-- the new one land on the same row.
--
-- The two foreign keys that point at `coupons (code)` get `on update cascade` first, because the
-- parent key is the thing being rewritten and a redemption or an order must follow it rather
-- than block it. Same rules as 0001, 0007 and 0008: no account, no contact details and NO IP
-- ADDRESS COLUMN anywhere; RLS stays on with no policies.

-- --------------------------------------------------------------------------------------------
-- The children follow the parent
-- --------------------------------------------------------------------------------------------

alter table coupon_redemptions drop constraint coupon_redemptions_code_fkey;
alter table coupon_redemptions add constraint coupon_redemptions_code_fkey
  foreign key (code) references coupons (code) on update cascade on delete restrict;

alter table orders drop constraint orders_coupon_code_fkey;
alter table orders add constraint orders_coupon_code_fkey
  foreign key (coupon_code) references coupons (code) on update cascade on delete set null;

-- --------------------------------------------------------------------------------------------
-- The new shape, and the rows rewritten into it
-- --------------------------------------------------------------------------------------------
-- The check comes off before the update and goes back on after, so the rewrite has a moment in
-- which both spellings are legal and nothing else ever does.

alter table coupons drop constraint coupons_code_check;

update coupons set code = replace(code, '-', '');

alter table coupons add constraint coupons_code_check
  check (code ~ '^[A-Z]{2}[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$');

comment on table coupons is
  'One row per code: two letters, six characters, no separator. Prefix is convention; the app reads kind. No account, no IP.';
