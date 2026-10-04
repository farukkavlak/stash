import { MAX_CATEGORIES, type Category } from '../store';
import { el } from './dom';
import { onFieldKey } from './keys';
import { attachStyled } from './theme';

// "All" is the platform's own list; the rest are drawn by Stash.
export const ALL = 'all';
export const NONE = 'none';

export interface CategoryHandlers {
  select: (filter: string) => void;
  add: (name: string) => void;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  sort: () => void;
}

export interface CategoryCounts {
  total: number;
  byCategory: Map<string | undefined, number>;
}

export interface CategoryTabs {
  host: HTMLElement;
  update: (categories: Category[], counts: CategoryCounts, unsorted: string, filter: string) => void;
}

const CSS = `
  .row { display: flex; height: 48px; border-bottom: 1px solid var(--line); background: var(--bg); }
  .tabs { flex: 1; min-width: 0; display: flex; align-items: stretch; padding-left: 4px;
    overflow-x: auto; scrollbar-width: none; }
  .tab { position: relative; display: flex; align-items: center; gap: 6px; flex: 0 0 auto;
    padding: 0 12px; border: 0; background: none; color: var(--muted); font-size: 15px;
    font-weight: 500; cursor: pointer; white-space: nowrap; }
  .tab:hover { background: var(--hover); }
  .tab.active { color: var(--text); font-weight: 700; }
  .tab.active::after { content: ""; position: absolute; left: 12px; right: 12px; bottom: 0;
    height: 4px; border-radius: 999px; background: var(--accent); }
  .count { color: var(--muted); font-weight: 400; font-size: 13px; }
  .icon { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 999px;
    color: var(--muted); font-size: 13px; font-weight: 400; }
  .icon:hover { color: var(--text); background: var(--hover); }
  .new { color: var(--accent); }
  input { align-self: center; width: 150px; padding: 6px 12px; border: 1px solid var(--accent);
    border-radius: 999px; background: none; color: var(--text); font-size: 15px; outline: none; }
  .end { display: flex; padding: 0 12px 0 8px; border-left: 1px solid var(--line); }
  .sort { align-self: center; padding: 6px 16px; border: 0; border-radius: 999px; background: var(--text);
    color: var(--bg); font-size: 14px; font-weight: 700; cursor: pointer; white-space: nowrap; }
`;

export function countCategories(saved: { category: string | undefined }[]): CategoryCounts {
  const byCategory = new Map<string | undefined, number>();
  for (const entry of saved) byCategory.set(entry.category, (byCategory.get(entry.category) ?? 0) + 1);
  return { total: saved.length, byCategory };
}

function nameInput(value: string, placeholder: string, done: (name: string | undefined) => void) {
  const input = el('input', '');
  input.value = value;
  input.placeholder = placeholder;
  input.maxLength = 40;
  let finished = false;
  const finish = (name: string | undefined) => {
    if (finished) return;
    finished = true;
    done(name?.trim() || undefined);
  };
  onFieldKey(input, (event) => {
    if (event.key === 'Enter') finish(input.value);
    if (event.key === 'Escape') finish(undefined);
  });
  input.addEventListener('blur', () => finish(input.value));
  return input;
}

export function createCategoryTabs(handlers: CategoryHandlers): CategoryTabs {
  const host = document.createElement('div');
  host.dataset.stash = 'tabs';
  const root = attachStyled(host, CSS);
  const row = el('div', 'row');
  const tabList = el('div', 'tabs');
  const end = el('div', 'end');
  const sort = el('button', 'sort', 'Sort');
  sort.addEventListener('click', () => handlers.sort());
  end.append(sort);
  row.append(tabList, end);
  root.append(row);

  let categories: Category[] = [];
  let counts: CategoryCounts = { total: 0, byCategory: new Map() };
  let filter = ALL;
  let unsorted = '0';
  let editing = false;

  function icon(label: string, title: string, run: () => void): HTMLSpanElement {
    const button = el('span', 'icon', label);
    button.title = title;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      run();
    });
    return button;
  }

  function tab(id: string, label: string, count?: number | string): HTMLButtonElement {
    const button = el('button', id === filter ? 'tab active' : 'tab', label);
    if (count !== undefined) button.append(el('span', 'count', String(count)));
    button.addEventListener('click', () => handlers.select(id));
    return button;
  }

  function edit(at: HTMLElement, value: string, placeholder: string, save: (name: string) => void): void {
    editing = true;
    const input = nameInput(value, placeholder, (name) => {
      editing = false;
      if (name !== undefined && name !== value) save(name);
      else draw();
    });
    at.replaceWith(input);
    input.focus();
    input.select();
  }

  function confirmDelete(category: Category): void {
    const count = counts.byCategory.get(category.id) ?? 0;
    const posts = count === 1 ? '1 post moves' : `${count} posts move`;
    if (window.confirm(`Delete "${category.name}"? Its ${posts} to No category.`)) handlers.remove(category.id);
  }

  function categoryTab(category: Category): HTMLButtonElement {
    const button = tab(category.id, category.name, counts.byCategory.get(category.id) ?? 0);
    if (category.id === filter) {
      button.append(
        icon('✎', 'Rename', () => edit(button, category.name, 'Category name', (name) => handlers.rename(category.id, name))),
        icon('×', 'Delete', () => confirmDelete(category)),
      );
    }
    return button;
  }

  function newTab(): HTMLButtonElement {
    const button = el('button', 'tab new', '+ New');
    button.addEventListener('click', () => edit(button, '', 'Category name', handlers.add));
    return button;
  }

  function draw(): void {
    const scroll = tabList.scrollLeft;
    tabList.replaceChildren(
      tab(ALL, 'All'),
      ...categories.map(categoryTab),
      tab(NONE, 'No category', unsorted),
      ...(categories.length < MAX_CATEGORIES ? [newTab()] : []),
    );
    tabList.scrollLeft = scroll;
  }

  return {
    host,
    update(nextCategories, nextCounts, nextUnsorted, nextFilter) {
      categories = nextCategories;
      counts = nextCounts;
      unsorted = nextUnsorted;
      filter = nextFilter;
      if (!editing) draw();
    },
  };
}
