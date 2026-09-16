import { useEffect, useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import { formatDay } from './photos.js';
import { listDocuments } from './storage.js';
import type { TravellerDocument } from './records.js';

/**
 * घर.2 — दस्तावेज़. Any document, as many as they like, on the phone, opened with the radio off
 * and kept until they delete it (decision 003; owner, 16 September: no limits, because there is
 * no overhead on us). It reads nothing about entitlement and nothing off the network.
 */
export function DocsScreen() {
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
        {loaded && documents.length === 0 && <p className="muted small">{t('docs.none')}</p>}
        <div className="rows">
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
        </div>
        <p className="muted small center">{t('docs.onlyHere')}</p>
      </div>
    </>
  );
}
