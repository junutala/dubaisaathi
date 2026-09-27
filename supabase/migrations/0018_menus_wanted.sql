-- Menus wanted (the owner, 27 September): "in the collector app I have no way of identifying the
-- price list with the sequence number … I only need those outlets that have NO MENU in our app".
--
-- The collectors' app lists every pinned form that has no menu: no menu page uploaded on it, and
-- no menu in the app from anywhere else (a Drive file, a QR menu read at review). Pages taken from
-- that list land on the form itself, so there is nothing to name and nothing to match by hand.
--
-- `menu_in_app_at` is set at review when a form's menu is published from somewhere other than its
-- own uploaded pages. `menu_wanted` puts a form back on the list with what is still missing, for a
-- menu that turned out incomplete. Written by review only; RLS is on with no policies, as ever.

alter table field_reports
  add column if not exists menu_in_app_at timestamptz,
  add column if not exists menu_wanted text;

comment on column field_reports.menu_in_app_at is
  'When this form''s menu reached the app from outside its own uploaded pages (Drive, a QR menu).';
comment on column field_reports.menu_wanted is
  'What review still needs from this form''s menu; puts it back on the collectors'' list.';
