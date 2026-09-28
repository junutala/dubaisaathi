import { useEffect, useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import { formatDay } from './photos.js';
import { listDocuments } from './storage.js';
import type { TravellerDocument } from './records.js';

/**
 * घर.2 — दस्तावेज़, the bar's second place (decision 046): any document, as many as the traveller
 * likes, on the phone and nowhere else. It was a capsule inside ज़रूरी जानकारी (decision 028); it
 * is its own screen again because a passport is reached for at a counter, not browsed to.
 *
 * Nothing here needs a network, and nothing is ever sold here: this is the traveller's own.
 */
export function DocumentsScreen() {
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
    <>
      <ScreenHeader pillar="docs" />
      <div className="flow">
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
      </div>
    </>
  );
}
