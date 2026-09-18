-- 0012 — the paper form's number, on the report that carries its pin (decision 029).
--
-- The rider's screen in apps/field records a serial, a frontage photograph and the coordinates
-- he is standing on. The answers to the five questions arrive on paper, and the serial is what
-- joins the two at review. Printed on the form, typed by our own collector — nothing
-- hand-written passes through a machine.
alter table field_reports add column if not exists form_serial text;

-- Review looks a report up by the number on the paper in its hand, so the lookup is the index.
create index if not exists field_reports_form_serial_idx
  on field_reports (form_serial)
  where form_serial is not null;

comment on column field_reports.form_serial is
  'Serial printed on the paper form this pin belongs to. Null for a full capture.';
