import { useSettings } from '../settings.js';
import { BUILD } from '../version.js';
import { Icon } from './icons.js';
import { Logo } from './Logo.js';

/**
 * The name, at the top of every screen.
 *
 * Until now `app.name` was rendered in exactly one place — the landing page, which a traveller
 * sees once on first open and never again. Every screen after it was anonymous: someone handed
 * the phone in a hotel lobby could not tell what the app was, and someone who liked it had
 * nothing to repeat to a friend. For a product sold by word of mouth to people who have never
 * heard of it, that is not a cosmetic gap.
 *
 * It is its own bar rather than a fourth thing crammed into the status strip. The strip is the
 * traveller's instrument panel — network, what is left of the counter, the two switches — and
 * all of it changes while they watch. A name never changes, so it does not belong among things
 * that do.
 *
 * The wordmark follows the interface language, so it reads दुबई साथी in Hindi and Dubai Saathi
 * in English, in Anek Devanagari — the display face already self-hosted for the landing page,
 * which carries both scripts properly and is on the device rather than at Google's.
 *
 * Online or offline sits here too, beside the name, rather than on the status strip below. The
 * two belong together: this bar answers "what am I holding, and is it talking to anything", and
 * both halves of that are true of the app rather than of the traveller's plan. It leaves the
 * strip to say one thing — how much of the counter is left — which is the thing worth money.
 *
 * The build stamp sits under the wordmark. It was on घर, below the tiles — and the tiles were
 * deliberately made to take the whole height, so it was under the fold of every phone and the
 * one person who needed it could not find it. A version that has to be scrolled to is a version
 * nobody reads. Here it is on every screen, in the one bar that is always at the top.
 */
export function BrandBar() {
  const { t, online } = useSettings();
  return (
    <div className="brand">
      <Logo size={24} />
      <span className="brand-id">
        <span className="brand-name">{t('app.name')}</span>
        <span className="brand-build">{BUILD}</span>
      </span>
      {/* Teal when offline, not red: working without a network is what this app is for, so it
          is a statement of fact and never a warning. */}
      <span className="brand-net" style={{ color: online ? 'var(--muted)' : 'var(--teal)' }}>
        <Icon name={online ? 'wifi' : 'wifioff'} size={15} strokeWidth={2.1} />
        {t(online ? 'strip.online' : 'strip.offline')}
      </span>
    </div>
  );
}
