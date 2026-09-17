-- The first two letters of a code decide what it is, and the database now insists on it.
--
-- `SS` is a promotion: one code in an advertisement, taken by many travellers, each of whom may
-- put it on one to four phones. `OP` is a tour operator: one code given to a group, taken by
-- many travellers, each of whom gets exactly one phone — the operator bought a seat per person,
-- not a family pack per person.
--
-- The app and the functions have always read `kind` rather than the letters, which is right: a
-- string is not a rule. But nothing made the two agree, and on 17 September a code was made by
-- hand as `SSGDDM4Q` with fifty redemptions and `kind = 'family'` while it was meant to be an
-- operator's. It behaved perfectly and sold two phones to one traveller, because that is what
-- the row said. The row was the mistake, and a row that can be wrong will be.
--
-- So the two are welded together here. `npm run coupons` already sets both from `--kind`; this
-- is what stops anything else — a hand-written insert at the end of a long day, most of all —
-- from producing a code whose letters lie about what it does.

alter table coupons add constraint coupon_prefix_matches_kind check (
  (left(code, 2) = 'SS' and kind = 'family') or (left(code, 2) = 'OP' and kind = 'single')
);

comment on constraint coupon_prefix_matches_kind on coupons is
  'SS is a promotion (1-4 phones per traveller); OP is a tour operator (one phone each).';
