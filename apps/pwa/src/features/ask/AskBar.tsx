import { useSettings } from '../../app/settings.js';
import { Icon } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';

/**
 * The front door: a box the traveller types into, with the mic at the end of it (decision 014).
 *
 * The mic is small and plain here, and that is the decision rather than an oversight. It used to
 * be the largest thing on the home screen, which said "speak to me" — but offline recognition
 * mangles exactly what this product must hear, place names most of all, and every measurement so
 * far was taken in a quiet room rather than on a Dubai street. The keyboard needs no permission,
 * no model, no download and no network. So the box is the offer and the mic is a shortcut into
 * the same box, allowed to fail.
 */
export function AskBar({
  value,
  onChange,
  onSend,
  onMic,
  placeholder,
  label,
  autoFocus = false,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSend: () => void;
  readonly onMic: () => void;
  readonly placeholder: StringKey;
  readonly label: StringKey;
  readonly autoFocus?: boolean;
}) {
  const { t } = useSettings();
  return (
    <div className="askbar">
      {/* An ordinary text box, so the phone's own keyboard does the work — and because the parser
          is script-agnostic, "mall of emirates" and "मॉल ऑफ़ एमिरेट्स" reach the same place. That
          is what makes typing the front door rather than a demand that they own a Devanagari
          keyboard. */}
      <input
        className="askbar-input"
        type="text"
        lang="hi"
        autoFocus={autoFocus}
        value={value}
        placeholder={t(placeholder)}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSend();
        }}
        aria-label={t(label)}
        data-tap
      />
      <button
        type="button"
        className="askbar-mic"
        onClick={onMic}
        aria-label={t('ask.mic')}
        data-tap
      >
        <Icon name="mic" size={22} strokeWidth={1.8} color="var(--ink)" />
      </button>
    </div>
  );
}
