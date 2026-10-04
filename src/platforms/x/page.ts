// Finds parts of X's page. Only data-testid is used: class names change every release.
import type { PagePost } from '../../types';

const POST = 'article[data-testid="tweet"]';

function primaryColumn(): HTMLElement | undefined {
  return document.querySelector<HTMLElement>('[data-testid="primaryColumn"]') ?? undefined;
}

// The row with X's "Bookmarks / Likes" tabs.
export function findTabBar(): HTMLElement | undefined {
  const tabs = primaryColumn()?.querySelector('[data-testid="ScrollSnap-SwipeableList"]');
  return tabs?.closest('nav')?.parentElement ?? undefined;
}

export function findSidebar(): HTMLElement | undefined {
  return document.querySelector<HTMLElement>('[data-testid="sidebarColumn"]') ?? undefined;
}

export function findTimeline(): HTMLElement | undefined {
  return primaryColumn()?.querySelector<HTMLElement>('section[role="region"]') ?? undefined;
}

function postId(article: Element): string | undefined {
  // The first timestamp link is the post's own; a quote's comes later.
  const href = article.querySelector('a[href*="/status/"] time')?.closest('a')?.getAttribute('href');
  return href === null || href === undefined ? undefined : /\/status\/(\d+)/.exec(href)?.[1];
}

function pagePost(article: HTMLElement): PagePost | undefined {
  const id = postId(article);
  const button = article.querySelector('[data-testid="removeBookmark"], [data-testid="bookmark"]');
  const actions = button?.closest<HTMLElement>('[role="group"]') ?? undefined;
  return id === undefined || actions === undefined ? undefined : { id, element: article, actions };
}

export function findPagePosts(): PagePost[] {
  const articles = findTimeline()?.querySelectorAll<HTMLElement>(POST) ?? [];
  return [...articles].map(pagePost).filter((post) => post !== undefined);
}

export function pagePostAt(node: Element): PagePost | undefined {
  const article = node.closest<HTMLElement>(POST);
  return article === null || findTimeline()?.contains(article) !== true ? undefined : pagePost(article);
}
