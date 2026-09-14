import { useState } from 'react';
import type { ParsedIntent } from '@saathi/shared';
import { useSettings } from '../../app/settings.js';
import { navigate, type Route } from '../../app/routes.js';
import { Icon, type IconName } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import { AskBar } from '../ask/AskBar.js';
import { Clarifier } from '../ask/Clarifier.js';
import { recordClarifierChoice, submitSentence } from '../ask/askSubmit.js';
import { transportLanding } from '../voice/micRouting.js';
import { typedStt } from '../voice/stt.js';

interface TileDef {
  readonly key: StringKey;
  readonly blurb: StringKey;
  readonly icon: IconName;
  readonly route: Route;
}

/**
 * Three tiles, not four. बोलना came off: it is not a place a traveller goes, it is something
 * they do about a place they are already going to — and now that रास्ता carries both readings of
 * a destination, "say it in Arabic" is one tap from the sentence that needs it rather than a
 * front-page errand of its own. A tile that has to be explained has not earned its place.
 */
const TILES: readonly TileDef[] = [
  {
    key: 'tile.transport',
    blurb: 'tile.transport.blurb',
    icon: 'route',
    route: { screen: 'transport' },
  },
  {
    key: 'tile.food',
    blurb: 'tile.food.blurb',
    icon: 'food',
    route: { screen: 'soon', tile: 'food' },
  },
  {
    key: 'tile.info',
    blurb: 'tile.info.blurb',
    icon: 'info',
    route: { screen: 'soon', tile: 'info' },
  },
];

/**
 * घर — the tiles, and the box that reaches all of them (decision 014).
 *
 * The box is the front door. A whole sentence carries its own intent, so "करामा जाना है" does not
 * need the traveller to have picked a tile first; the tiles are for the times they would rather
 * browse than say what they want.
 */
export function HomeScreen({
  onMic,
  onHeard,
}: {
  readonly onMic: () => void;
  readonly onHeard: (intent: ParsedIntent) => void;
}) {
  const { t } = useSettings();
  const [typed, setTyped] = useState('');
  /** Set only when the sentence was genuinely two questions — never as a way of stalling. */
  const [asking, setAsking] = useState<ParsedIntent | null>(null);

  const send = () => {
    const outcome = submitSentence({ text: typed }, typedStt.id);
    if (outcome === null) return;
    if (outcome.at === 'ask') {
      setAsking(outcome.intent);
      return;
    }
    setAsking(null);
    setTyped('');
    onHeard(outcome.intent);
    navigate(outcome.route);
  };

  return (
    <div className="flow home">
      <div className="tiles">
        {TILES.map((tile) => (
          <button
            key={tile.key}
            type="button"
            className="tile"
            data-tap
            onClick={() => {
              navigate(tile.route);
            }}
          >
            {/* Size and stroke come from the stylesheet: the icon is a share of the tile, not
                a fixed number of pixels. */}
            <span className="tile-icon">
              <Icon name={tile.icon} color="var(--marigoldText)" />
            </span>
            <span className="tile-text">
              <span className="tile-name">{t(tile.key)}</span>
              <span className="tile-blurb">{t(tile.blurb)}</span>
            </span>
          </button>
        ))}
      </div>

      {asking !== null ? (
        <Clarifier
          intent={asking}
          onPick={(choice) => {
            recordClarifierChoice(asking, choice, typedStt.id);
            onHeard(asking);
            setAsking(null);
            setTyped('');
            navigate(
              choice === 'route'
                ? transportLanding(asking.destination?.placeId)
                : { screen: 'soon', tile: 'food' },
            );
          }}
          actions={
            // They typed it, so another go at the keyboard is the way forward — not "type it
            // instead", which is where they already are.
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setAsking(null);
              }}
            >
              {t('ask.rewrite')}
            </button>
          }
        />
      ) : (
        <div className="home-ask">
          <AskBar
            value={typed}
            onChange={setTyped}
            onSend={send}
            onMic={onMic}
            placeholder="ask.placeholder"
            label="ask.label"
          />
          <span className="muted center">{t('ask.hint')}</span>
        </div>
      )}
    </div>
  );
}
