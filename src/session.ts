// The posts seen so far, the one-by-one queue and its undo.
import type { Removals } from './removals';
import type { Store } from './store';
import type { Adapter, Post } from './types';

// Removals wait this many decisions, so undo never has to re-add a bookmark.
const UNDO_WINDOW = 3;
// Removals made on the page wait this long, for undo.
export const REMOVE_DELAY_MS = 5000;
const LOW_WATER = 5;
const LOAD_TIMEOUT_MS = 8000;

interface Decision {
  post: Post;
  action: 'keep' | 'remove';
  sent: boolean;
}

export interface Session {
  current: () => Post | undefined;
  queued: () => number;
  status: () => string;
  post: (id: string) => Post | undefined;
  // Still bookmarked and with no category, in the platform's order.
  unsorted: () => Post[];
  hasMore: () => boolean;
  loadMore: () => void;
  fill: () => void;
  receive: (posts: Post[]) => void;

  decide: (action: Decision['action'], category: string | undefined) => void;
  undo: () => void;
  // Sends the removals held back for undo.
  sendHeld: () => void;

  assign: (post: Post, category: string | undefined) => void;
  // Returns an undo, or nothing if already removed.
  removeSoon: (id: string) => (() => void) | undefined;
}

export function createSession(adapter: Adapter, store: Store, removals: Removals, changed: () => void): Session {
  const queue: Post[] = [];
  const seen = new Set<string>();
  const known = new Map<string, Post>();
  const history: Decision[] = [];
  let message = 'Loading your bookmarks…';
  let exhausted = false;
  let loadTimer: number | undefined;

  function dequeue(id: string): number {
    const index = queue.findIndex((post) => post.id === id);
    if (index !== -1) queue.splice(index, 1);
    return index;
  }

  function loadMore(): void {
    if (exhausted) return;
    adapter.loadMore();
    clearTimeout(loadTimer);
    loadTimer = setTimeout(() => {
      if (queue.length > 0) return;
      message = 'Nothing more came from the platform. Press R to try again.';
      changed();
    }, LOAD_TIMEOUT_MS);
  }

  function sendHeld(keep: number): void {
    for (const decision of history.slice(0, Math.max(history.length - keep, 0))) {
      if (decision.action !== 'remove' || decision.sent) continue;
      decision.sent = true;
      removals.send(decision.post.id);
    }
  }

  function fill(): void {
    if (queue.length < LOW_WATER) loadMore();
  }

  function receive(posts: Post[]): void {
    for (const post of posts) {
      known.set(post.id, post);
      void store.updatePost(post);
      if (seen.has(post.id) || store.isKept(post.id)) continue;
      seen.add(post.id);
      if (!store.isPendingRemoval(post.id)) queue.push(post);
    }
    if (queue.length > 0) message = '';
    fill();
    changed();
  }

  adapter.onEnd((reason) => {
    clearTimeout(loadTimer);
    exhausted = reason === 'done';
    message = exhausted ? 'That is all your bookmarks.' : `Could not load more: ${reason}`;
    changed();
  });

  return {
    current: () => queue[0],
    queued: () => queue.length,
    status: () => removals.lastError() ?? message,
    post: (id) => store.kept(id)?.post ?? known.get(id),
    unsorted: () =>
      [...known.values()].filter((post) => !removals.isTracked(post.id) && store.kept(post.id)?.category === undefined),
    hasMore: () => !exhausted,
    loadMore,
    fill,
    receive,

    decide(action, category) {
      const post = queue.shift();
      if (post === undefined) return;
      history.push({ post, action, sent: false });
      if (action === 'keep') void store.keep(post, category);
      else {
        void store.markForRemoval(post.id);
        removals.track(post.id, post);
      }
      sendHeld(UNDO_WINDOW);
      fill();
      changed();
    },

    undo() {
      const last = history.at(-1);
      if (last === undefined) return;
      if (last.sent) {
        message = 'That one is already removed on the platform.';
        changed();
        return;
      }
      history.pop();
      if (last.action === 'keep') void store.unkeep(last.post.id);
      else {
        void store.clearRemoval(last.post.id);
        removals.forget(last.post.id);
      }
      queue.unshift(last.post);
      message = '';
      changed();
    },

    sendHeld: () => sendHeld(0),

    assign(post, category) {
      if (store.kept(post.id) === undefined) void store.keep(post, category);
      else void store.setCategory(post.id, category);
      dequeue(post.id);
      changed();
    },

    removeSoon(id) {
      if (removals.isActive(id)) return undefined;
      const kept = store.kept(id);
      const post = kept?.post ?? known.get(id);
      const queued = dequeue(id);
      removals.track(id, post);
      if (kept !== undefined) void store.unkeep(id);
      void store.markForRemoval(id);
      const timer = setTimeout(() => removals.send(id), REMOVE_DELAY_MS);
      changed();
      return () => {
        clearTimeout(timer);
        removals.forget(id);
        void store.clearRemoval(id);
        if (kept !== undefined) void store.keep(kept.post, kept.category);
        if (queued !== -1 && post !== undefined) queue.unshift(post);
        changed();
      };
    },
  };
}
