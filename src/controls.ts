// Everything Stash adds to the platform's bookmarks page.
import type { Store } from './store';
import type { Adapter, Post } from './types';
import { ALL, NONE, countCategories, createCategoryTabs } from './ui/categories';
import { createDock, type Area } from './ui/dock';
import { startDrag } from './ui/drag';
import { createListView, type ListEntry } from './ui/list';
import { createPicker, type Picker } from './ui/picker';
import { refreshTheme } from './ui/theme';

export interface ControlActions {
  post: (id: string) => Post | undefined;
  unsorted: () => Post[];
  hasMore: () => boolean;
  loadMore: () => void;
  assign: (post: Post, category: string | undefined) => void;
  remove: (id: string) => void;
  sort: () => void;
  changed: () => void;
}

export interface Controls {
  refresh: () => void;
  mounted: () => boolean;
}

const DOCK_WIDTH = 280;
const DOCK_MAX_WIDTH = 350;
const DOCK_GAP = 24;

function isTyping(): boolean {
  const active = document.activeElement;
  return (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    (active instanceof HTMLElement && active.isContentEditable)
  );
}

export function mountControls(adapter: Adapter, store: Store, actions: ControlActions): Controls {
  let filter = ALL;
  let revision = 0;
  let hiddenTimeline: HTMLElement | undefined;
  let hiddenSidebar: HTMLElement | undefined;
  let hovered: string | undefined;
  const pickers = new Map<string, Picker>();

  function select(next: string): void {
    filter = next;
    window.scrollTo(0, 0);
    sync();
    refresh();
  }

  function assign(id: string, category: string | undefined): void {
    const post = actions.post(id);
    if (post !== undefined) actions.assign(post, category);
  }

  const categoryEdits = {
    add: (name: string) => void store.addCategory(name).then(actions.changed),
    rename: (id: string, name: string) => void store.renameCategory(id, name).then(actions.changed),
    remove(id: string) {
      if (filter === id) filter = ALL;
      void store.deleteCategory(id).then(actions.changed);
    },
  };

  const tabs = createCategoryTabs({ select, ...categoryEdits, sort: actions.sort });
  const dock = createDock({ select, assign, remove: actions.remove, add: categoryEdits.add });
  const list = createListView({
    setCategory: assign,
    remove: actions.remove,
    more: () => {
      if (filter === NONE) actions.loadMore();
    },
    hover: (id) => {
      hovered = id;
    },
  });

  function showTimeline(): void {
    if (hiddenTimeline !== undefined) hiddenTimeline.style.display = '';
    hiddenTimeline = undefined;
    list.host.remove();
  }

  function showList(): void {
    const timeline = adapter.timeline();
    if (timeline === undefined) return;
    if (hiddenTimeline !== timeline) {
      showTimeline();
      timeline.style.display = 'none';
      hiddenTimeline = timeline;
    }
    if (list.host.nextElementSibling !== timeline) timeline.before(list.host);
  }

  function updatePicker(id: string, picker: Picker): void {
    picker.update(store.categories(), store.kept(id)?.category, store.isKept(id));
  }

  function placePickers(): void {
    for (const { id, element, actions: bar } of adapter.pagePosts()) {
      const existing = bar.querySelector<HTMLElement>(':scope > [data-stash]');
      if (existing?.dataset.stash === id) continue;
      existing?.remove();
      const picker = createPicker(id, (category) => assign(id, category));
      updatePicker(id, picker);
      pickers.set(id, picker);
      element.draggable = true;
      bar.append(picker.host);
    }
    for (const [id, picker] of pickers) if (!picker.host.isConnected) pickers.delete(id);
  }

  // The panel goes where the platform's right column was.
  function hideSidebar(): HTMLElement | undefined {
    const sidebar = adapter.sidebar();
    if (sidebar !== hiddenSidebar) restoreSidebar();
    if (sidebar === undefined) return undefined;
    sidebar.style.visibility = 'hidden';
    hiddenSidebar = sidebar;
    return sidebar;
  }

  function restoreSidebar(): void {
    if (hiddenSidebar !== undefined) hiddenSidebar.style.visibility = '';
    hiddenSidebar = undefined;
  }

  function dockArea(): Area | undefined {
    const sidebar = hideSidebar()?.getBoundingClientRect();
    if (sidebar !== undefined && sidebar.width > 0) {
      return { left: sidebar.left, width: Math.min(sidebar.width, DOCK_MAX_WIDTH) };
    }
    const column = (hiddenTimeline === undefined ? adapter.timeline() : list.host)?.getBoundingClientRect();
    if (column === undefined || column.right + DOCK_GAP + DOCK_WIDTH + DOCK_GAP > window.innerWidth) return undefined;
    return { left: column.right + DOCK_GAP, width: DOCK_WIDTH };
  }

  function placeDock(): void {
    if (!dock.host.isConnected) document.documentElement.append(dock.host);
    dock.place(dockArea());
  }

  function unmount(): void {
    filter = ALL;
    tabs.host.remove();
    dock.host.remove();
    showTimeline();
    restoreSidebar();
  }

  function sync(): void {
    refreshTheme();
    if (!adapter.isSavedPage()) {
      unmount();
      return;
    }
    const bar = adapter.tabBar();
    if (bar !== undefined && tabs.host.previousElementSibling !== bar) {
      bar.after(tabs.host);
      refresh();
    }
    if (filter === ALL) showTimeline();
    else showList();
    placePickers();
    placeDock();
  }

  function title(): string {
    if (filter === NONE) return 'posts with no category';
    return store.categories().find((category) => category.id === filter)?.name ?? 'kept posts';
  }

  // Newest first in a category; the platform's order in No category.
  function listEntries(): ListEntry[] {
    if (filter === NONE) return actions.unsorted().map((post) => ({ post, category: undefined }));
    return store
      .keptPosts()
      .filter((entry) => entry.category === filter)
      .sort((a, b) => b.keptAt.localeCompare(a.keptAt));
  }

  function refresh(): void {
    revision++;
    const counts = countCategories(store.keptPosts());
    const unsorted = `${actions.unsorted().length}${actions.hasMore() ? '+' : ''}`;
    tabs.update(store.categories(), counts, unsorted, filter);
    dock.update(store.categories(), counts, filter);
    if (filter !== ALL) {
      const more = filter === NONE && actions.hasMore();
      list.update(listEntries(), store.categories(), title(), more, `${filter}:${revision}`);
    }
    for (const [id, picker] of pickers) updatePicker(id, picker);
  }

  function keyAction(event: KeyboardEvent, id: string): (() => void) | undefined {
    if (event.key === 'Delete' || event.key === 'Backspace') return () => actions.remove(id);
    const digit = Number.parseInt(event.key, 10);
    const category = digit >= 1 && digit <= 9 ? store.categories()[digit - 1] : undefined;
    return category === undefined ? undefined : () => assign(id, category.id);
  }

  function onKey(event: KeyboardEvent): void {
    if (hovered === undefined || !adapter.isSavedPage() || isTyping()) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const run = keyAction(event, hovered);
    if (run === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    run();
  }

  document.addEventListener('mouseover', (event) => {
    // The list reports its own hovered post.
    if (event.target instanceof Element && event.target !== list.host) {
      hovered = adapter.pagePostAt(event.target)?.id;
    }
  });
  document.addEventListener('dragstart', (event) => {
    const id = event.target instanceof Element ? adapter.pagePostAt(event.target)?.id : undefined;
    if (id !== undefined) startDrag(event, id);
  });
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', placeDock);

  // X redraws its page often; put the controls back each time.
  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      sync();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
  sync();

  return {
    refresh,
    mounted: () => tabs.host.isConnected,
  };
}
