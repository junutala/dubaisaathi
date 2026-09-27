import type { EventPillar, NetworkState, TaskKind, TaskOutcome } from '@saathi/shared';

/**
 * What a traveller was trying to do, and whether Saathi appears to have answered it — by rules
 * written down in decision 043, never by a model. The screens a traveller moves through and the
 * outcome of each search are the only inputs; the output is one `task_start` and one `task_end`
 * per task.
 *
 * "Satisfied" is an inference and is labelled as one: it means the traveller reached what the
 * task exists to reach (a kitchen's menu read for a while, a route's steps, a taxi screen, an
 * attraction read, a sentence in Arabic). It cannot mean they were happy, and the dashboard says
 * so.
 *
 * The rules, per pillar:
 * - खाना: a search starts a task (dietary when a constraint was on). Opening a kitchen's menu for
 *   MENU_DWELL_MS, or its map, satisfies it. A search that found nothing fails, unless a menu is
 *   opened afterwards from the fallback list. Opening a menu with no search is a menu task.
 * - जाना: choosing a place (the options screen) starts a task; the steps, the taxi screen or the
 *   map satisfy it. A place that could not be recognised fails, unless one is chosen afterwards.
 * - जानना: an attraction or a topic read for READ_DWELL_MS satisfies its task; pressing जाना on
 *   an attraction does too.
 * - बोलना: the Arabic screen satisfies; a recording that heard nothing, or was redone at once, fails.
 * - A document opened is a document found; the hotel's card read for HOTEL_DWELL_MS is too.
 * - A task still open when another of its pillar starts, or when the session ends, is closed then:
 *   satisfied if it was, failed if it failed and nothing rescued it, abandoned otherwise.
 */

export const MENU_DWELL_MS = 8_000;
export const READ_DWELL_MS = 10_000;
export const HOTEL_DWELL_MS = 5_000;

/** A screen, as the task rules need to know it: which one, what it shows, which pillar. */
export interface ScreenSeen {
  readonly screen: string;
  readonly id?: string;
  readonly pillar: EventPillar;
}

/** A search's outcome, from the question log. */
export interface QuestionSeen {
  readonly intent: string;
  readonly failure: string | null;
  readonly resultCount?: number;
  readonly dietary?: boolean;
}

export interface TaskStart {
  readonly taskId: string;
  readonly kind: TaskKind;
  readonly pillar: EventPillar;
  readonly net: NetworkState;
  readonly contentId?: string;
}

export interface TaskEnd extends TaskStart {
  readonly outcome: TaskOutcome;
  readonly seconds: number;
  /** The network state when it ended, when that differs from when it started. */
  readonly netAtEnd: NetworkState;
}

export interface TaskSink {
  start(task: TaskStart): void;
  end(task: TaskEnd): void;
}

interface Open {
  readonly taskId: string;
  readonly kind: TaskKind;
  readonly pillar: EventPillar;
  readonly net: NetworkState;
  readonly startedAt: number;
  contentId: string | undefined;
  satisfied: boolean;
  failed: boolean;
}

export interface TaskEngine {
  screen(seen: ScreenSeen, now: number, net: NetworkState): void;
  question(seen: QuestionSeen, now: number, net: NetworkState): void;
  /** The app went out of view: time on the current screen stops counting. */
  hide(now: number): void;
  /** The app is back in view. */
  show(now: number): void;
  /** The session ended: every open task is closed as it stands. */
  closeAll(now: number, net: NetworkState): void;
}

