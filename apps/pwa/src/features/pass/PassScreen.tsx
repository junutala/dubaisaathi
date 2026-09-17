import { useEffect, useState } from 'react';
import { listPriceInr, passPriceInr } from '@saathi/shared';
import { useSettings } from '../../app/settings.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import { applyCoupon, pendingCoupon, type CouponOutcome, type PendingCoupon } from './coupon.js';
import {
  PURCHASE_IS_LIVE,
  entitlement,
  pretendLanded,
  stopPretending,
  validity,
  watchEntitlement,
  type Entitlement,
} from './entitlement.js';
import { passLink, qrPath } from './qr.js';
import { installFromToken } from './scan.js';
import type { SignedPass } from './signedPass.js';

/** 1–4 phones, ₹199 plus ₹100 per extra phone, 14 days from landing (decision 006). */
const PHONES = [1, 2, 3, 4] as const;

/** The one honest line each answer from `redeem` gets. */
function lineFor(outcome: CouponOutcome): StringKey | null {
  switch (outcome.kind) {
    case 'issued':
      return 'pass.freeDone';
    case 'quoted':
      return null;
    case 'offline':
      return 'pass.couponOffline';
    case 'failed':
      return 'pass.couponFailed';
    case 'refused':
      switch (outcome.reason) {
        case 'unknown':
          return 'pass.couponUnknown';
        case 'not-yet':
          return 'pass.couponNotYet';
        case 'ended':
          return 'pass.couponEnded';
        case 'exhausted':
          return 'pass.couponExhausted';
        case 'already-redeemed':
          return 'pass.couponUsed';
      }
  }
}

/**
 * घर.4 — पास, as one flow from the top: the counter, how many phones, a code if there is one,
 * the total, and the one button that fits the total. Once paid with more than one phone, the
 * family's QR codes follow (decision 018).
 *
 * Buying with money is behind the aggregator and the order endpoint, which do not exist yet;
 * until they do the UPI and QR buttons say so plainly, and nothing is gated. A code that makes
 * the pass free needs neither: it is issued on the spot.
 */
