import { useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import {
  PURCHASE_IS_LIVE,
  entitlement,
  pretendLanded,
  stopPretending,
  validity,
  type Entitlement,
} from './entitlement.js';

/** ₹199 plus ₹100 per extra phone, 14 days from landing (decision 006). */
const TIERS = [
  { phones: 1, inr: 199 },
  { phones: 2, inr: 299 },
  { phones: 3, inr: 399 },
  { phones: 4, inr: 499 },
] as const;

/**
 * घर.4 — पास. Which state the counter is in and why, the four tiers, and the two ways to pay.
 * Buying is behind the aggregator and the order endpoint, which do not exist yet; until they do
 * the buttons say so plainly rather than leading to nothing, and nothing is gated.
 */
export function PassScreen() {
  const { t } = useSettings();
  const [state, setState] = useState<Entitlement>(() => entitlement());
  const [tier, setTier] = useState<number>(1);
  const now = validity(new Date(), state);
  const paid = state.paid === true;

  const headline =
    now.state === 'before'
      ? t('pass.state.before')
      : now.state === 'trial'
        ? t('pass.state.trial', { hours: now.hours ?? 0 })
        : now.state === 'pass'
          ? t('pass.state.pass', { days: now.days ?? 0 })
          : paid
            ? t('pass.state.paidOver')
            : t('pass.state.expired');

  return (
    <>
      <ScreenHeader pillar="home" icon="ticket" title={t('pass.title')} />
      <div className="flow">
        <div className="pass-card">
          <span className="lbl" style={{ paddingTop: 0, color: 'var(--marigoldText)' }}>
            {t('pass.now')}
          </span>
          <p className="pass-big">{headline}</p>
          <span className="pass-track">
            <span style={{ width: `${String(now.percent)}%` }} />
          </span>
          <span className="small">{paid ? t('pass.paidRule') : t('pass.rule')}</span>
        </div>

        {!paid && (
          <>
            <p className="lbl">{t('pass.tiers')}</p>
            <div className="rows">
              {TIERS.map((row) => (
                <button
                  key={row.phones}
                  type="button"
                  className={row.phones === tier ? 'tier tier-on' : 'tier'}
                  onClick={() => {
                    setTier(row.phones);
                  }}
                >
                  <span className="tier-name">{t('pass.phones', { count: row.phones })}</span>
                  <span className="tier-price">₹{row.inr}</span>
                </button>
              ))}
            </div>
            <p className="muted small">{t('pass.more')}</p>
            <div className="grid2">
              <button type="button" className="btn btn-primary" disabled={!PURCHASE_IS_LIVE}>
                {t('pass.upi')}
              </button>
              <button type="button" className="btn btn-ghost" disabled={!PURCHASE_IS_LIVE}>
                <Icon name="qr" size={20} strokeWidth={1.9} />
                {t('pass.qr')}
              </button>
            </div>
            {!PURCHASE_IS_LIVE && <p className="muted small center">{t('pass.notLive')}</p>}
          </>
        )}

        <div className="grow" />

        {/* Trying the whole product from India: the counter behaves exactly as it will on
            arrival, because it is the same code reading the same landing time. */}
        <div className="card pad stack-sm">
          <span className="lbl" style={{ paddingTop: 0 }}>
            {t('pass.tryTitle')}
          </span>
          <span className="muted small">{t('pass.tryWhy')}</span>
          <button
            type="button"
            className={state.pretendingDubai === true ? 'btn btn-ghost' : 'btn btn-primary'}
            onClick={() => {
              setState(state.pretendingDubai === true ? stopPretending() : pretendLanded());
            }}
          >
            <Icon name="pin" size={20} strokeWidth={1.9} />
            {t(state.pretendingDubai === true ? 'pass.tryOff' : 'pass.tryOn')}
          </button>
        </div>
      </div>
    </>
  );
}
