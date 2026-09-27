-- A form put back on the menus-wanted list leaves it by itself once pages arrive (the owner,
-- 27 September: 0052 was photographed in full and would otherwise have stayed on the list until
-- review cleared it by hand). `menu_wanted_pages` is how many menu pages the form held when review
-- asked for more; the form is listed only while it holds no more than that.

alter table field_reports add column if not exists menu_wanted_pages smallint;

comment on column field_reports.menu_wanted_pages is
  'Menu pages the form held when menu_wanted was set; it leaves the list once it holds more.';

update field_reports r
set menu_wanted_pages = (
  select count(*) from field_photos p where p.report_id = r.id and p.kind = 'menu'
)
where r.menu_wanted is not null and r.menu_wanted_pages is null;