export function PassScreen({ token }: { readonly token?: string | undefined }) {
  const { t } = useSettings();
  const [state, setState] = useState<Entitlement>(() => entitlement());
  const [pending, setPending] = useState<PendingCoupon | null>(() => pendingCoupon());
  const [slots, setSlots] = useState<number>(() => pendingCoupon()?.slots ?? 1);
  const [typed, setTyped] = useState<string>(() => pendingCoupon()?.code ?? '');
  const [line, setLine] = useState<StringKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [scan, setScan] = useState<'installed' | 'invalid' | null>(null);
  const [copied, setCopied] = useState(false);

  const now = validity(new Date(), state);
  const paid = state.paid === true;

  // Every change to the pass — a scan, a code, a sync — is announced; the screen re-reads.
  useEffect(
    () =>
      watchEntitlement(() => {
        setState(entitlement());
        setPending(pendingCoupon());
      }),
    [],
  );

  // A family QR opened this phone here: install it offline, then say what happened.
  useEffect(() => {
    if (token === undefined) return;
    let live = true;
    void installFromToken(token).then((result) => {
      if (live) setScan(result);
    });
    // Off the URL, so a reload or the back button does not install it again.
    window.history.replaceState(null, '', '#/pass');
    return () => {
      live = false;
    };
  }, [token]);

  /** After any answer from `redeem`: the code as the server normalised it, and its line. */
  const settle = (outcome: CouponOutcome) => {
    setBusy(false);
    const next = pendingCoupon();
    setPending(next);
    if (next !== null) {
      setTyped(next.code);
      setSlots(next.slots);
    }
    setLine(lineFor(outcome));
  };

  const apply = (mode: 'quote' | 'issue') => {
    setBusy(true);
    setLine(null);
    void applyCoupon(typed, slots, mode).then(settle);
  };

  // A code applied with no signal is applied when there is some, here as well as on boot, so
  // the traveller looking at this screen when the network returns sees the answer arrive.
  useEffect(() => {
    const retry = () => {
      const waiting = pendingCoupon();
      if (waiting === null || waiting.quote !== undefined || entitlement().paid === true) return;
      setBusy(true);
      void applyCoupon(waiting.code, waiting.slots, 'quote').then(settle);
    };
    window.addEventListener('online', retry);
    return () => {
      window.removeEventListener('online', retry);
    };
  }, []);

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

  const single = pending?.kind === 'single';
  const quote = pending?.quote;
  const chosen = single ? 1 : slots;
  // The quote is re-priced here for the phones chosen now; the server prices again on issue,
  // from the same rule (`passPriceInr`, one definition for both).
  const total = quote === undefined ? listPriceInr(chosen) : passPriceInr(chosen, quote.discount);
  const gave =
    quote === undefined || pending === null
      ? null
      : typeof quote.discount.priceOverrideInr === 'number'
        ? t('pass.couponFlat', { code: pending.code, price: quote.discount.priceOverrideInr })
        : t('pass.couponPercent', { code: pending.code, percent: quote.discount.discountPercent });

  const family = state.familyPasses ?? [];

  const share = async (pass: SignedPass) => {
    const url = passLink(pass);
    const title = t('pass.familySlot', { slot: pass.claims.slot });
    // Offered always, and the phone answers: a browser with no share sheet rejects, and the
    // link is copied instead. Never decided in advance from a capability query.
    try {
      if ('share' in navigator) {
        await navigator.share({ url, title });
        return;
      }
    } catch {
      /* no sheet, or the traveller closed it — the copy below still helps */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      /* nothing to copy with; the QR on the screen is still the pass */
    }
  };

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

        {scan !== null && (
          <p className={scan === 'installed' ? 'pass-line pass-line-good' : 'pass-line'}>
            {t(scan === 'installed' ? 'pass.scanned' : 'pass.scanFailed')}
          </p>
        )}
        {state.passLost !== undefined && (
          <p className="pass-line">
            {t(state.passLost === 'taken' ? 'pass.lostTaken' : 'pass.lostRevoked')}
          </p>
        )}
        {/* The code's answer sits under the field while there is one; once the pass is in,
            the field is gone and the one line that matters moves up here. */}
        {paid && line !== null && <p className="pass-line pass-line-good">{t(line)}</p>}

        {!paid && (
          <>
            <p className="lbl">{t('pass.tiers')}</p>
            <div className="rows">
              {PHONES.map((phones) => (
                <button
                  key={phones}
                  type="button"
                  className={phones === chosen ? 'tier tier-on' : 'tier'}
                  disabled={busy || (single && phones !== 1)}
                  onClick={() => {
                    setSlots(phones);
                  }}
                >
                  <span className="tier-name">{t('pass.phones', { count: phones })}</span>
                  <span className="tier-price">₹{listPriceInr(phones)}</span>
                </button>
              ))}
            </div>
            {single && <p className="muted small">{t('pass.single')}</p>}
            <p className="muted small">{t('pass.more')}</p>

            <div className="field">
              <span className="field-label">{t('pass.couponLabel')}</span>
              <input
                className="field-input coupon-input"
                value={typed}
                placeholder={t('pass.couponHint')}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                aria-label={t('pass.couponLabel')}
                disabled={busy}
                onChange={(event) => {
                  setTyped(event.target.value.toUpperCase());
                }}
              />
              <button
                type="button"
                className="coupon-apply"
                disabled={busy || typed.trim() === ''}
                onClick={() => {
                  apply('quote');
                }}
              >
                {t(busy ? 'pass.couponApplying' : 'pass.couponApply')}
              </button>
            </div>
            {busy && <p className="pass-line">{t('pass.couponWorking')}</p>}
            {!busy && line !== null && <p className="pass-line">{t(line)}</p>}

            <div className="total">
              <span className="total-label">{t('pass.total')}</span>
              <span className="total-amount">
                {total === 0 ? t('pass.totalFree') : `₹${String(total)}`}
              </span>
              {quote !== undefined && total !== listPriceInr(chosen) && (
                <span className="total-list">₹{listPriceInr(chosen)}</span>
              )}
            </div>
            {gave !== null && <p className="muted small">{gave}</p>}

            {total === 0 ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => {
                  apply('issue');
                }}
              >
                <Icon name="ticket" size={20} strokeWidth={1.9} />
                {t(busy ? 'pass.freeWorking' : 'pass.free')}
              </button>
            ) : (
              <>
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
                {quote !== undefined && (
                  <p className="muted small center">{t('pass.balanceLater', { payable: total })}</p>
                )}
              </>
            )}
          </>
        )}

        {paid && family.length > 0 && (
          <>
            <p className="lbl">{t('pass.family')}</p>
            <p className="muted small">{t('pass.familyWhy')}</p>
            <div className="rows">
              {family.map((pass) => {
                const { size, d } = qrPath(passLink(pass));
                return (
                  <div key={pass.claims.passId} className="qr-card">
                    <svg
                      className="qr-svg"
                      viewBox={`0 0 ${String(size)} ${String(size)}`}
                      shapeRendering="crispEdges"
                      role="img"
                      aria-label={t('pass.familySlot', { slot: pass.claims.slot })}
                    >
                      <path d={d} fill="currentColor" />
                    </svg>
                    <span className="qr-text">
                      <span className="qr-slot">
                        {t('pass.familySlot', { slot: pass.claims.slot })}
                      </span>
                      <button
                        type="button"
                        className="qr-share"
                        onClick={() => {
                          void share(pass);
                        }}
                      >
                        <Icon name="share" size={18} strokeWidth={1.9} />
                        {t('pass.share')}
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
            {copied && <p className="muted small center">{t('pass.copied')}</p>}
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
