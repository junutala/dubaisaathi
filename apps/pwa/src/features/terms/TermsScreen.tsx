import { useSettings } from '../../app/settings.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { TERMS_CONTACT, TERMS_PAGES, termsVars, type TermsSection } from './terms.js';

/**
 * घर.10 · नियम और शर्तें (decision 048). The terms, the privacy note and the refund rule, bundled
 * with the app so they read with the radio off — the same words as saafarsaathi.in/terms.
 *
 * Reached from the landing page and the one-time notice, before the app has started (then it
 * has no strip or bar, like the landing page itself, and back returns there), and later from the
 * small print at the foot of घर.
 */
export function TermsScreen({ onBack }: { readonly onBack?: (() => void) | undefined }) {
  const { t } = useSettings();
  const vars = termsVars();
  const section = (item: TermsSection, key: string) => (
    <section
      key={key}
      className={item.callout === true ? 'terms-section terms-callout' : 'terms-section'}
    >
      <h3 className="terms-head">{t(item.head)}</h3>
      {item.paras.map((para) => (
        <p key={para} className="terms-p">
          {t(para, vars)}
        </p>
      ))}
    </section>
  );
  return (
    <>
      <ScreenHeader
        pillar="home"
        icon="docs"
        title={t('terms.title')}
        {...(onBack === undefined ? {} : { onBack })}
      />
      <div className="flow terms">
        <p className="muted small terms-updated">{t('terms.updated')}</p>
        {TERMS_PAGES.map((page) => (
          <div key={page.id} className="terms-part">
            {/* The screen's own header names the first part; the others need their name. */}
            {page.id !== 'terms' && page.head !== page.sections[0]?.head && (
              <h2 className="terms-group">{t(page.head)}</h2>
            )}
            {page.sections.map((item, i) => section(item, `${page.id}-${String(i)}`))}
          </div>
        ))}
        {section(TERMS_CONTACT, 'contact')}
      </div>
    </>
  );
}
