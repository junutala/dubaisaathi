import { useEffect, useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import { recordVoiceEvent } from '../ask/index.js';
import { nationalNumber, waitingCount, writeMessage } from './outbox.js';
import { sendOutbox } from './send.js';

/**
 * घर.9 — सुझाव, the bar's third place (decision 046). The owner, 28 September: "We are young and
 * new. A giant like Google accepts from users, who are we?"
 *
 * Two errands. A place we are missing — a kitchen, a sight, anything — goes into the question log
 * exactly as जानना's line always sent it, with no name attached, and arrives filled in when the
 * traveller came here from a search that found nothing. A suggestion or a comment is the old
 * feedback form, which does ask for a name and a number, because it is the one that wants a reply.
 *
 * Both are written to the phone first and sent when there is a signal.
 */

type Country = 'IN' | 'AE';
const DIAL: Record<Country, string> = { IN: '+91', AE: '+971' };
type Field = 'name' | 'phone' | 'message';

export function ContributeScreen({ about }: { readonly about?: string | undefined }) {
  const { t, locale, online } = useSettings();
  return (
    <>
      <ScreenHeader pillar="home" icon="bulb" title={t('bar.contribute')} />
      <div className="flow">
        <MissingPlace about={about ?? ''} />
        <hr className="rule" />
        <h2 className="sub-head">{t('contribute.feedbackHead')}</h2>
        <Feedback locale={locale} online={online} />
      </div>
    </>
  );
}

/** A place we do not have, in the traveller's words, to the question log. */
function MissingPlace({ about }: { readonly about: string }) {
  const { t } = useSettings();
  const [words, setWords] = useState(about);
  const [thanked, setThanked] = useState(false);

  const send = () => {
    const said = words.trim();
    if (said === '') return;
    void recordVoiceEvent({
      transcript: said,
      intent: 'suggest-place',
      confidence: 1,
      landedOn: 'contribute',
      failure: 'nothing-in-pack',
      sttEngine: 'typed',
    });
    setWords('');
    setThanked(true);
  };

  return (
    <div className="rows">
      <h2 className="sub-head">{t('contribute.missingHead')}</h2>
      <p className="muted small">
        {thanked ? t('contribute.missingThanks') : t('contribute.missingWhy')}
      </p>
      <label className="field field-tall">
        <span className="field-label">{t('contribute.missingLabel')}</span>
        <textarea
          className="field-input field-text"
          rows={3}
          value={words}
          placeholder={t('contribute.missingPlaceholder')}
          onChange={(event) => {
            setWords(event.target.value);
            setThanked(false);
          }}
        />
      </label>
      <button type="button" className="btn btn-primary" onClick={send}>
        <Icon name="bulb" size={20} strokeWidth={1.9} />
        {t('contribute.missingSend')}
      </button>
    </div>
  );
}

/** A word to us, with a name and a number so a reply can come back (decision 023). */
function Feedback({ locale, online }: { readonly locale: 'hi' | 'en'; readonly online: boolean }) {
  const { t } = useSettings();
  const [fields, setFields] = useState({ name: '', phone: '', message: '' });
  const [country, setCountry] = useState<Country>('IN');
  const [missing, setMissing] = useState<Field>();
  const [kept, setKept] = useState<'waiting' | 'sent'>();
  const [waiting, setWaiting] = useState(0);

  useEffect(() => {
    let live = true;
    void waitingCount().then((count) => {
      if (live) setWaiting(count);
    });
    return () => {
      live = false;
    };
  }, [kept]);

  function typeInto(field: Field, value: string) {
    setFields((was) => ({ ...was, [field]: value }));
    if (missing === field) setMissing(undefined);
  }

  function send() {
    const name = fields.name.trim();
    const phone = nationalNumber(fields.phone, country);
    const message = fields.message.trim();
    if (name === '') {
      setMissing('name');
      return;
    }
    if (phone.length < 6 || phone.length > 12) {
      setMissing('phone');
      return;
    }
    if (message === '') {
      setMissing('message');
      return;
    }
    // Written first and always: the traveller with something to tell us is the one in a Karama
    // basement with no signal, and a box that refuses them is worse than no box.
    void writeMessage({ name, country, phone, message, locale }).then(() => {
      setKept('waiting');
      setFields({ name: '', phone: '', message: '' });
      void sendOutbox().then(() => {
        void waitingCount().then((count) => {
          setWaiting(count);
          if (count === 0) setKept('sent');
        });
      });
    });
  }

  return (
    <div className="rows">
      <p className="muted small">{t('contribute.feedbackWhy')}</p>

      {kept !== undefined ? (
        <div className="kept">
          <Icon name="check" size={22} strokeWidth={2.2} color="var(--tealText)" />
          <span className="kept-text">
            <span className="kept-head">{t('info.keptHead')}</span>
            <span className="kept-sub">
              {kept === 'sent' ? t('info.keptSent') : t('info.keptWaiting')}
            </span>
          </span>
        </div>
      ) : (
        <>
          <label className="field">
            <span className="field-label">{t('info.name')}</span>
            <input
              className="field-input"
              type="text"
              value={fields.name}
              placeholder={t('info.namePlaceholder')}
              onChange={(event) => {
                typeInto('name', event.target.value);
              }}
            />
          </label>

          {/* Two controls in one box, so this is a div with a `for` rather than a label wrapped
              round both: a label containing two controls names only the first. */}
          <div className="field">
            <label className="field-label" htmlFor="info-phone">
              {t('info.phone')}
            </label>
            <select
              className="dial"
              value={country}
              aria-label={t('info.country')}
              onChange={(event) => {
                setCountry(event.target.value === 'AE' ? 'AE' : 'IN');
                if (missing === 'phone') setMissing(undefined);
              }}
            >
              <option value="IN">{`${DIAL.IN} ${t('info.india')}`}</option>
              <option value="AE">{`${DIAL.AE} ${t('info.uae')}`}</option>
            </select>
            <input
              id="info-phone"
              className="field-input"
              type="tel"
              inputMode="numeric"
              value={fields.phone}
              placeholder={t('info.phonePlaceholder')}
              onChange={(event) => {
                typeInto('phone', event.target.value);
              }}
            />
          </div>

          <label className="field field-tall">
            <span className="field-label">{t('info.message')}</span>
            <textarea
              className="field-input field-text"
              rows={4}
              value={fields.message}
              placeholder={t('info.messagePlaceholder')}
              onChange={(event) => {
                typeInto('message', event.target.value);
              }}
            />
          </label>

          {missing !== undefined && (
            <p className="missing small">{t(`info.missing.${missing}` as StringKey)}</p>
          )}

          <button type="button" className="btn btn-primary" onClick={send}>
            {t('info.send')}
          </button>
          {!online && <p className="muted small center">{t('info.offlineNote')}</p>}
          {waiting > 0 && (
            <p className="muted small center">{t('info.waiting', { count: String(waiting) })}</p>
          )}
        </>
      )}
    </div>
  );
}
