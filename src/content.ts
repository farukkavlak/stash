// Entry point: builds the parts and wires them together.
import { mountControls } from './controls';
import { createRemovals } from './removals';
import { createSession, REMOVE_DELAY_MS } from './session';
import { openStore, type Store } from './store';
import type { Adapter, Post } from './types';
import { createSorter } from './ui/sorter';
import { showToast } from './ui/toast';
import { createXAdapter } from './platforms/x/adapter';

function start(adapter: Adapter, store: Store, early: Post[]): void {
  const removals = createRemovals(adapter, store, changed);
  const session = createSession(adapter, store, removals, changed);

  const sorter = createSorter({
    keep: (category) => session.decide('keep', category),
    remove: () => session.decide('remove', undefined),
    undo: session.undo,
    retry: session.loadMore,
    open: () => {
      render();
      session.fill();
    },
    close: session.sendHeld,
  });

  const controls = mountControls(adapter, store, {
    post: session.post,
    unsorted: session.unsorted,
    hasMore: session.hasMore,
    loadMore: session.loadMore,
    assign: session.assign,
    remove(id) {
      const undo = session.removeSoon(id);
      if (undo !== undefined) showToast('Bookmark removed', REMOVE_DELAY_MS, undo);
    },
    sort: sorter.show,
    changed,
  });

  function render(): void {
    sorter.render({
      post: session.current(),
      queued: session.queued(),
      kept: store.keptCount(),
      removed: removals.removedCount(),
      status: session.status(),
      removals: removals.list(),
      categories: store.categories(),
    });
  }

  function changed(): void {
    controls.refresh();
    render();
  }

  adapter.onPosts(session.receive);
  session.receive(early);

  // Removals from a tab that closed before sending them.
  for (const id of store.pendingRemovals()) removals.send(id);

  // The corner button is a fallback for when the tabs can't be placed.
  window.setInterval(() => sorter.setLauncherVisible(adapter.isSavedPage() && !controls.mounted()), 1000);
}

// The script starts before the page has a body.
function bodyReady(): Promise<void> {
  if (document.readyState !== 'loading') return Promise.resolve();
  return new Promise((resolve) => document.addEventListener('DOMContentLoaded', () => resolve(), { once: true }));
}

// Listen before storage is read, or X's first answer is missed.
const adapter = createXAdapter();
const early: Post[] = [];
adapter.onPosts((posts) => early.push(...posts));

void Promise.all([openStore(adapter.name), bodyReady()]).then(([store]) => start(adapter, store, early));
