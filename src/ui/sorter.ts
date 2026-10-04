// The one-by-one view.
import type { Category } from '../store';
import type { Post, Removal } from '../types';
import { el, link } from './dom';
import { takeAllKeys } from './keys';
import { POST_CSS, postExtras } from './post';
import { attachStyled } from './theme';

export interface SorterState {
  post: Post | undefined;
  queued: number;
  kept: number;
  removed: number;
  status: string;
  removals: Removal[];
  categories: Category[];
}

export interface SorterHandlers {
  keep: (category: string | undefined) => void;
  remove: () => void;
  undo: () => void;
  retry: () => void;
  open: () => void;
  close: () => void;
}

export interface Sorter {
  render: (state: SorterState) => void;
  show: () => void;
  setLauncherVisible: (visible: boolean) => void;
}

type View = 'cards' | 'removed';

const CSS = `
  .launcher { position: fixed; right: 20px; bottom: 20px; z-index: 2147483646; padding: 10px 18px;
    border: 0; border-radius: 999px; background: var(--text); color: var(--bg); font-size: 15px;
    font-weight: 700; cursor: pointer; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35); }
  .panel { position: fixed; inset: 0; z-index: 2147483647; display: flex; flex-direction: column;
    align-items: center; padding: 20px 16px; background: var(--bg); }
  .top, .card, .categories, .actions, .error { width: 100%; max-width: 640px; }
  .top { display: flex; justify-content: space-between; color: var(--muted); font-size: 14px; }
  .top button { padding: 0; border: 0; background: none; color: inherit; font-size: 14px; cursor: pointer; }
  .top button:hover, .top button.active { color: var(--text); }
  .card { flex: 1; min-height: 0; overflow-y: auto; margin: 16px 0; padding: 20px;
    border: 1px solid var(--line); border-radius: 16px; }
  .author { font-weight: 700; font-size: 15px; }
  .meta { color: var(--muted); font-size: 14px; margin-top: 2px; }
  .meta a { color: inherit; }
  .text { font-size: 17px; line-height: 1.5; margin: 14px 0; white-space: pre-wrap; overflow-wrap: anywhere; }
  .status { margin-top: 30vh; color: var(--muted); font-size: 15px; text-align: center; }
  .error { min-height: 18px; margin-bottom: 8px; color: var(--danger); font-size: 14px; text-align: center; }
  .categories { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
  .categories button { flex: 1 1 120px; padding: 10px; border: 1px solid var(--line); border-radius: 999px;
    background: none; color: var(--text); font-size: 15px; cursor: pointer; }
  .categories button:hover { border-color: var(--accent); color: var(--accent); }
  .actions { display: flex; gap: 10px; }
  .actions button { flex: 1; padding: 14px; border: 0; border-radius: 999px; font-size: 15px;
    font-weight: 700; cursor: pointer; }
  .remove { background: var(--danger); color: #fff; }
  .undo { flex: 0 0 110px !important; background: var(--hover); color: var(--text); }
  .keep { background: var(--text); color: var(--bg); }
  kbd { opacity: 0.6; margin: 0 6px; font-family: ui-monospace, monospace; font-size: 12px; }
  .log { list-style: none; margin: 0; padding: 0; font-size: 14px; }
  .log li { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--line); }
  .log a { flex: 1; color: var(--text); text-decoration: none; overflow-wrap: anywhere; }
  .log a:hover { text-decoration: underline; }
  .log .state { flex: 0 0 80px; color: var(--muted); }
  .log .state.removed { color: var(--accent); }
  .log .state.failed { color: var(--danger); }
`;

function actionButton(className: string, label: string, key: string, run: () => void): HTMLButtonElement {
  const button = el('button', className, label);
  button.append(el('kbd', '', key));
  button.addEventListener('click', run);
  return button;
}

function renderCard(card: HTMLElement, post: Post): void {
  const meta = el('div', 'meta', `@${post.handle}`);
  if (post.date !== undefined) meta.append(` · ${new Date(post.date).toLocaleDateString()}`);
  meta.append(' · ', link(post.url, 'open'));
  card.replaceChildren(el('div', 'author', post.author), meta, el('div', 'text', post.text), ...postExtras(post));
  card.scrollTop = 0;
}

