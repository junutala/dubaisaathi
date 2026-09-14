import { useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { QuickBar } from '../../app/shell/QuickBar.js';
import { Icon } from '../../app/shell/icons.js';
import { PhotoInput } from './PhotoInput.js';
import { useBlobUrl } from './photos.js';
import { saveDocument } from './storage.js';

/**
 * 4.3 — any document, one photo, one name. Insurance, passport, the return flight: the tourist
 * decides which, because the one they will want at a desk is not one we can guess.
 *
 * The line about the phone is said here and only here, at the moment it matters — while a
 * passport is being photographed (decision 003).
 */
export function DocumentAddScreen({ onMic }: { readonly onMic: () => void }) {
  const { t } = useSettings();
  const [photo, setPhoto] = useState<Blob>();
  const [name, setName] = useState('');
  const preview = useBlobUrl(photo);

  const ready = photo !== undefined && name.trim() !== '';

  return (
    <>
      <ScreenHeader title={t('info.docAdd.title')} tile="info" trail={t('info.docAdd.trail')} />
      <div className="flow">
        <PhotoInput
          className="shot"
          onPhoto={(taken) => {
            setPhoto(taken);
          }}
        >
          {preview ? (
            <img className="shot-preview" src={preview} alt={t('info.docAdd.photoAlt')} />
          ) : (
            <>
              <Icon name="camera" size={40} strokeWidth={1.4} color="var(--muted)" />
              <span className="shot-label">{t('info.docAdd.photo')}</span>
            </>
          )}
        </PhotoInput>
        {preview && <span className="muted small center">{t('info.docAdd.retake')}</span>}

        <label className="stack-sm">
          <span className="muted small">{t('info.docAdd.name')}</span>
          <input
            className="typed"
            type="text"
            value={name}
            placeholder={t('info.docAdd.nameHint')}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
        </label>

        <div className="note">
          <Icon name="check" size={19} strokeWidth={2.1} color="var(--teal)" />
          <span>{t('info.docAdd.onlyHere')}</span>
        </div>

        <div className="grow" />
        {/* Says what is still missing rather than leaving a dead button to be puzzled over —
            and both of the things it names are on this screen, above it. */}
        {!ready && <span className="muted small center">{t('info.docAdd.needBoth')}</span>}
        <button
          type="button"
          className="btn btn-primary bottom"
          disabled={!ready}
          onClick={() => {
            if (!photo) return;
            void saveDocument(name.trim(), photo).then(() => {
              navigate({ screen: 'info' });
            });
          }}
        >
          {t('info.docAdd.save')}
        </button>
      </div>
      <QuickBar current="info" onMic={onMic} />
    </>
  );
}
