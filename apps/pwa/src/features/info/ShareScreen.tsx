import { useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import { qrPath } from '../pass/index.js';
import { APP_LINK, shareAnywhere, whatsappLink, type ShareWay } from './share.js';

/**
 * घर.8 — ऐप शेयर, the bar's fourth place (decision 046).
 *
 * The moment it is for: a traveller reads an Arabic board aloud in Hindi and the man beside them
 * asks what that is. He has ten seconds and has never heard of us, so the QR fills the screen the
 * instant the tab is touched, and the four lines under it answer what it is and what it costs —
 * our name, what it does, "24 घंटे मुफ़्त", and the address for a camera that will not read.
 *
 * Drawn on the phone from the same encoder as the family QR, so it works with no signal, like
 * everything else a traveller needs in the street. WhatsApp is for the friend who is not there.
 */
export function ShareScreen() {
  const { t, locale } = useSettings();
  const [shared, setShared] = useState<ShareWay>();
  const { size, d } = qrPath(APP_LINK);
  const address = APP_LINK.replace(/^https:\/\//, '');

  return (
    <>
      <ScreenHeader pillar="home" icon="qr" title={t('bar.share')} />
      <div className="flow share">
        <div className="share-qr">
          <svg
            className="share-qr-svg"
            viewBox={`0 0 ${String(size)} ${String(size)}`}
            shapeRendering="crispEdges"
            role="img"
            aria-label={t('share.qrLabel')}
          >
            <path d={d} fill="currentColor" />
          </svg>
        </div>
        <p className="share-name">Dubai Saathi</p>
        <p className="share-what">{t('share.what')}</p>
        <p className="share-free">{t('share.free')}</p>
        <p className="share-address">{address}</p>

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
          {t('share.whatsapp')}
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
          {t('share.anything')}
        </button>
        {shared === 'copied' && <p className="muted small center">{t('info.copied')}</p>}
        {shared === 'refused' && <p className="muted small center">{t('info.shareRefused')}</p>}
      </div>
    </>
  );
}
