import { useSettings } from '../../app/settings.js';
import { ScreenHeader, type Tile } from '../../app/shell/ScreenHeader.js';
import { QuickBar } from '../../app/shell/QuickBar.js';

/**
 * The three tiles whose screens are designed but not built yet. It says so plainly rather
 * than opening something half-working — a tourist who taps into a broken screen stops
 * trusting the other three.
 */
export function SoonScreen({ tile, onMic }: { readonly tile: Tile; readonly onMic: () => void }) {
  const { t } = useSettings();
  return (
    <>
      <ScreenHeader title={t('soon.title')} tile={tile} />
      <div className="flow center-all">
        <p className="muted center">{t('soon.body')}</p>
      </div>
      <QuickBar current={tile} onMic={onMic} />
    </>
  );
}
