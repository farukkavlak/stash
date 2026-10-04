import { describe, expect, it } from 'vitest';
import { MAX_CATEGORIES, openStore } from '../src/store';
import { fakeStorage, freshStore, post } from './fakes';

describe('store', () => {
  it('starts with the default categories and saves them', async () => {
    const { store, data } = await freshStore();
    expect(store.categories().map((category) => category.name)).toEqual(['meme', 'movie', 'shop', 'weekly read']);
    expect(data['x:categories']).toEqual(store.categories());
  });

  it('keeps a post under a key of its own and reads it back', async () => {
    const { store, data } = await freshStore();
    const meme = store.categories()[0]?.id;
    await store.keep(post('1'), meme);
    expect(Object.keys(data)).toContain('x:item:1');
    const reopened = await openStore('x');
    expect(reopened.kept('1')?.category).toBe(meme);
  });

  it('reads posts stored by the first versions', async () => {
    const data = fakeStorage();
    data['x:item:5'] = { item: post('5'), category: undefined, savedAt: '2026-01-01T00:00:00.000Z' };
    data['x:kept'] = ['6'];
    const store = await openStore('x');
    expect(store.kept('5')?.keptAt).toBe('2026-01-01T00:00:00.000Z');
    expect(store.isKept('6')).toBe(true);
    expect(store.keptCount()).toBe(2);
  });

  it('moves the posts of a deleted category to no category', async () => {
    const { store } = await freshStore();
    const movie = store.categories()[1]?.id;
    await store.keep(post('1'), movie);
    await store.deleteCategory(movie ?? '');
    expect(store.kept('1')?.category).toBeUndefined();
    expect(store.categories().map((category) => category.name)).not.toContain('movie');
  });

  it('stops adding categories at the number keys there are', async () => {
    const { store } = await freshStore();
    for (let index = 0; index < 20; index++) await store.addCategory(`c${index}`);
    expect(store.categories()).toHaveLength(MAX_CATEGORIES);
  });

  it('remembers removals that were not confirmed', async () => {
    const { store } = await freshStore();
    await store.markForRemoval('9');
    expect((await openStore('x')).isPendingRemoval('9')).toBe(true);
    await store.clearRemoval('9');
    expect((await openStore('x')).pendingRemovals()).toEqual([]);
  });
});
