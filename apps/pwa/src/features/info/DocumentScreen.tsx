import { useEffect, useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { formatDay, useBlobUrl } from './photos.js';
import { deleteDocument, readDocument } from './storage.js';
import type { TravellerDocument } from './records.js';

/**
 * 4.4 — the payoff: the document, full width, at the desk, the moment it is needed. No bottom
 * bar, because the person looking at this screen is often not the person holding the phone
 * (design rule 6a).
 */
export function DocumentScreen({ docId }: { readonly docId: string }) {
  const { t, locale } = useSettings();
  const [doc, setDoc] = useState<TravellerDocument>();
  const [loaded, setLoaded] = useState(false);
  const photo = useBlobUrl(doc?.photo);

  useEffect(() => {
    let live = true;
    void readDocument(docId).then((row) => {
      if (!live) return;
      setDoc(row);
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, [docId]);

  return (
    <>
      {/* The document's own name is the title: a traveller who lands here from the mic has to
          be able to tell which document they are looking at without reading it. */}
      <ScreenHeader
        title={doc?.name ?? t('info.docView.trail')}
        tile="info"
        trail={t('info.docView.trail')}
      />
      <div className="flow doc-view">
        {doc ? (
          <>
            <span className="doc-full">{photo && <img src={photo} alt={doc.name} />}</span>
            <div className="doc-foot">
              <span className="muted small">
                {t('info.docView.footer', { date: formatDay(locale, doc.addedAt) })}
              </span>
              <button
                type="button"
                className="linkish"
                onClick={() => {
                  void deleteDocument(doc.id).then(() => {
                    navigate({ screen: 'info' });
                  });
                }}
              >
                {t('info.docView.delete')}
              </button>
            </div>
          </>
        ) : (
          /* Reached by a link to a document that has since been deleted. The header's back and
             home are the way out, and this says why the screen is empty rather than leaving a
             blank rectangle to be stared at. */
          loaded && <p className="muted center">{t('info.docView.gone')}</p>
        )}
      </div>
    </>
  );
}
