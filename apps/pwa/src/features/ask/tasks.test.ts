import { describe, expect, it } from 'vitest';
import type { NetworkState } from '@saathi/shared';
import { createTaskEngine, MENU_DWELL_MS, type TaskEnd, type TaskStart } from './tasks.js';

/**
 * The rules of decision 043, as a traveller would meet them. Each test is one journey; the ends
 * recorded are what the owner's dashboard will count.
 */
function harness() {
  const starts: TaskStart[] = [];
  const ends: TaskEnd[] = [];
  let n = 0;
  const engine = createTaskEngine(
    { start: (t) => starts.push(t), end: (t) => ends.push(t) },
    () => `t${String((n += 1))}`,
  );
  return { engine, starts, ends };
}
const off: NetworkState = 'offline';
const on: NetworkState = 'online';

describe('खाना', () => {
  it('a search, a kitchen read for a while: satisfied', () => {
    const { engine, starts, ends } = harness();
    engine.screen({ screen: 'food', pillar: 'food' }, 0, off);
    engine.question({ intent: 'food', failure: null, resultCount: 6, dietary: true }, 1000, off);
    engine.screen({ screen: 'menu', id: 'o1', pillar: 'food' }, 2000, off);
    engine.screen({ screen: 'home', pillar: 'home' }, 2000 + MENU_DWELL_MS, off);
    engine.closeAll(20_000, off);
    expect(starts.map((s) => s.kind)).toEqual(['food_dietary_search']);
    expect(ends).toMatchObject([
      { kind: 'food_dietary_search', outcome: 'satisfied', net: 'offline' },
    ]);
  });

  it('a search that found nothing, and nothing opened: failed', () => {
    const { engine, ends } = harness();
    engine.question({ intent: 'food', failure: 'nothing-in-pack', resultCount: 0 }, 0, on);
    engine.closeAll(5000, on);
    expect(ends).toMatchObject([{ kind: 'food_discovery', outcome: 'failed' }]);
  });

  it('a search that found nothing, rescued by a kitchen from the fallback list', () => {
    const { engine, ends } = harness();
    engine.question({ intent: 'food', failure: 'nothing-in-pack', resultCount: 0 }, 0, on);
    engine.screen({ screen: 'menu', id: 'o2', pillar: 'food' }, 1000, on);
    engine.screen({ screen: 'map', id: 'outlet:o2', pillar: 'food' }, 3000, on);
    engine.closeAll(4000, on);
    expect(ends).toMatchObject([{ outcome: 'satisfied' }]);
  });

  it('a kitchen glanced at and left at once: abandoned', () => {
    const { engine, ends } = harness();
    engine.question({ intent: 'food', failure: null, resultCount: 3 }, 0, on);
    engine.screen({ screen: 'menu', id: 'o1', pillar: 'food' }, 1000, on);
    engine.screen({ screen: 'food', pillar: 'food' }, 2000, on);
    engine.closeAll(3000, on);
    expect(ends).toMatchObject([{ outcome: 'abandoned' }]);
  });

  it('time with the app hidden does not count as reading a menu', () => {
    const { engine, ends } = harness();
    engine.screen({ screen: 'menu', id: 'o1', pillar: 'food' }, 0, on);
    engine.hide(1000);
    engine.show(600_000);
    engine.screen({ screen: 'food', pillar: 'food' }, 601_000, on);
    engine.closeAll(602_000, on);
    expect(ends).toMatchObject([{ kind: 'restaurant_menu', outcome: 'abandoned' }]);
  });

  it('a new search closes the one before it', () => {
    const { engine, ends } = harness();
    engine.question({ intent: 'food', failure: null, resultCount: 3 }, 0, on);
    engine.question({ intent: 'food', failure: null, resultCount: 3 }, 5000, on);
    expect(ends).toMatchObject([{ taskId: 't1', outcome: 'abandoned' }]);
  });
});

describe('जाना', () => {
  it('a place chosen, then the steps: satisfied, and it keeps the network it started in', () => {
    const { engine, ends } = harness();
    engine.screen({ screen: 'options', id: 'karama', pillar: 'go' }, 0, off);
    engine.screen({ screen: 'steps', id: 'karama', pillar: 'go' }, 4000, on);
    engine.closeAll(10_000, on);
    expect(ends).toMatchObject([
      { kind: 'transport_route', outcome: 'satisfied', net: 'offline', netAtEnd: 'online' },
    ]);
  });

  it('a place not recognised: failed — unless one is then chosen', () => {
    const lost = harness();
    lost.engine.question({ intent: 'route', failure: 'unresolved-place' }, 0, on);
    lost.engine.closeAll(5000, on);
    expect(lost.ends).toMatchObject([{ outcome: 'failed' }]);

    const found = harness();
    found.engine.question({ intent: 'route', failure: 'unresolved-place' }, 0, on);
    found.engine.screen({ screen: 'options', id: 'burjuman', pillar: 'go' }, 3000, on);
    found.engine.screen({ screen: 'taxi', id: 'burjuman', pillar: 'go' }, 5000, on);
    found.engine.closeAll(9000, on);
    expect(found.ends).toMatchObject([{ outcome: 'satisfied', contentId: 'burjuman' }]);
    expect(found.starts).toHaveLength(1);
  });

  it('options looked at and left: abandoned', () => {
    const { engine, ends } = harness();
    engine.screen({ screen: 'options', id: 'karama', pillar: 'go' }, 0, on);
    engine.closeAll(5000, on);
    expect(ends).toMatchObject([{ outcome: 'abandoned' }]);
  });
});

describe('जानना, बोलना and the traveller’s own things', () => {
  it('an attraction read, then जाना pressed on it: both tasks answered', () => {
    const { engine, ends } = harness();
    engine.screen({ screen: 'place', id: 'burj-khalifa', pillar: 'know' }, 0, on);
    engine.screen({ screen: 'options', id: 'burj-khalifa', pillar: 'go' }, 3000, on);
    engine.screen({ screen: 'steps', id: 'burj-khalifa', pillar: 'go' }, 6000, on);
    engine.closeAll(9000, on);
    expect(ends).toMatchObject([
      { kind: 'attraction_information', outcome: 'satisfied' },
      { kind: 'transport_route', outcome: 'satisfied' },
    ]);
  });

  it('a recording that heard nothing fails; the Arabic screen satisfies', () => {
    const { engine, ends } = harness();
    engine.screen({ screen: 'bolna', pillar: 'home' }, 0, on);
    engine.question({ intent: 'bolna', failure: 'no-speech' }, 1000, on);
    engine.closeAll(2000, on);
    engine.screen({ screen: 'bolna', pillar: 'home' }, 3000, on);
    engine.screen({ screen: 'bolnaArabic', pillar: 'home' }, 9000, on);
    engine.closeAll(12_000, on);
    expect(ends).toMatchObject([
      { kind: 'language_assistance', outcome: 'failed' },
      { kind: 'language_assistance', outcome: 'satisfied' },
    ]);
  });

  it('a document opened is a document found', () => {
    const { engine, ends } = harness();
    engine.screen({ screen: 'docView', id: 'd1', pillar: 'docs' }, 0, off);
    engine.closeAll(2000, off);
    expect(ends).toMatchObject([{ kind: 'document_access', outcome: 'satisfied', net: 'offline' }]);
  });
});
