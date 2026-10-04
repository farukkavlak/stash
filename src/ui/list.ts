// A category's posts, shown in place of the platform's list.
import type { Category } from '../store';
import type { Post } from '../types';
import { el, link, picture } from './dom';
import { startDrag } from './drag';
import { createPicker } from './picker';
import { POST_CSS, postExtras } from './post';
import { attachStyled } from './theme';

export interface ListEntry {
  post: Post;
  category: string | undefined;
}

export interface ListHandlers {
  setCategory: (id: string, category: string | undefined) => void;
  remove: (id: string) => void;
  hover: (id: string | undefined) => void;
  more: () => void;
}

export interface ListView {
  host: HTMLElement;
  // Redraws only when key changes.
  update: (entries: ListEntry[], categories: Category[], title: string, more: boolean, key: string) => void;
}

const PAGE = 100;

const CSS = `
  .search { display: block; width: calc(100% - 32px); margin: 12px 16px; padding: 10px 16px;
    border: 1px solid var(--line); border-radius: 999px; background: none; color: var(--text);
    font-size: 15px; outline: none; }
  .search:focus { border-color: var(--accent); }
  .empty { padding: 40px 32px; color: var(--muted); font-size: 15px; text-align: center; }
  .post { display: flex; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--line); }
  .post:hover { background: var(--hover); }
  .avatar { flex: 0 0 40px; width: 40px; height: 40px; border-radius: 999px; background: var(--line); object-fit: cover; }
  .body { flex: 1; min-width: 0; }
  .head { display: flex; align-items: baseline; gap: 4px; font-size: 15px; color: var(--muted); }
  .head .name { color: var(--text); font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .head span { white-space: nowrap; }
  .text { margin: 2px 0 12px; font-size: 15px; line-height: 20px; white-space: pre-wrap; overflow-wrap: anywhere; }
  .bar { display: flex; align-items: center; gap: 8px; }
  .bar a, .bar .remove { padding: 2px 10px; border: 1px solid var(--line); border-radius: 999px;
    background: none; color: var(--muted); font-size: 13px; text-decoration: none; cursor: pointer; }
  .bar a:hover { color: var(--accent); border-color: var(--accent); }
  .bar .remove:hover { color: var(--danger); border-color: var(--danger); }
  .more { display: block; width: 100%; padding: 16px; border: 0; background: none; color: var(--accent);
    font-size: 15px; cursor: pointer; }
  .more:hover { background: var(--hover); }
`;

function matches(post: Post, query: string): boolean {
  return query === '' || `${post.text} ${post.author} ${post.handle}`.toLowerCase().includes(query);
}

function postHead(post: Post): HTMLElement {
  const head = el('div', 'head');
  head.append(el('span', 'name', post.author), el('span', '', `@${post.handle}`));
  if (post.date !== undefined) {
    head.append(el('span', '', `· ${new Date(post.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}`));
  }
  return head;
}

export function createListView(handlers: ListHandlers): ListView {
  const host = document.createElement('div');
  host.dataset.stash = 'list';
  const root = attachStyled(host, CSS + POST_CSS);
  const search = el('input', 'search');
  const posts = el('div', '');
  root.append(search, posts);

  let entries: ListEntry[] = [];
  let categories: Category[] = [];
  let more = false;
  let shown = PAGE;
  let drawnKey = '';

  // Load more near the end, like the platform's own list.
  const watcher = new IntersectionObserver(
    (seen) => {
      if (!seen.some((entry) => entry.isIntersecting)) return;
      if (matching().length > shown) {
        shown += PAGE;
        draw();
      } else if (more) handlers.more();
    },
    { rootMargin: '800px' },
  );

  function row({ post, category }: ListEntry): HTMLElement {
    const picker = createPicker(post.id, (next) => handlers.setCategory(post.id, next));
    picker.update(categories, category, true);
    const remove = el('button', 'remove', 'Remove bookmark');
    remove.addEventListener('click', () => handlers.remove(post.id));
    const bar = el('div', 'bar');
    bar.append(picker.host, link(post.url, 'Open'), remove);
    const body = el('div', 'body');
    body.append(postHead(post), el('div', 'text', post.text), ...postExtras(post), bar);

    const article = el('article', 'post');
    article.append(picture(post.avatar, 'avatar'), body);
    article.draggable = true;
    article.addEventListener('dragstart', (event) => startDrag(event, post.id));
    article.addEventListener('mouseenter', () => handlers.hover(post.id));
    article.addEventListener('mouseleave', () => handlers.hover(undefined));
    return article;
  }

  function matching(): ListEntry[] {
    const query = search.value.trim().toLowerCase();
    return entries.filter((entry) => matches(entry.post, query));
  }

  function footer(left: number): HTMLElement {
    const label = left > 0 ? `Show more (${left} left)` : more ? 'Loading more from X…' : 'That is all.';
    const button = el('button', 'more', label);
    button.addEventListener('click', () => {
      if (left > 0) shown += PAGE;
      else if (more) handlers.more();
      draw();
    });
    watcher.disconnect();
    if (left > 0 || more) watcher.observe(button);
    return button;
  }

  function draw(): void {
    const found = matching();
    if (found.length === 0 && !more) {
      watcher.disconnect();
      posts.replaceChildren(el('div', 'empty', search.value.trim() === '' ? 'Nothing here yet.' : 'No post matches.'));
      return;
    }
    posts.replaceChildren(...found.slice(0, shown).map(row), footer(Math.max(found.length - shown, 0)));
  }

  search.addEventListener('input', () => {
    shown = PAGE;
    draw();
  });

  return {
    host,
    update(nextEntries, nextCategories, title, nextMore, key) {
      search.placeholder = `Search ${title}`;
      if (key === drawnKey) return;
      if (key.split(':')[0] !== drawnKey.split(':')[0]) shown = PAGE;
      drawnKey = key;
      entries = nextEntries;
      categories = nextCategories;
      more = nextMore;
      draw();
    },
  };
}
