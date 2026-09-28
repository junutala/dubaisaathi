import { useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { Icon, type IconName } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import { CONTACTS } from '../info/index.js';

const LINE: readonly { readonly kind: string; readonly key: StringKey }[] = [
  { kind: 'police', key: 'sos.police' },
  { kind: 'ambulance', key: 'sos.ambulance' },
  { kind: 'fire', key: 'sos.fire' },
];

const CONTACT_ICON: Record<string, IconName> = {
  // The consulate is a place a traveller may have to go to; the other three are only ever a call.
  consulate: 'pin',
  police: 'phone',
  ambulance: 'phone',
  fire: 'phone',
};

/**
 * जानना's emergency line (decision 046), above its tabs and in the one red the palette keeps.
 *
 * The owner, 28 September: a panicked tourist will never reach for our app — we are the last port
 * of call, and like any good guide we list the numbers for the calm moment before. So it is one
 * slim line and not a red block that alarms everyone who came to look at an attraction: police,
 * ambulance and fire, each dialling on a tap, and सब नंबर opening the four with the consulate and
 * the note that India's 100 does not work here. All of it is in the pack, so it works offline.
 */
export function EmergencyLine() {
  const { t, locale } = useSettings();
  const [open, setOpen] = useState(false);
  const short = LINE.flatMap(({ kind, key }) => {
    const contact = CONTACTS.find((c) => c.kind === kind);
    return contact === undefined ? [] : [{ contact, key }];
  });

  return (
    <div className="sos">
      <div className="sos-line">
        <span className="sos-head">{t('sos.head')}</span>
        {short.map(({ contact, key }) => (
          <a key={contact.id} className="sos-number" href={`tel:${contact.phone}`}>
            {t(key)} {contact.phone}
          </a>
        ))}
        <button
          type="button"
          className="sos-all"
          aria-expanded={open}
          onClick={() => {
            setOpen((was) => !was);
          }}
        >
          {t('sos.all')}
        </button>
      </div>
      {open && (
        <div className="rows sos-list">
          {CONTACTS.map((contact) => (
            <a key={contact.id} className="row-card row-card-link" href={`tel:${contact.phone}`}>
              <span className="row-card-thumb contact-thumb">
                <Icon
                  name={CONTACT_ICON[contact.kind] ?? 'phone'}
                  size={20}
                  strokeWidth={1.8}
                  color="var(--alarm)"
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
      )}
    </div>
  );
}