export function createTaskEngine(
  sink: TaskSink,
  newId: () => string = () => crypto.randomUUID(),
): TaskEngine {
  const open = new Map<EventPillar, Open>();
  let current: ScreenSeen | null = null;
  /** Visible time spent on the current screen so far. */
  let dwell = 0;
  let enteredAt: number | null = null;

  const begin = (
    kind: TaskKind,
    pillar: EventPillar,
    now: number,
    net: NetworkState,
    contentId?: string,
  ): Open => {
    close(pillar, now, net);
    const task: Open = {
      taskId: newId(),
      kind,
      pillar,
      net,
      startedAt: now,
      satisfied: false,
      failed: false,
      contentId,
    };
    open.set(pillar, task);
    sink.start({
      taskId: task.taskId,
      kind,
      pillar,
      net,
      ...(contentId === undefined ? {} : { contentId }),
    });
    return task;
  };

  function close(pillar: EventPillar, now: number, net: NetworkState): void {
    const task = open.get(pillar);
    if (task === undefined) return;
    open.delete(pillar);
    const outcome: TaskOutcome = task.satisfied
      ? 'satisfied'
      : task.failed
        ? 'failed'
        : 'abandoned';
    sink.end({
      taskId: task.taskId,
      kind: task.kind,
      pillar: task.pillar,
      net: task.net,
      ...(task.contentId === undefined ? {} : { contentId: task.contentId }),
      outcome,
      seconds: Math.round((now - task.startedAt) / 1000),
      netAtEnd: net,
    });
  }

  /** The screen being left: its visible time decides the dwell rules. */
  const leave = (now: number): void => {
    if (current === null) return;
    const spent = dwell + (enteredAt === null ? 0 : now - enteredAt);
    const task = open.get(current.pillar);
    if (task !== undefined) {
      if (current.screen === 'menu' && spent >= MENU_DWELL_MS) task.satisfied = true;
      if ((current.screen === 'place' || current.screen === 'tip') && spent >= READ_DWELL_MS) {
        task.satisfied = true;
      }
      if (current.screen === 'hotel' && spent >= HOTEL_DWELL_MS) task.satisfied = true;
    }
  };

  return {
    screen(seen, now, net) {
      if (current !== null && current.screen === seen.screen && current.id === seen.id) return;
      leave(now);
      current = seen;
      dwell = 0;
      enteredAt = now;

      const food = open.get('food');
      const go = open.get('go');
      const know = open.get('know');
      switch (seen.screen) {
        case 'menu':
          if (food === undefined) begin('restaurant_menu', 'food', now, net, seen.id);
          else {
            food.contentId ??= seen.id;
            // A kitchen opened from the list — even the fallback list after a search that found
            // nothing — rescues the search from failing; the dwell decides satisfaction.
            food.failed = false;
          }
          return;
        case 'map':
          if (seen.pillar === 'food') {
            if (food !== undefined) food.satisfied = true;
            return;
          }
          if (go !== undefined) go.satisfied = true;
          return;
        case 'options': {
          if (know !== undefined && know.contentId === seen.id) {
            // जाना pressed on an attraction: the attraction answered, and a route begins.
            know.satisfied = true;
            close('know', now, net);
          }
          if (go !== undefined && go.contentId === seen.id) {
            go.failed = false;
            return;
          }
          if (go !== undefined && go.contentId === undefined) {
            // A place not recognised, then one chosen: the same task, rescued.
            go.contentId = seen.id;
            go.failed = false;
            return;
          }
          begin('transport_route', 'go', now, net, seen.id);
          return;
        }
        case 'steps':
        case 'taxi':
          if (go !== undefined) go.satisfied = true;
          else begin('transport_route', 'go', now, net, seen.id).satisfied = true;
          return;
        case 'place':
          begin('attraction_information', 'know', now, net, seen.id);
          return;
        case 'tip':
          begin('travel_topic', 'know', now, net, seen.id);
          return;
        case 'bolna':
          if (open.get('bolna') === undefined) begin('language_assistance', 'bolna', now, net);
          return;
        case 'bolnaArabic': {
          const bolna = open.get('bolna') ?? begin('language_assistance', 'bolna', now, net);
          bolna.satisfied = true;
          bolna.failed = false;
          return;
        }
        case 'docView':
          begin('document_access', 'docs', now, net, seen.id).satisfied = true;
          return;
        case 'hotel':
          begin('hotel_reference', 'home', now, net);
          return;
        default:
          return;
      }
    },

    question(seen, now, net) {
      if (seen.intent === 'food') {
        const kind: TaskKind = seen.dietary === true ? 'food_dietary_search' : 'food_discovery';
        const task = begin(kind, 'food', now, net);
        task.failed = seen.failure === 'nothing-in-pack' || seen.resultCount === 0;
        return;
      }
      if (seen.intent === 'route' && seen.failure === 'unresolved-place') {
        begin('transport_route', 'go', now, net).failed = true;
        return;
      }
      if (seen.intent === 'bolna' && seen.failure !== null) {
        const bolna = open.get('bolna') ?? begin('language_assistance', 'bolna', now, net);
        if (!bolna.satisfied) bolna.failed = true;
      }
    },

    hide(now) {
      if (enteredAt !== null) dwell += now - enteredAt;
      enteredAt = null;
    },

    show(now) {
      enteredAt = now;
    },

    closeAll(now, net) {
      leave(now);
      current = null;
      dwell = 0;
      enteredAt = null;
      for (const pillar of [...open.keys()]) close(pillar, now, net);
    },
  };
}
