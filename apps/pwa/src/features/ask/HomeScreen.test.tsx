import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SettingsProvider } from '../../app/settings.js';
import { HomeScreen } from '../home/HomeScreen.js';

/**
 * What the front door has to do, stated as the things that would actually go wrong for a
 * traveller (decision 014). CLAUDE.md's hard lesson from 13 September applies here: a harness
 * that asserts the design passes while the product is broken, so each of these is the symptom
 * someone would report — "I typed it and nothing happened", "it sent me to the wrong screen",
 * "my Hinglish didn't work" — rather than a description of the component.
 */

const navigate = vi.fn();
vi.mock('../../app/routes.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app/routes.js')>()),
  navigate: (...args: unknown[]) => {
    navigate(...args);
  },
}));

// The learning loop writes to IndexedDB; it is not what is under test here.
vi.mock('../voice/voiceEvent.js', () => ({ recordVoiceEvent: () => Promise.resolve(undefined) }));

const onMic = vi.fn();
const onHeard = vi.fn();

function show() {
  render(
    <SettingsProvider>
      <HomeScreen onMic={onMic} onHeard={onHeard} />
    </SettingsProvider>,
  );
}

/** Type a sentence into the one box on the screen and press Enter, as a traveller would. */
function type(sentence: string) {
  const box = screen.getByRole('textbox');
  fireEvent.change(box, { target: { value: sentence } });
  fireEvent.keyDown(box, { key: 'Enter' });
}

beforeEach(() => {
  navigate.mockClear();
  onMic.mockClear();
  onHeard.mockClear();
});
afterEach(cleanup);

describe('the home screen front door', () => {
  it('offers a box to type into', () => {
    show();
    expect(screen.getByRole('textbox')).toBeTruthy();
  });

  /**
   * रास्ता now exists, and it carries the destination in with it. The screen it opens offers
   * both readings of the sentence — the transport, and the Arabic for a driver — because which
   * one was meant depends on where the traveller is standing (decision 014).
   */
  it('sends a typed destination to रास्ता, with the place already in the box', () => {
    show();
    type('करामा जाना है');
    expect(navigate).toHaveBeenCalledWith({ screen: 'transport', placeId: 'karama' });
  });

  /** Rule 4: Hinglish is first-class, not a fallback. Same sentence, Roman script, same screen. */
  it('sends the same sentence in Hinglish to the same place', () => {
    show();
    type('karama jaana hai');
    expect(navigate).toHaveBeenCalledWith({ screen: 'transport', placeId: 'karama' });
  });

  it('sends a food sentence to खाना', () => {
    show();
    type('jain khana kahaan milega');
    expect(navigate).toHaveBeenCalledWith({ screen: 'food' });
  });

  /**
   * Design rule 11. A bare place name is genuinely two questions, so it must ask rather than
   * pick one — and asking is not a dead end, so the question carries controls.
   */
  it('asks rather than guessing when a bare place name could mean two things', () => {
    show();
    type('करामा');
    expect(navigate).not.toHaveBeenCalled();
    const enabled = screen
      .getAllByRole('button')
      .filter((button) => !(button as HTMLButtonElement).disabled);
    expect(enabled.length).toBeGreaterThan(0);
  });

  /** A sentence nobody could parse still ends on a screen with a way forward, never a dead end. */
  it('leaves a way forward when nothing was understood', () => {
    show();
    type('qwerty asdf zxcv');
    expect(navigate).not.toHaveBeenCalled();
    const enabled = screen
      .getAllByRole('button')
      .filter((button) => !(button as HTMLButtonElement).disabled);
    expect(enabled.length).toBeGreaterThan(0);
  });

  it('does nothing at all on an empty box', () => {
    show();
    type('   ');
    expect(navigate).not.toHaveBeenCalled();
    expect(onHeard).not.toHaveBeenCalled();
  });

  /**
   * Voice is on the second bench, not off the phone (decision 014). The mic left the middle of
   * the screen; it did not leave the screen, and it still opens the mic screen.
   */
  it('still offers the mic, at the end of the box', () => {
    show();
    // jsdom reports an English locale, so the app renders the English catalogue here.
    fireEvent.click(screen.getByRole('button', { name: 'Fill it by speaking' }));
    expect(onMic).toHaveBeenCalled();
  });

  /** बोलना is no longer a tile, and a tile that is gone must not still be tappable. */
  it('no longer offers बोलना as a tile', () => {
    show();
    expect(screen.queryByText('Speaking')).toBeNull();
    expect(screen.queryByText('बोलना')).toBeNull();
  });
});
