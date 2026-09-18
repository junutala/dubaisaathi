import { useEffect, useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import { nationalNumber, waitingCount, writeMessage } from './outbox.js';
import { sendOutbox } from './send.js';
import { invite, shareAnywhere, whatsappLink, type ShareWay } from './share.js';

/**
 * घर.7 — बात. One screen, two things, in the order the owner named them (17 September): tell us
 * something, and pass the app on.
 *
 * They share a screen rather than a tile each because they are the same act from the traveller's
 * side — a word about us going somewhere — and घर has room for neither: four blocks and one tile
 * is the whole of it (decision 018), and a fifth block would have cost बोलना its place.
 *
 * Neither half needs a network. The message is written to the phone and sent when there is a
 * signal; the invitation opens an app that is already installed.
 */

type Country = 'IN' | 'AE';

const DIAL: Record<Country, string> = { IN: '+91', AE: '+971' };

/** What may not be empty, in the order the eye reads it — the same order the function checks. */
type Field = 'name' | 'phone' | 'message';

export function ReachScreen() {
  const { t, locale, online } = useSettings();
  const [fields, setFields] = useState({ name: '', phone: '', message: '' });
  const [country, setCountry] = useState<Country>('IN');
  const [missing, setMissing] = useState<Field>();
  /**
   * Set once the message is on the phone. `waiting` until the server has actually taken it —
   * never the other way round: a screen that says "it has reached us" while the request is
   * still in the air is telling the traveller something nobody has confirmed.
   */
  const [kept, setKept] = useState<'waiting' | 'sent'>();
  const [waiting, setWaiting] = useState(0);
  const [shared, setShared] = useState<ShareWay>();

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

    // Written first and always. The send is an afterthought the traveller never waits for:
    // on a phone with no signal the row simply sits until there is one (rule 1).
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
    <>
      <ScreenHeader pillar="reach" />
      <div className="flow">
        <section className="reach-half">
          <h2 className="reach-head">{t('reach.sayHead')}</h2>
          <p className="muted small">{t('reach.sayWhy')}</p>

          {kept !== undefined ? (
            <div className="reach-kept">
              <Icon name="check" size={22} strokeWidth={2.2} color="var(--tealText)" />
              <span className="reach-kept-text">
                <span className="reach-kept-head">{t('reach.keptHead')}</span>
                <span className="reach-kept-sub">
                  {kept === 'sent' ? t('reach.keptSent') : t('reach.keptWaiting')}
                </span>
              </span>
            </div>
          ) : (
            <>
              <div className="rows">
                <label className="field">
                  <span className="field-label">{t('reach.name')}</span>
                  <input
                    className="field-input"
                    type="text"
                    value={fields.name}
                    placeholder={t('reach.namePlaceholder')}
                    onChange={(event) => {
                      typeInto('name', event.target.value);
                    }}
                  />
                </label>

                {/* Two controls in one box, so this is a div with a `for` rather than a label
                    wrapped round both: a label containing two controls names only the first,
                    which would have left the number itself with no name at all. */}
                <div className="field">
                  <label className="field-label" htmlFor="reach-phone">
                    {t('reach.phone')}
                  </label>
                  {/* The dialling code is a choice, not typing: a traveller staying in Dubai on
                      an Indian number is the common case and either is one tap. */}
                  <select
                    className="reach-dial"
                    value={country}
                    aria-label={t('reach.country')}
                    onChange={(event) => {
                      setCountry(event.target.value === 'AE' ? 'AE' : 'IN');
                      if (missing === 'phone') setMissing(undefined);
                    }}
                  >
                    <option value="IN">{`${DIAL.IN} ${t('reach.india')}`}</option>
                    <option value="AE">{`${DIAL.AE} ${t('reach.uae')}`}</option>
                  </select>
                  <input
                    id="reach-phone"
                    className="field-input"
                    type="tel"
                    inputMode="numeric"
                    value={fields.phone}
                    placeholder={t('reach.phonePlaceholder')}
                    onChange={(event) => {
                      typeInto('phone', event.target.value);
                    }}
                  />
                </div>

                <label className="field field-tall">
                  <span className="field-label">{t('reach.message')}</span>
                  <textarea
                    className="field-input reach-text"
                    rows={4}
                    value={fields.message}
                    placeholder={t('reach.messagePlaceholder')}
                    onChange={(event) => {
                      typeInto('message', event.target.value);
                    }}
                  />
                </label>
              </div>

              {missing !== undefined && (
                <p className="reach-missing small">{t(`reach.missing.${missing}` as StringKey)}</p>
              )}

              <button type="button" className="btn btn-primary reach-send" onClick={send}>
                {t('reach.send')}
              </button>
              {!online && <p className="muted small center">{t('reach.offlineNote')}</p>}
              {waiting > 0 && (
                <p className="muted small center">
                  {t('reach.waiting', { count: String(waiting) })}
                </p>
              )}
            </>
          )}
        </section>

        <hr className="reach-rule" />

        <section className="reach-half">
          <h2 className="reach-head">{t('reach.shareHead')}</h2>
          <p className="muted small">{t('reach.shareWhy')}</p>

          {/* What will go out, in full, before it goes: nobody should have to send a message to
              find out what it says in their own name. */}
          <p className="reach-invite">{invite(locale)}</p>

          <a
            className="btn btn-primary reach-wa"
            href={whatsappLink(locale)}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              setShared('whatsapp');
            }}
          >
            <Icon name="share" size={20} strokeWidth={1.9} />
            {t('reach.viaWhatsapp')}
          </a>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              // Opened, never asked about first: the sheet answers, and only a refusal moves on
              // to the clipboard (CLAUDE.md — a capability query is not an answer).
              void shareAnywhere(locale).then(setShared);
            }}
          >
            {t('reach.viaAnything')}
          </button>
          {shared === 'copied' && <p className="muted small center">{t('reach.copied')}</p>}
          {shared === 'refused' && <p className="muted small center">{t('reach.shareRefused')}</p>}
        </section>
      </div>
    </>
  );
}
