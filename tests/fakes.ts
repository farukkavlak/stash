import type { Store } from '../src/store';
import { openStore } from '../src/store';
import type { Adapter, Post } from '../src/types';

// chrome.storage.local, kept in memory.
export function fakeStorage(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const local = {
    // The store only ever asks for everything.
    get: () => Promise.resolve(structuredClone(data)),
    set: (items: Record<string, unknown>) => {
      Object.assign(data, structuredClone(items));
      return Promise.resolve();
    },
    remove: (key: string) => {
      Reflect.deleteProperty(data, key);
      return Promise.resolve();
    },
  };
  Object.assign(globalThis, { chrome: { storage: { local } } });
  return data;
}

export function post(id: string): Post {
  return { id, url: `https://x.com/ada/status/${id}`, author: 'Ada', handle: 'ada', avatar: undefined, text: `post ${id}`, date: undefined, media: [] };
}

export interface FakeAdapter extends Adapter {
  removed: string[];
  loads: number;
  end: (reason: string) => void;
}

export function fakeAdapter(): FakeAdapter {
  const adapter: FakeAdapter = {
    removed: [],
    loads: 0,
    end: () => undefined,
    name: 'x',
    isSavedPage: () => true,
    tabBar: () => undefined,
    timeline: () => undefined,
    sidebar: () => undefined,
    pagePosts: () => [],
    pagePostAt: () => undefined,
    onPosts: () => undefined,
    onEnd: (listener) => {
      adapter.end = listener;
    },
    loadMore: () => {
      adapter.loads++;
    },
    remove: (id) => {
      adapter.removed.push(id);
      return Promise.resolve();
    },
  };
  return adapter;
}

export async function freshStore(): Promise<{ store: Store; data: Record<string, unknown> }> {
  const data = fakeStorage();
  return { store: await openStore('x'), data };
}
