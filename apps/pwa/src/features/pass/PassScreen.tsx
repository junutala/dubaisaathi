import { useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { QuickBar } from '../../app/shell/QuickBar.js';
import { Icon } from '../../app/shell/icons.js';
import {
  endsAt,
  entitlement,
  pretendLanded,
  stopPretending,
  validity,
  type Entitlement,
} from './entitlement.js';

/**
 * घर.1 · पास — which state the counter is in, and why.
 *
 * The strip shows a number; this screen says what the number means. Before landing there is
 * nothing counting and the screen says so rather than showing a full bar and leaving a traveller
 * to wonder whether their free day is draining while they are still in Mumbai.
 *
 * Buying is not here yet: the order, the UPI intent and the signed pass all need the server, and
 * a price list with no way to pay is a dead end wearing a menu's clothes.
 */
export function PassScreen({ onMic }: { readonly onMic: () => void }) {
  const { t, locale } = useSettings();
  const [state, setState] = useState<Entitlement>(() => entitlement());
  const now = validity(new Date(), state);
  const end = endsAt(state);

  const when = end?.toLocaleString(locale === 'hi' ? 'hi-IN' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <ScreenHeader title={t('pass.title')} tile="home" />
      <div className="flow">
        <div className="card pad stack-sm">
          <p className="lbl">{t(`pass.state.${now.state}`)}</p>
          <p className="pass-big">
            {now.state === 'before'
              ? t('pass.notStarted')
              : now.state === 'expired'
                ? t('pass.over')
                : now.state === 'pass'
                  ? t('strip.pass', { days: now.days ?? 0 })
                  : t('strip.trial', { hours: now.hours ?? 0 })}
          </p>
          {when !== undefined && now.state !== 'expired' && (
            <p className="muted small">{t('pass.until', { when })}</p>
          )}
        </div>

        <p className="muted small">{t('pass.rule')}</p>

        {/* Rule 6, said here because this is the screen where a traveller worries about it. */}
        <p className="muted small">{t('pass.infoSurvives')}</p>

        <div className="grow" />

        {/*
          Trying the whole product from India. Everything downstream — the counter, the trial, the
          expiry — behaves exactly as it will on arrival, because it is the same code reading the
          same landing time. It is labelled as a test so nobody mistakes it for having travelled.
        */}
        <div className="card pad stack-sm">
          <p className="lbl">{t('pass.tryTitle')}</p>
          <p className="muted small">{t('pass.tryWhy')}</p>
          <button
            type="button"
            className={state.pretendingDubai === true ? 'btn btn-ghost' : 'btn btn-primary'}
            data-tap
            onClick={() => {
              setState(state.pretendingDubai === true ? stopPretending() : pretendLanded());
            }}
          >
            <Icon name="pin" size={20} strokeWidth={1.9} />
            {t(state.pretendingDubai === true ? 'pass.tryOff' : 'pass.tryOn')}
          </button>
        </div>
      </div>
      <QuickBar current="home" onMic={onMic} />
    </>
  );
}
