import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRemovals } from '../src/removals';
import { createSession, REMOVE_DELAY_MS } from '../src/session';
import { fakeAdapter, freshStore, post } from './fakes';

async function setup() {
  const { store } = await freshStore();
  const adapter = fakeAdapter();
  const removals = createRemovals(adapter, store, () => undefined);
  const session = createSession(adapter, store, removals, () => undefined);
  session.receive(['1', '2', '3', '4', '5', '6', '7'].map(post));
  return { store, adapter, removals, session };
}

// Lets queued promises and the gap between removals run.
async function settle(): Promise<void> {
  await vi.runAllTimersAsync();
}

describe('session', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the posts in the order they came', async () => {
    const { session } = await setup();
    expect(session.current()?.id).toBe('1');
    expect(session.queued()).toBe(7);
  });

  it('holds a removal back until it is three decisions old', async () => {
    const { session, adapter } = await setup();
    session.decide('remove', undefined);
    session.decide('keep', undefined);
    session.decide('keep', undefined);
    await settle();
    expect(adapter.removed).toEqual([]);
    session.decide('keep', undefined);
    await settle();
    expect(adapter.removed).toEqual(['1']);
  });

  it('undoes a removal before it is sent', async () => {
    const { session, adapter, store } = await setup();
    session.decide('remove', undefined);
    session.undo();
    session.sendHeld();
    await settle();
    expect(adapter.removed).toEqual([]);
    expect(store.isPendingRemoval('1')).toBe(false);
    expect(session.current()?.id).toBe('1');
  });

  it('keeps a post in the category it was given', async () => {
    const { session, store } = await setup();
    const shop = store.categories()[2]?.id;
    session.decide('keep', shop);
    expect(store.kept('1')?.category).toBe(shop);
    expect(session.current()?.id).toBe('2');
  });

  it('sends a removal made on the page after the delay', async () => {
    const { session, adapter } = await setup();
    session.removeSoon('4');
    await vi.advanceTimersByTimeAsync(REMOVE_DELAY_MS - 1);
    expect(adapter.removed).toEqual([]);
    await settle();
    expect(adapter.removed).toEqual(['4']);
  });

  it("puts a page removal's post back when it is undone", async () => {
    const { session, adapter, store } = await setup();
    const movie = store.categories()[1]?.id;
    session.assign(post('4'), movie);
    const undo = session.removeSoon('4');
    expect(store.isKept('4')).toBe(false);
    undo?.();
    await settle();
    expect(adapter.removed).toEqual([]);
    expect(store.kept('4')?.category).toBe(movie);
  });

  it('lists only the posts with no category that are still bookmarked', async () => {
    const { session, store } = await setup();
    session.assign(post('1'), store.categories()[0]?.id);
    session.removeSoon('2');
    expect(session.unsorted().map((entry) => entry.id)).toEqual(['3', '4', '5', '6', '7']);
  });

  it('stops asking for more once the platform has no more', async () => {
    const { session, adapter } = await setup();
    adapter.end('done');
    const before = adapter.loads;
    session.loadMore();
    expect(adapter.loads).toBe(before);
    expect(session.hasMore()).toBe(false);
  });
});
