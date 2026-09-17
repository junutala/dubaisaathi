import { useEffect, useState } from 'react';
import { listPriceInr, passPriceInr } from '@saathi/shared';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import { applyCoupon, pendingCoupon, type CouponOutcome, type PendingCoupon } from './coupon.js';
import {
  PURCHASE_IS_LIVE,
  entitlement,
  markWelcomed,
  pretendLanded,
  stopPretending,
  unwelcomedPass,
  validity,
  watchEntitlement,
  type Entitlement,
} from './entitlement.js';
import { PassWelcome } from './PassWelcome.js';
import { passLink, qrPath } from './qr.js';
import { shareFamilyQr, type ShareOutcome } from './shareQr.js';
import { buyPass, type PurchaseOutcome } from './purchase.js';
import { installFromToken } from './scan.js';
import type { SignedPass } from './signedPass.js';

/** 1–4 phones, ₹199 plus ₹100 per extra phone, 14 days from landing (decision 006). */
const PHONES = [1, 2, 3, 4] as const;

/**
 * What the pass actually gives, once the tiers are gone and the screen would otherwise be white
 * (decision 022). The same four facts the landing screen makes its promise on, in the same
 * words: a traveller who has just paid should be reading what they bought.
 */
const GIVES = ['landing.job1', 'landing.job2', 'landing.job3', 'landing.job4'] as const;

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

/** The one honest line each ending of a purchase gets (decision 019). */
function buyLineFor(outcome: PurchaseOutcome): StringKey {
  switch (outcome.kind) {
    case 'paid':
      return 'pass.buyDone';
    case 'closed':
      return 'pass.buyClosed';
    case 'pending':
      return 'pass.buyPending';
    case 'unreachable':
      return 'pass.buyUnreachable';
    case 'offline':
      return 'pass.buyOffline';
    case 'failed':
      return 'pass.buyFailed';
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
        case 'free':
          return 'pass.buyFree';
      }
  }
}

/** The one honest line each ending of भेजें gets; a closed sheet gets none. */
function shareLineFor(outcome: ShareOutcome): StringKey | null {
  switch (outcome) {
    case 'image':
      return 'pass.shareSent';
    case 'link':
      return 'pass.shareLinkSent';
    case 'copied':
      return 'pass.copied';
    case 'dismissed':
      return null;
    case 'refused':
      return 'pass.shareRefused';
  }
}

/**
 * घर.4 — पास, as one flow from the top: the counter, how many phones, a code if there is one,
 * the total, and the one button that fits the total. Once paid with more than one phone, the
 * family's QR codes follow (decision 018).
 *
 * Buying is an order, Razorpay's Checkout and a webhook that signs the pass (decision 019): both
 * buttons create the order, UPI opens Checkout with UPI preselected and QR opens it with the
 * method left alone, and the pass arrives when the phone asks for the order's status. Until
 * `VITE_PURCHASE_LIVE` is on the buttons say so plainly. A code that makes the pass free needs
 * none of it: it is issued on the spot. The gate is a separate switch and stays shut.
 */
