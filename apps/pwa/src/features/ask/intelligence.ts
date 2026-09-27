import type { EventPillar, NetworkState } from '@saathi/shared';
import { createActiveClock } from './activeTime.js';
import { recordAppEvent, touchSession } from './appEvents.js';
import { currentNetwork, onNetworkChange, recheckNetwork } from './network.js';
import { createTaskEngine, type QuestionSeen, type ScreenSeen, type TaskEngine } from './tasks.js';

/**
 * Product intelligence on the phone (decision 043): sessions, active time, network changes and
 * tasks, recorded as they happen and sent with the question log. Started once from `main.tsx`;
 * the app tells it which screen is showing (`noteScreen`) and the question log tells it how each
 * search went (`noteQuestion`). Nothing here is on a traveller's path: every call is fire and
 * forget, and nothing waits on the network.
 */

const TICK_MS = 5_000;
const FLUSH_MS = 60_000;
const RECHECK_MS = 30_000;

let engine: TaskEngine | null = null;
let pillar: EventPillar = 'home';

function visible(): boolean {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}

/** The screen on show, from the router. A no-op until `startProductIntelligence` has run. */
export function noteScreen(seen: ScreenSeen): void {
  pillar = seen.pillar;
  engine?.screen(seen, Date.now(), currentNetwork());
}

/** How a search went, from the question log. A no-op until started. */
export function noteQuestion(seen: QuestionSeen): void {
  engine?.question(seen, Date.now(), currentNetwork());
}

export function startProductIntelligence(where: {
  readonly region: string;
  readonly installed: boolean;
  readonly via: string;
}): () => void {
  const sessionStart = (): void => {
    void recordAppEvent({
      name: 'session_start',
      pillar,
      meta: { region: where.region, installed: where.installed, via: where.via },
    });
  };

  const tasks = createTaskEngine({
    start: (task) => {
      void recordAppEvent({
        name: 'task_start',
        pillar: task.pillar,
        net: task.net,
        taskId: task.taskId,
        taskKind: task.kind,
        ...(task.contentId === undefined ? {} : { contentId: task.contentId }),
      });
    },
    end: (task) => {
      void recordAppEvent({
        name: 'task_end',
        pillar: task.pillar,
        net: task.net,
        taskId: task.taskId,
        taskKind: task.kind,
        outcome: task.outcome,
        seconds: task.seconds,
        ...(task.contentId === undefined ? {} : { contentId: task.contentId }),
        meta: { netAtEnd: task.netAtEnd },
      });
    },
  });
  engine = tasks;

  if (touchSession().started) sessionStart();

  const clock = createActiveClock(Date.now());
  const flush = (): void => {
    for (const row of clock.flush()) {
      void recordAppEvent({
        name: 'active',
        pillar: row.pillar,
        net: row.net,
        seconds: row.seconds,
      });
    }
  };

  const interact = (): void => {
    clock.interact(Date.now());
  };
  const kinds = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;
  for (const kind of kinds)
    window.addEventListener(kind, interact, { passive: true, capture: true });

  let previous: NetworkState = currentNetwork();
  const unwatch = onNetworkChange((state) => {
    void recordAppEvent({ name: 'net_change', net: state, meta: { from: previous, to: state } });
    previous = state;
  });

  const onVisibility = (): void => {
    const now = Date.now();
    if (!visible()) {
      clock.tick(now, true, pillar, currentNetwork(now));
      flush();
      tasks.hide(now);
      touchSession(now);
      return;
    }
    if (touchSession(now).started) {
      // Back after a long gap: the last session's open tasks close as they stood.
      tasks.closeAll(now, currentNetwork(now));
      sessionStart();
    }
    tasks.show(now);
    clock.interact(now);
  };
  document.addEventListener('visibilitychange', onVisibility);

  const ticker = window.setInterval(() => {
    const now = Date.now();
    clock.tick(now, visible(), pillar, currentNetwork(now));
    if (visible()) touchSession(now);
  }, TICK_MS);
  const flusher = window.setInterval(flush, FLUSH_MS);
  const rechecker = window.setInterval(recheckNetwork, RECHECK_MS);

  return () => {
    for (const kind of kinds) window.removeEventListener(kind, interact, { capture: true });
    document.removeEventListener('visibilitychange', onVisibility);
    unwatch();
    window.clearInterval(ticker);
    window.clearInterval(flusher);
    window.clearInterval(rechecker);
    engine = null;
  };
}
