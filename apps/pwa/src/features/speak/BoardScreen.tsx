import { useRef, useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import { recordVoiceEvent } from '../ask/index.js';
import { readBoard, shrinkPhoto, type BoardRead } from './board.js';
import { speakHindi } from './speak.js';

/**
 * घर.7 · बोलना › बोर्ड — a photograph of an Arabic board, and what it means in Hindi.
 *
 * The owner, 28 September: Dubai's boards are in Arabic and English and never in Hindi. The
 * traveller photographs the board; the screen shows the Hindi large, the Arabic that was read
 * under it — so they can see what we read — and reads the Hindi aloud with the phone's own voice.
 *
 * Online only, like the rest of बोलना (decision 020): reading a board needs the server. The
 * photograph is made small on the phone, which strips where and when it was taken, and the server
 * keeps only the text. A board with nothing we could read goes into the question log, so we see
 * which boards defeat us.
 */

const TROUBLE: Record<string, StringKey> = {
  none: 'board.none',
  offline: 'board.offline',
  'not-configured': 'board.notConfigured',
  'too-large': 'board.tooLarge',
  busy: 'board.busy',
  failed: 'board.failed',
};

const VOICE_TROUBLE: Record<string, StringKey> = {
  'no-engine': 'board.noEngine',
  'no-voice': 'board.noVoice',
  error: 'board.readFailed',
};

function troubleOf(outcome: BoardRead): StringKey | null {
  switch (outcome.kind) {
    case 'read':
      return null;
    case 'refused':
      return TROUBLE[outcome.reason] ?? 'board.failed';
    default:
      return TROUBLE[outcome.kind] ?? 'board.failed';
  }
}

export function BoardScreen() {
  const { t } = useSettings();
  const picker = useRef<HTMLInputElement | null>(null);
  const [working, setWorking] = useState(false);
  const [read, setRead] = useState<{ arabic: string; hindi: string } | null>(null);
  const [trouble, setTrouble] = useState<StringKey | null>(null);
  const [reading, setReading] = useState(false);
  const [voiceTrouble, setVoiceTrouble] = useState<StringKey | null>(null);

  const chosen = async (file: File | undefined) => {
    if (file === undefined) return;
    setTrouble(null);
    setVoiceTrouble(null);
    setRead(null);
    setWorking(true);
    let outcome: BoardRead;
    try {
      outcome = await readBoard(await shrinkPhoto(file));
    } catch {
      // The phone could not open the photograph it gave us: say so, rather than send nothing.
      outcome = { kind: 'failed' };
    }
    setWorking(false);
    if (outcome.kind === 'read') {
      setRead({ arabic: outcome.arabic, hindi: outcome.hindi });
      return;
    }
    setTrouble(troubleOf(outcome));
    if (outcome.kind === 'none') {
      void recordVoiceEvent({
        transcript: '',
        intent: 'bolna-board',
        confidence: 0,
        landedOn: 'bolna',
        failure: 'nothing-read',
        sttEngine: 'readboard',
        sttModel: 'claude',
      });
    }
  };

  const aloud = () => {
    if (read === null) return;
    setVoiceTrouble(null);
    void speakHindi(read.hindi, () => {
      // Shown when the device says it started speaking, not when it was asked to.
      setReading(true);
    }).then((outcome) => {
      setReading(false);
      if (outcome.kind === 'refused') {
        setVoiceTrouble(VOICE_TROUBLE[outcome.reason] ?? 'board.readFailed');
      }
    });
  };

  return (
    <>
      <ScreenHeader pillar="home" icon="camera" title={t('board.title')} trail={t('bolna.title')} />
      <div className="flow">
        <p className="muted small" style={{ margin: 0 }}>
          {t('board.why')}
        </p>

        <input
          ref={picker}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Cleared so choosing the same photograph again still counts as a choice.
            event.target.value = '';
            void chosen(file);
          }}
        />
        <button
          type="button"
          className="bolna-mic"
          disabled={working}
          onClick={() => picker.current?.click()}
        >
          <Icon name="camera" size={30} strokeWidth={1.9} />
          <span className="bolna-mic-label">
            {working ? t('board.working') : read === null ? t('board.take') : t('board.again')}
          </span>
        </button>
        <p className="muted small" style={{ margin: 0 }}>
          {t('board.privacy')}
        </p>

        {trouble !== null && <p className="trouble">{t(trouble)}</p>}

        {read !== null && (
          <>
            <span className="lbl">{t('board.hindi')}</span>
            <p className="board-hi" lang="hi">
              {read.hindi}
            </p>
            <button type="button" className="btn btn-primary" onClick={aloud} disabled={reading}>
              <Icon name="sound" size={20} strokeWidth={2} />
              {reading ? t('board.reading') : t('board.read')}
            </button>
            {voiceTrouble !== null && <p className="trouble">{t(voiceTrouble)}</p>}
            <div className="card pad">
              <span className="lbl" style={{ paddingTop: 0 }}>
                {t('board.arabic')}
              </span>
              <p className="board-ar" dir="rtl" lang="ar">
                {read.arabic}
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
