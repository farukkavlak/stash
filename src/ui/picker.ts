import type { Category } from '../store';
import { el } from './dom';
import { openMenu } from './menu';
import { attachStyled } from './theme';

export interface Picker {
  host: HTMLElement;
  update: (categories: Category[], current: string | undefined, kept: boolean) => void;
}

const CSS = `
  :host { display: flex; align-items: center; }
  button { max-width: 140px; padding: 2px 10px; border: 1px solid var(--line); border-radius: 999px;
    background: none; color: var(--muted); font-size: 13px; cursor: pointer;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  button:hover, button.set { color: var(--accent); border-color: var(--accent); }
`;

export function createPicker(postId: string, choose: (category: string | undefined) => void): Picker {
  const host = document.createElement('div');
  host.dataset.stash = postId;
  const root = attachStyled(host, CSS);
  const button = el('button', '');
  root.append(button);

  let categories: Category[] = [];
  let current: string | undefined;
  let kept = false;

  button.addEventListener('click', (event) => {
    // Otherwise X opens the post.
    event.stopPropagation();
    event.preventDefault();
    openMenu(button, [
      ...categories.map((category) => ({
        label: category.name,
        checked: kept && current === category.id,
        muted: false,
        run: () => choose(category.id),
      })),
      { label: 'Keep, no category', checked: kept && current === undefined, muted: true, run: () => choose(undefined) },
    ]);
  });

  return {
    host,
    update(nextCategories, nextCurrent, nextKept) {
      categories = nextCategories;
      current = nextCurrent;
      kept = nextKept;
      const name = categories.find((category) => category.id === current)?.name;
      button.textContent = name ?? (kept ? 'Kept' : '+ Category');
      button.className = kept ? 'set' : '';
    },
  };
}
