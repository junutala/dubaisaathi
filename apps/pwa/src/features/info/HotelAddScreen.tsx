import { useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { QuickBar } from '../../app/shell/QuickBar.js';
import { Icon, type IconName } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import { PhotoInput } from './PhotoInput.js';
import { areaFor } from './nearestArea.js';
import { pinHere } from './pin.js';
import { saveHotelCapture, type HotelCapture } from './storage.js';

/**
 * 4.2 — three ways to capture the hotel, and any one of them is enough. Nothing is typed: a
 * traveller will not spell "Al Rigga", and asking them to is how the field ends up empty on
 * the night it is needed (design rule 14).
 *
 * Each of the three saves and returns to 4.1, because the shelf showing the hotel is the
 * confirmation — there is no "saved" message to read and dismiss.
 */
export function HotelAddScreen({ onMic }: { readonly onMic: () => void }) {
  const { t } = useSettings();
  const [pinning, setPinning] = useState(false);
  /** What the phone said when it would not give a fix. Only ever set by an actual refusal. */
  const [refused, setRefused] = useState<StringKey>();

  const capture = (change: HotelCapture) => {
    void saveHotelCapture(change).then(() => {
      navigate({ screen: 'info' });
    });
  };

  return (
    <>
      <ScreenHeader title={t('info.hotelAdd.title')} tile="info" trail={t('info.hotelAdd.trail')} />
      <div className="flow">
        <p className="info-anyone">{t('info.hotelAdd.anyOne')}</p>

        {/* Live from the moment the screen paints, and the phone is asked only when it is
            pressed. No permission query stands between the traveller and the attempt — that
            is the rule this project paid a day for. */}
        <button
          type="button"
          className="pick-row"
          onClick={() => {
            setPinning(true);
            setRefused(undefined);
            void pinHere().then((result) => {
              setPinning(false);
              if (result.kind === 'refused') {
                setRefused(PIN_REFUSAL[result.why]);
                return;
              }
              // The pack covers central Dubai, so a hotel outside it is pinned with no area
              // name at all — which 4.1 shows honestly, rather than naming the wrong district.
              const area = areaFor(result.at);
              capture(area ? { pin: result.at, area } : { pin: result.at });
            });
          }}
        >
          <PickFace
            icon="pin"
            title={t('info.hotelAdd.pin')}
            sub={pinning ? t('info.hotelAdd.pinning') : t('info.hotelAdd.pinWhy')}
          />
        </button>

        {/* Said only after the phone has refused, and it points at the two rows below rather
            than ending the task: a card photo is as complete a hotel as a pin is. */}
        {refused !== undefined && <p className="muted small">{t(refused)}</p>}

        <PhotoInput
          className="pick-row"
          onPhoto={(cardPhoto) => {
            capture({ cardPhoto });
          }}
        >
          <PickFace
            icon="camera"
            title={t('info.hotelAdd.card')}
            sub={t('info.hotelAdd.cardWhy')}
          />
        </PhotoInput>

        <PhotoInput
          className="pick-row"
          onPhoto={(gatePhoto) => {
            capture({ gatePhoto });
          }}
        >
          <PickFace
            icon="camera"
            title={t('info.hotelAdd.gate')}
            sub={t('info.hotelAdd.gateWhy')}
          />
        </PhotoInput>
      </div>
      <QuickBar current="info" onMic={onMic} />
    </>
  );
}

/** What each refusal is called, so the traveller reads what the phone said and what to do next. */
const PIN_REFUSAL: Record<'denied' | 'unavailable' | 'timeout', StringKey> = {
  denied: 'info.hotelAdd.pinDenied',
  unavailable: 'info.hotelAdd.pinUnavailable',
  timeout: 'info.hotelAdd.pinTimeout',
};

/** The inside of a pick row. Shared so the pin button and the two photo labels look alike. */
function PickFace({
  icon,
  title,
  sub,
}: {
  readonly icon: IconName;
  readonly title: string;
  readonly sub: string;
}) {
  return (
    <>
      <span className="pick-icon">
        <Icon name={icon} size={24} strokeWidth={1.8} color="var(--marigoldText)" />
      </span>
      <span className="pick-text">
        <span className="pick-title">{title}</span>
        <span className="muted small">{sub}</span>
      </span>
      <Icon name="right" size={20} strokeWidth={1.8} color="var(--chev)" />
    </>
  );
}
