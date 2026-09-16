import { useSettings } from '../../app/settings.js';
import { Icon } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';

/**
 * The box a traveller types into. An ordinary text box, so the phone's own keyboard does the
 * work — and because the matcher is script-agnostic, "mall of emirates" and "मॉल ऑफ़ एमिरेट्स"
 * reach the same place. There is no microphone on it and none anywhere else in the app: the
 * owner's decision of 16 September, after three days that proved offline speech could not hear
 * the place names this product exists to hear.
 */
export function AskBar({
  value,
  onChange,
  onSend,
  placeholder,
  label,
  accent,
  autoFocus = false,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSend: () => void;
  readonly placeholder: StringKey;
  readonly label: StringKey;
  /** The pillar's hue, for the box's edge while it holds something. */
  readonly accent: string;
  readonly autoFocus?: boolean;
}) {
  const { t } = useSettings();
  return (
    <div className="askbar" style={value === '' ? undefined : { borderColor: accent }}>
      <Icon name="search" size={20} strokeWidth={2} color="var(--muted)" />
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
    </div>
  );
}
