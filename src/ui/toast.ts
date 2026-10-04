import { el } from './dom';
import { attachStyled } from './theme';

const CSS = `
  .toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 2147483000;
    display: flex; align-items: center; gap: 16px; padding: 12px 16px; border-radius: 6px;
    background: var(--accent); color: #fff; font-size: 15px; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4); }
  button { padding: 0; border: 0; background: none; color: #fff; font-size: 15px; font-weight: 700;
    text-decoration: underline; cursor: pointer; }
`;

let current: { host: HTMLElement; timer: number } | undefined;

function hide(): void {
  if (current === undefined) return;
  window.clearTimeout(current.timer);
  current.host.remove();
  current = undefined;
}

export function showToast(text: string, ms: number, undo?: () => void): void {
  hide();
  const host = document.createElement('div');
  const root = attachStyled(host, CSS);
  const toast = el('div', 'toast', text);
  if (undo !== undefined) {
    const button = el('button', '', 'Undo');
    button.addEventListener('click', () => {
      hide();
      undo();
    });
    toast.append(button);
  }
  root.append(toast);
  document.documentElement.append(host);
  current = { host, timer: window.setTimeout(hide, ms) };
}
