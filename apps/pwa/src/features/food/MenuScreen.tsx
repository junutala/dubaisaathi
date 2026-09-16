import { useEffect } from 'react';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import type { StringKey } from '../../i18n/index.js';
import { outletById } from './outlets.js';

/**
 * 1.4 — the menu, as a grid. Not a photograph: the collector's app reads the menu card with OCR
 * and the collector confirms each dish and its price (owner, 16 September). What a traveller sees
 * is that list, in their own script, with the price beside it.
 */
export function MenuScreen({ outletId }: { readonly outletId: string }) {
  const { t, locale } = useSettings();
  const outlet = outletById(outletId);

  useEffect(() => {
    if (!outlet) navigate({ screen: 'food' });
  }, [outlet]);
  if (!outlet) return null;

  const name = locale === 'hi' ? outlet.name.hi : outlet.name.en;
  const items = outlet.confirmedDishes ?? [];

  return (
    <>
      <ScreenHeader pillar="food" trail={`${name} › ${t('food.menuTitle')}`} />
      <div className="flow">
        {items.length === 0 ? (
          <p className="trouble">{t('food.menuNone')}</p>
        ) : (
          <>
            <p className="lbl">{t('food.menuItems', { count: items.length })}</p>
            <div className="menu-grid">
              {items.map((item) => (
                <div key={item.name.en} className="menu-item">
                  <span className="menu-item-name">
                    {locale === 'hi' ? item.name.hi : item.name.en}
                  </span>
                  {item.priceAed !== undefined && (
                    <span className="menu-item-price">AED {item.priceAed}</span>
                  )}
                  {item.tags.length > 0 && (
                    <span className="menu-item-tags">
                      {item.tags.map((tag) => t(`food.tag.${tag}` as StringKey)).join(' · ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="muted small center">{t('food.menuNote')}</p>
          </>
        )}
      </div>
    </>
  );
}
