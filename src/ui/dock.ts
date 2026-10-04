import { MAX_CATEGORIES, type Category } from '../store';
import type { CategoryCounts } from './categories';
import { el } from './dom';
import { droppedId, isPostDrag } from './drag';
import { onFieldKey } from './keys';
import { attachStyled } from './theme';

// The side panel posts are dropped on.
export interface DockHandlers {
  select: (filter: string) => void;
  assign: (id: string, category: string | undefined) => void;
  remove: (id: string) => void;
  add: (name: string) => void;
}

export interface Area {
  left: number;
  width: number;
}

export interface Dock {
  host: HTMLElement;
  update: (categories: Category[], counts: CategoryCounts, filter: string) => void;
  place: (area: Area | undefined) => void;
}

const CSS = `
  .dock { position: fixed; top: 12px; max-height: calc(100vh - 24px); overflow-y: auto;
    border: 1px solid var(--line); border-radius: 16px; background: var(--bg); z-index: 100; }
  h2 { margin: 0; padding: 12px 16px; font-size: 20px; font-weight: 800; }
  .hint { padding: 0 16px 8px; color: var(--muted); font-size: 13px; }
  .target { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 16px;
    border: 0; border-top: 1px solid var(--line); background: none; color: var(--text);
    font-size: 15px; text-align: left; cursor: pointer; }
  .target:hover { background: var(--hover); }
  .target.active .name { font-weight: 700; }
  .target.over { background: color-mix(in srgb, var(--accent) 20%, transparent); box-shadow: inset 3px 0 var(--accent); }
  .key { width: 18px; color: var(--muted); font-family: ui-monospace, monospace; font-size: 12px; }
  .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .count { color: var(--muted); font-size: 13px; }
  .remove { color: var(--danger); }
  .remove.over { background: color-mix(in srgb, var(--danger) 20%, transparent); box-shadow: inset 3px 0 var(--danger); }
  input { display: block; width: calc(100% - 24px); margin: 8px 12px 12px; padding: 8px 12px;
    border: 1px solid var(--line); border-radius: 999px; background: none; color: var(--text);
    font-size: 14px; outline: none; }
  input:focus { border-color: var(--accent); }
`;

function dropTarget(button: HTMLElement, onDrop: (id: string) => void): void {
  button.addEventListener('dragover', (event) => {
    if (!isPostDrag(event)) return;
    event.preventDefault();
    button.classList.add('over');
  });
  button.addEventListener('dragleave', () => button.classList.remove('over'));
  button.addEventListener('drop', (event) => {
    button.classList.remove('over');
    const id = droppedId(event);
    if (id === undefined) return;
    event.preventDefault();
    onDrop(id);
  });
}

export function createDock(handlers: DockHandlers): Dock {
  const host = document.createElement('div');
  host.dataset.stash = 'dock';
  const root = attachStyled(host, CSS);
  const dock = el('div', 'dock');
  root.append(dock);

  const input = el('input', '');
  input.placeholder = '+ New category';
  input.maxLength = 40;
  onFieldKey(input, (event) => {
    const name = input.value.trim();
    if (event.key === 'Enter' && name !== '') {
      handlers.add(name);
      input.value = '';
    }
    if (event.key === 'Escape') input.blur();
  });

  function target(label: string, key: string, count: number | undefined, className: string): HTMLButtonElement {
    const button = el('button', `target ${className}`);
    button.append(el('span', 'key', key), el('span', 'name', label));
    if (count !== undefined) button.append(el('span', 'count', String(count)));
    return button;
  }

  function categoryTarget(category: Category, index: number, counts: CategoryCounts, filter: string) {
    const count = counts.byCategory.get(category.id) ?? 0;
    const button = target(category.name, String(index + 1), count, category.id === filter ? 'active' : '');
    button.addEventListener('click', () => handlers.select(category.id));
    dropTarget(button, (id) => handlers.assign(id, category.id));
    return button;
  }

  const targets = el('div', '');
  const remove = target('Remove bookmark', 'Del', undefined, 'remove');
  remove.title = 'Drop a post here, or press Delete over it';
  dropTarget(remove, handlers.remove);
  dock.append(
    el('h2', '', 'Categories'),
    el('div', 'hint', 'Drag a post here, or point at it and press a number.'),
    targets,
    input,
    remove,
  );

  return {
    host,
    update(categories, counts, filter) {
      targets.replaceChildren(...categories.map((category, index) => categoryTarget(category, index, counts, filter)));
      input.hidden = categories.length >= MAX_CATEGORIES;
    },
    place(area) {
      dock.hidden = area === undefined;
      if (area === undefined) return;
      dock.style.left = `${area.left}px`;
      dock.style.width = `${area.width}px`;
    },
  };
}
