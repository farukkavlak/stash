import type { Adapter, Post } from '../../types';
import { onMessage, send, SOURCE, type Message } from './messages';
import { findPagePosts, findSidebar, findTabBar, findTimeline, pagePostAt } from './page';
import { parseBookmarks } from './parse';

interface Waiting {
  resolve: () => void;
  reject: (error: Error) => void;
}

// Includes modules loaded later, which have no script tag.
function loadedScripts(): string[] {
  const tags = [...document.scripts].map((script) => script.src);
  const loaded = performance.getEntriesByType('resource').map((entry) => entry.name);
  return [...new Set([...tags, ...loaded])].filter((url) => url.endsWith('.js'));
}

// X's request ids change every release.
async function findQueryId(operation: string): Promise<string | undefined> {
  const answer: unknown = await chrome.runtime.sendMessage({ kind: 'findQueryId', operation, scripts: loadedScripts() });
  const queryId = (answer as { queryId?: unknown } | undefined)?.queryId;
  return typeof queryId === 'string' ? queryId : undefined;
}

export function createXAdapter(): Adapter {
  const waiting = new Map<number, Waiting>();
  let nextRequestId = 1;
  let postsListener: (posts: Post[]) => void = () => {};
  let endListener: (reason: string) => void = () => {};
  let deleteQueryId: Promise<string | undefined> | undefined;

  function settle(message: Extract<Message, { kind: 'removed' }>): void {
    const entry = waiting.get(message.requestId);
    if (entry === undefined) return;
    waiting.delete(message.requestId);
    if (message.ok) entry.resolve();
    else entry.reject(new Error(message.error ?? 'Remove failed'));
  }

  onMessage((message) => {
    if (message.kind === 'posts') postsListener(parseBookmarks(message.body));
    if (message.kind === 'removed') settle(message);
    if (message.kind === 'end') endListener(message.reason);
  });

  return {
    name: 'x',
    isSavedPage: () => /^\/i\/(bookmarks|history)\/?$/.test(window.location.pathname),
    tabBar: findTabBar,
    timeline: findTimeline,
    sidebar: findSidebar,
    pagePosts: findPagePosts,
    pagePostAt,
    onPosts(listener) {
      postsListener = listener;
    },
    onEnd(listener) {
      endListener = listener;
    },
    loadMore() {
      send({ source: SOURCE, kind: 'loadMore' });
    },
    async remove(postId) {
      // A fallback: the hook may know the id already.
      deleteQueryId ??= findQueryId('DeleteBookmark');
      const queryId = await deleteQueryId;
      if (queryId === undefined) deleteQueryId = undefined;
      const requestId = nextRequestId++;
      const done = new Promise<void>((resolve, reject) => waiting.set(requestId, { resolve, reject }));
      send({ source: SOURCE, kind: 'remove', requestId, postId, queryId });
      return done;
    },
  };
}