function renderLog(card: HTMLElement, removals: Removal[]): void {
  if (removals.length === 0) {
    card.replaceChildren(el('div', 'status', 'Nothing removed yet.'));
    return;
  }
  const list = el('ul', 'log');
  for (const removal of removals) {
    const row = el('li', '');
    row.append(el('span', `state ${removal.state}`, removal.state), link(removal.url, removal.label));
    list.append(row);
  }
  card.replaceChildren(list);
}

export function createSorter(handlers: SorterHandlers): Sorter {
  const host = document.createElement('div');
  host.dataset.stash = 'sorter';
  const root = attachStyled(host, CSS + POST_CSS);

  const launcher = el('button', 'launcher', 'Stash');
  launcher.hidden = true;
  const panel = el('div', 'panel');
  panel.hidden = true;

  const counts = el('span', '');
  const removedButton = el('button', '', 'Removed (L)');
  const close = el('button', '', 'Close (Esc)');
  const topButtons = el('span', '');
  topButtons.append(removedButton, ' · ', close);
  const top = el('div', 'top');
  top.append(counts, topButtons);

  const card = el('div', 'card');
  const error = el('div', 'error');
  const categoryRow = el('div', 'categories');
  const actions = el('div', 'actions');
  actions.append(
    actionButton('remove', 'Remove', 'D', handlers.remove),
    actionButton('undo', 'Undo', 'Z', handlers.undo),
    actionButton('keep', 'Keep', 'K', () => handlers.keep(undefined)),
  );
  panel.append(top, card, error, categoryRow, actions);
  root.append(launcher, panel);
  document.documentElement.append(host);

  let view: View = 'cards';
  let last: SorterState | undefined;
  // Redraw only for a new post, so a playing video keeps playing.
  let shownPost: Post | undefined;

  const keys: Record<string, () => void> = {
    k: () => handlers.keep(undefined),
    d: handlers.remove,
    z: handlers.undo,
    r: handlers.retry,
    l: () => switchTo('removed'),
    escape: hide,
  };

  function keepIn(index: number): void {
    const category = last?.categories[index];
    if (category !== undefined && view === 'cards') handlers.keep(category.id);
  }

  function onKey(event: KeyboardEvent): void {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const digit = Number.parseInt(event.key, 10);
    const run = digit >= 1 && digit <= 9 ? () => keepIn(digit - 1) : keys[event.key.toLowerCase()];
    if (run === undefined) return;
    event.preventDefault();
    run();
  }

  function show(): void {
    panel.hidden = false;
    launcher.hidden = true;
    // Keep X's single-key shortcuts from firing under the panel.
    takeAllKeys(onKey);
    handlers.open();
  }

  function hide(): void {
    panel.hidden = true;
    launcher.hidden = false;
    takeAllKeys(undefined);
    handlers.close();
  }

  function switchTo(next: View): void {
    view = view === next ? 'cards' : next;
    removedButton.classList.toggle('active', view === 'removed');
    shownPost = undefined;
    if (last !== undefined) draw(last);
  }

  function drawCategories(categories: Category[]): void {
    categoryRow.replaceChildren(
      ...categories.map((category, index) => {
        const button = el('button', '');
        button.append(el('kbd', '', String(index + 1)), category.name);
        button.addEventListener('click', () => handlers.keep(category.id));
        return button;
      }),
    );
  }

  function drawCards(state: SorterState): void {
    error.textContent = state.post === undefined ? '' : state.status;
    if (state.post === undefined) card.replaceChildren(el('div', 'status', state.status));
    else if (state.post !== shownPost) renderCard(card, state.post);
    shownPost = state.post;
  }

  function draw(state: SorterState): void {
    counts.textContent = `${state.queued} loaded · ${state.kept} kept · ${state.removed} removed`;
    categoryRow.hidden = view !== 'cards';
    actions.hidden = view !== 'cards';
    drawCategories(state.categories);
    if (view === 'cards') drawCards(state);
    if (view === 'removed') {
      error.textContent = state.status;
      renderLog(card, state.removals);
    }
  }

  removedButton.addEventListener('click', () => switchTo('removed'));
  launcher.addEventListener('click', show);
  close.addEventListener('click', hide);

  return {
    render(state) {
      last = state;
      draw(state);
    },
    show,
    setLauncherVisible(visible) {
      launcher.hidden = !visible || !panel.hidden;
    },
  };
}
