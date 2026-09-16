import { useEffect, useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import { formatDay, useBlobUrl } from './photos.js';
import { deleteDocument, readDocument } from './storage.js';
import type { TravellerDocument } from './records.js';

/**
 * घर.3 — the payoff: the document, full width, at the desk, the moment it is needed. Share hands
 * the photograph to whatever the phone offers — WhatsApp to the son in Pune, or a printer.
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
      <ScreenHeader pillar="docs" trail={doc?.name ?? t('docView.trail')} />
      <div className="flow doc-view">
        {doc ? (
          <>
            <span className="doc-full">{photo && <img src={photo} alt={doc.name} />}</span>
            <span className="muted small center">
              {t('docView.footer', { date: formatDay(locale, doc.addedAt) })}
            </span>
            <div className="grid2">
              {/* Offered always, and the phone answers: a browser with no share sheet rejects
                  and nothing happens, which is the device saying no rather than us guessing. */}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  const file = new File([doc.photo], `${doc.name}.jpg`, {
                    type: doc.photo.type || 'image/jpeg',
                  });
                  // A browser without a share sheet has no `share`; asking it is how the device
                  // gets to say no, rather than the app deciding for it.
                  if ('share' in navigator)
                    void navigator.share({ files: [file], title: doc.name }).catch(() => undefined);
                }}
              >
                <Icon name="share" size={20} strokeWidth={1.9} />
                {t('docView.share')}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  void deleteDocument(doc.id).then(() => {
                    navigate({ screen: 'docs' });
                  });
                }}
              >
                <Icon name="trash" size={20} strokeWidth={1.9} />
                {t('docView.delete')}
              </button>
            </div>
          </>
        ) : (
          /* Reached by a link to a document that has since been deleted. The header's back and
             home are the way out, and this says why the screen is empty rather than leaving a
             blank rectangle to be stared at. */
          loaded && <p className="muted center">{t('docView.gone')}</p>
        )}
      </div>
    </>
  );
}