export function PassScreen({ token }: { readonly token?: string | undefined }) {
  const { t } = useSettings();
  const [state, setState] = useState<Entitlement>(() => entitlement());
  const [pending, setPending] = useState<PendingCoupon | null>(() => pendingCoupon());
  const [slots, setSlots] = useState<number>(() => pendingCoupon()?.slots ?? 1);
  const [typed, setTyped] = useState<string>(() => pendingCoupon()?.code ?? '');
  const [line, setLine] = useState<StringKey | null>(null);
  /**
   * What is in flight, if anything. A traveller whose tap is taking a moment presses it again —
   * which is not their mistake, it is a screen that said nothing. So every request holds the
   * phone selector and both buttons and says on the screen that it has gone out.
   */
  const [working, setWorking] = useState<'coupon' | 'buy' | null>(null);
  const busy = working !== null;
  const [scan, setScan] = useState<'installed' | 'invalid' | null>(null);
  const [shareLine, setShareLine] = useState<StringKey | null>(null);

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
    setWorking(null);
    const next = pendingCoupon();
    setPending(next);
    if (next !== null) {
      setTyped(next.code);
      setSlots(next.slots);
    }
    setLine(lineFor(outcome));
  };

  const apply = (mode: 'quote' | 'issue') => {
    setWorking('coupon');
    setLine(null);
    void applyCoupon(typed, slots, mode).then(settle);
  };

  // A code applied with no signal is applied when there is some, here as well as on boot, so
  // the traveller looking at this screen when the network returns sees the answer arrive.
  useEffect(() => {
    const retry = () => {
      const waiting = pendingCoupon();
      if (waiting === null || waiting.quote !== undefined || entitlement().paid === true) return;
      setWorking('coupon');
      void applyCoupon(waiting.code, waiting.slots, 'quote').then(settle);
    };
    window.addEventListener('online', retry);
    return () => {
      window.removeEventListener('online', retry);
    };
  }, []);

  const headline =
    now.state === 'before'
      ? // A pass bought in India waits for the plane (decision 006), and until 17 September the
        // screen still told its owner about the free day they no longer need. What they need to
        // read is that the thing they just paid for is theirs and when it starts.
        t(paid ? 'pass.state.paidBefore' : 'pass.state.before')
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

  /**
   * The order, Checkout, and the pass the webhook signed. `upi` preselects UPI on this phone;
   * `any` leaves the method open, which is what puts a QR in front of whoever is paying from
   * India. Both create the order first, because an order is what makes a payment ours at all.
   */
  const buy = (method: 'upi' | 'any') => {
    setWorking('buy');
    setLine(null);
    void buyPass({
      slots: chosen,
      code: pending?.code,
      method,
      name: t('app.name'),
      description: t('pass.buyWhat', { count: chosen }),
    }).then((outcome) => {
      setWorking(null);
      setState(entitlement());
      setPending(pendingCoupon());
      setLine(buyLineFor(outcome));
    });
  };

  const family = state.familyPasses ?? [];

  /**
   * The QR as a picture, and the link only when the picture cannot go — the order and every
   * ending live in `shareQr`; this says what happened, in one line, in the traveller's language.
   */
  const share = (pass: SignedPass) => {
    const slot = pass.claims.slot;
    const title = t('pass.familySlot', { slot });
    setShareLine(null);
    void shareFamilyQr({
      url: passLink(pass),
      title,
      // The slot is our bookkeeping, not theirs: what the receiver needs is what it is and
      // that it is for one phone.
      text: t('pass.shareText'),
      caption: `${t('app.name')} · ${title}`,
      fileName: `dubaisaathi-pass-${String(slot)}.png`,
    }).then((outcome) => {
      setShareLine(shareLineFor(outcome));
    });
  };

  /**
   * A pass that has landed and not yet been read about — from a family QR, a free code or a
   * purchase, all three end in the same install (decision 022). It takes the whole screen for
   * one read, and the control lands the traveller on घर.
   */
  const welcome = unwelcomedPass(state);
  if (welcome !== null) {
    return (
      <>
        <ScreenHeader pillar="home" icon="ticket" title={t('pass.title')} />
        <PassWelcome
          onDone={() => {
            // Written and read back into this screen's own state: the traveller lands on घर, but
            // the buyer of a family pass comes straight back here for the QRs, and a screen that
            // still believed the welcome was owed would show it a second time.
            setState(markWelcomed(welcome));
            navigate({ screen: 'home' });
          }}
        />
      </>
    );
  }

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
            {busy && (
              <p className="pass-line">
                {t(working === 'buy' ? 'pass.buyWorking' : 'pass.couponWorking')}
              </p>
            )}
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
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!PURCHASE_IS_LIVE || busy}
                    onClick={() => {
                      buy('upi');
                    }}
                  >
                    {t('pass.upi')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={!PURCHASE_IS_LIVE || busy}
                    onClick={() => {
                      buy('any');
                    }}
                  >
                    <Icon name="qr" size={20} strokeWidth={1.9} />
                    {t('pass.qr')}
                  </button>
                </div>
                {!PURCHASE_IS_LIVE && <p className="muted small center">{t('pass.notLive')}</p>}
                {/* A balance waits for UPI only while UPI is not open; once it is, the two
                    buttons above take it and saying otherwise would be a lie on the screen. */}
                {!PURCHASE_IS_LIVE && quote !== undefined && (
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
                          share(pass);
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
            {shareLine !== null && <p className="muted small center">{t(shareLine)}</p>}
          </>
        )}

        {/* Once paid the tiers go, and what is left has to be what the money bought rather than
            white space (decision 022) — the landing screen's own four promises, unchanged. */}
        {paid && (
          <>
            <p className="lbl">{t('pass.gives')}</p>
            <ul className="gives">
              {GIVES.map((key) => (
                <li key={key} className="gives-row">
                  <Icon name="check" size={18} strokeWidth={2.4} color="var(--teal)" />
                  {t(key)}
                </li>
              ))}
            </ul>
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
