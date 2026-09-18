import { useEffect, useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon, type IconName } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import { CONTACTS } from './contacts.js';
import { formatDay } from './photos.js';
import { nationalNumber, waitingCount, writeMessage } from './outbox.js';
import { sendOutbox } from './send.js';
import { invite, shareAnywhere, whatsappLink, type ShareWay } from './share.js';
import { listDocuments } from './storage.js';
import type { TravellerDocument } from './records.js';

/**
 * घर.2 — ज़रूरी जानकारी, in three capsules (owner, 18 September; decision 028).
 *
 * संपर्क first, because the traveller who opens this screen in a hurry is opening it for a
 * number. दस्तावेज़ second, which is घर.2 as it has always been. फ़ीडबैक third: a word to us,
 * and the app passed on through the reader's own WhatsApp.
 *
 * Everything here works with the radio off. The numbers are in the pack, the documents are on
 * the phone, and a message is written to the phone and sent when there is a signal.
 */

type Capsule = 'contacts' | 'documents' | 'feedback';

const CAPSULES: readonly { readonly id: Capsule; readonly key: StringKey }[] = [
  { id: 'contacts', key: 'info.contacts' },
  { id: 'documents', key: 'info.documents' },
  { id: 'feedback', key: 'info.feedback' },
];

const CONTACT_ICON: Record<string, IconName> = {
  // The consulate is a place a traveller may have to go to; the other three are only ever a
  // phone call.
  consulate: 'pin',
  police: 'phone',
  ambulance: 'phone',
  fire: 'phone',
};

type Country = 'IN' | 'AE';
const DIAL: Record<Country, string> = { IN: '+91', AE: '+971' };
type Field = 'name' | 'phone' | 'message';

export function InfoScreen() {
  const { t, locale, online } = useSettings();
  const [capsule, setCapsule] = useState<Capsule>('contacts');

  return (
    <>
      <ScreenHeader pillar="docs" />
      <div className="flow">
        {/* The three, at the top and in the traveller's way on purpose: this screen is three
            errands, and which one they are on has to be visible before they scroll. */}
        <div className="caps" role="tablist" aria-label={t('nav.info')}>
          {CAPSULES.map((one) => (
            <button
              key={one.id}
              type="button"
              role="tab"
              aria-selected={capsule === one.id}
              className={capsule === one.id ? 'cap cap-on' : 'cap'}
              onClick={() => {
                setCapsule(one.id);
              }}
            >
              {t(one.key)}
            </button>
          ))}
        </div>

        {capsule === 'contacts' && <Contacts />}
        {capsule === 'documents' && <Documents />}
        {capsule === 'feedback' && <Feedback locale={locale} online={online} />}
      </div>
    </>
  );
}

/** The first capsule: four numbers, each one tap from dialling. */
function Contacts() {
  const { t, locale } = useSettings();
  return (
    <div className="rows">
      <p className="muted small">{t('info.contactsWhy')}</p>
      {CONTACTS.map((contact) => (
        <a key={contact.id} className="row-card row-card-link" href={`tel:${contact.phone}`}>
          <span className="row-card-thumb contact-thumb">
            <Icon
              name={CONTACT_ICON[contact.kind] ?? 'phone'}
              size={20}
              strokeWidth={1.8}
              color="var(--marigoldText)"
            />
          </span>
          <span className="row-card-text">
            <span className="row-card-title">{contact.name[locale]}</span>
            <span className="row-card-sub">{contact.where[locale]}</span>
          </span>
          <span className="contact-number">{contact.phone}</span>
        </a>
      ))}
      <p className="muted small center">{t('info.contactsNote')}</p>
    </div>
  );
}

/** The second capsule: घर.2 as it was — any document, as many as they like, on the phone. */
function Documents() {
  const { t, locale } = useSettings();
  const [documents, setDocuments] = useState<readonly TravellerDocument[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let live = true;
    void listDocuments().then((docs) => {
      if (!live) return;
      setDocuments(docs);
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="rows">
      {loaded && documents.length === 0 && <p className="muted small">{t('docs.none')}</p>}
      {documents.map((doc) => (
        <button
          key={doc.id}
          type="button"
          className="row-card"
          onClick={() => {
            navigate({ screen: 'docView', docId: doc.id });
          }}
        >
          <span className="row-card-thumb" style={{ width: 44, height: 56, borderRadius: 8 }}>
            <Icon name="doc" size={20} strokeWidth={1.6} color="var(--chev)" />
          </span>
          <span className="row-card-text">
            <span className="row-card-title">{doc.name}</span>
            <span className="row-card-sub">
              {t('docs.added', { date: formatDay(locale, doc.addedAt) })}
            </span>
          </span>
          <Icon name="right" size={18} strokeWidth={2} color="var(--chev)" />
        </button>
      ))}
      <button
        type="button"
        className="add-row add-row-primary"
        onClick={() => {
          navigate({ screen: 'docAdd' });
        }}
      >
        <Icon name="plus" size={20} strokeWidth={2} />
        {t('docs.add')}
      </button>
      <p className="muted small center">{t('docs.onlyHere')}</p>
    </div>
  );
}

/** The third capsule: a word to us, then the app passed on. */
function Feedback({ locale, online }: { readonly locale: 'hi' | 'en'; readonly online: boolean }) {
  const { t } = useSettings();
  const [fields, setFields] = useState({ name: '', phone: '', message: '' });
  const [country, setCountry] = useState<Country>('IN');
  const [missing, setMissing] = useState<Field>();
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
      <p className="muted small">{t('info.feedbackWhy')}</p>

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

      <hr className="rule" />

      <h2 className="sub-head">{t('info.shareHead')}</h2>
      <p className="muted small">{t('info.shareWhy')}</p>
      {/* What will go out, in full, before it goes: nobody should have to send a message in
          their own name to find out what it says. */}
      <p className="invite">{invite(locale)}</p>
      <a
        className="btn btn-primary"
        href={whatsappLink(locale)}
        target="_blank"
        rel="noreferrer"
        onClick={() => {
          setShared('whatsapp');
        }}
      >
        <Icon name="share" size={20} strokeWidth={1.9} />
        {t('info.viaWhatsapp')}
      </a>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => {
          // Opened, never asked about first: the sheet answers, and only a refusal moves on to
          // the clipboard (CLAUDE.md — a capability query is not an answer).
          void shareAnywhere(locale).then(setShared);
        }}
      >
        {t('info.viaAnything')}
      </button>
      {shared === 'copied' && <p className="muted small center">{t('info.copied')}</p>}
      {shared === 'refused' && <p className="muted small center">{t('info.shareRefused')}</p>}
    </div>
  );
}
