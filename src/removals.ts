// Sends removals one at a time and records how each went.
import type { Store } from './store';
import type { Adapter, Post, Removal } from './types';

const GAP_MS = 1500;

export interface Removals {
  list: () => Removal[];
  removedCount: () => number;
  // A failed removal is not active, so it can be tried again.
  isActive: (id: string) => boolean;
  isTracked: (id: string) => boolean;
  track: (id: string, post: Post | undefined) => void;
  forget: (id: string) => void;
  send: (id: string) => void;
  lastError: () => string | undefined;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function describe(id: string, post: Post | undefined): Pick<Removal, 'url' | 'label'> {
  if (post === undefined) return { url: `https://x.com/i/status/${id}`, label: `Left from last time (${id})` };
  return { url: post.url, label: `@${post.handle}: ${post.text.slice(0, 80)}` };
}

export function createRemovals(adapter: Adapter, store: Store, changed: () => void): Removals {
  const removals = new Map<string, Removal>();
  let removed = 0;
  let error: string | undefined;
  let queue: Promise<void> = Promise.resolve();

  function track(id: string, post: Post | undefined): Removal {
    const entry: Removal = { id, ...describe(id, post), state: 'waiting' };
    removals.delete(id);
    removals.set(id, entry);
    return entry;
  }

  async function sendNow(entry: Removal): Promise<void> {
    entry.state = 'sending';
    changed();
    try {
      await adapter.remove(entry.id);
      await store.clearRemoval(entry.id);
      removed++;
      entry.state = 'removed';
      error = undefined;
    } catch (failure) {
      // Stays pending; tried again on the next page load.
      entry.state = 'failed';
      error = failure instanceof Error ? failure.message : String(failure);
    }
    changed();
    await sleep(GAP_MS);
  }

  return {
    list: () => [...removals.values()].reverse(),
    removedCount: () => removed,
    isActive: (id) => {
      const state = removals.get(id)?.state;
      return state !== undefined && state !== 'failed';
    },
    isTracked: (id) => removals.has(id),
    track(id, post) {
      track(id, post);
    },
    forget(id) {
      removals.delete(id);
    },
    send(id) {
      const entry = removals.get(id) ?? track(id, undefined);
      queue = queue.then(() => sendNow(entry));
    },
    lastError: () => error,
  };
}
