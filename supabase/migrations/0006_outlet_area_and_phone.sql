-- 0006 · The neighbourhood and the number on the board.
--
-- खाना's row says where a kitchen is ("करामा · 650 मी") and its card has a call button, and
-- neither had a column a collector could fill. The area is the id from the shared list when the
-- collector tapped one, else the name as written; the phone is the outlet's own number, whether
-- or not they deliver — delivery_phone stays for the number they said to order on.

alter table field_reports
  add column area text,
  add column phone text;

comment on column field_reports.area is 'Neighbourhood: an id from the shared AREAS list, or free text.';
comment on column field_reports.phone is 'The outlet''s own number, as on the board.';
