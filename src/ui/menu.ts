import { el } from './dom';
import { attachStyled } from './theme';

// Lives at the top of the document: X positions posts with transforms, which would move a fixed menu.
export interface MenuOption {
  label: string;
  checked: boolean;
  muted: boolean;
  run: () => void;
}

const CSS = `
  .menu { position: fixed; z-index: 2147483000; min-width: 190px; padding: 6px 0; border-radius: 12px;
    background: var(--bg); box-shadow: 0 0 15px var(--hover), 0 0 3px 1px var(--hover); }
  button { display: flex; justify-content: space-between; gap: 16px; width: 100%; padding: 10px 16px;
    border: 0; background: none; color: var(--text); font-size: 15px; text-align: left; cursor: pointer; }
  button:hover { background: var(--hover); }
  .check { color: var(--accent); }
  .muted { color: var(--muted); }
`;

let current: { host: HTMLElement; close(): void } | undefined;

export function closeMenu(): void {
  current?.close();
}

function optionButton(option: MenuOption, close: () => void): HTMLButtonElement {
  const button = el('button', option.muted ? 'muted' : '', option.label);
  if (option.checked) button.append(el('span', 'check', '✓'));
  button.addEventListener('click', () => {
    close();
    option.run();
  });
  return button;
}

export function openMenu(anchor: HTMLElement, options: MenuOption[]): void {
  closeMenu();
  const host = document.createElement('div');
  const root = attachStyled(host, CSS);
  const menu = el('div', 'menu');
  root.append(menu);

  const onOutside = (event: Event) => {
    if (!event.composedPath().includes(host)) close();
  };
  function close(): void {
    host.remove();
    window.removeEventListener('pointerdown', onOutside, true);
    window.removeEventListener('scroll', close, true);
    current = undefined;
  }

  menu.append(...options.map((option) => optionButton(option, close)));
  document.documentElement.append(host);
  const rect = anchor.getBoundingClientRect();
  const below = rect.bottom + 6 + menu.offsetHeight < window.innerHeight;
  menu.style.top = `${below ? rect.bottom + 6 : rect.top - 6 - menu.offsetHeight}px`;
  menu.style.left = `${Math.max(8, rect.right - menu.offsetWidth)}px`;
  window.addEventListener('pointerdown', onOutside, true);
  window.addEventListener('scroll', close, true);
  current = { host, close };
}
