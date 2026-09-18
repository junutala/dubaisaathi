-- 0012 — the paper form's number, on the report that carries its pin (decision 029).
--
-- The rider's screen in apps/field shows a number, records the coordinates he is standing on and
-- a frontage photograph when he can take one. He copies that number onto the paper form with the
-- pen already in his hand. The answers to the five questions arrive on that paper, and the number
-- is what joins the two at the desk — nothing hand-written passes through a machine.
alter table field_reports add column if not exists form_serial text;

-- Review looks a report up by the number on the paper in its hand, so the lookup is the index.
create index if not exists field_reports_form_serial_idx
  on field_reports (form_serial)
  where form_serial is not null;

comment on column field_reports.form_serial is
  'Number the app gave the rider and he copied onto the paper form. Null for a full capture.';
