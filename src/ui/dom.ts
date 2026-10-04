import { webUrl } from '../urls';

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

// Anything but an http(s) link becomes plain text.
export function link(url: string, text: string): HTMLElement {
  const href = webUrl(url);
  if (href === undefined) return el('span', '', text);
  const anchor = el('a', '', text);
  anchor.href = href;
  anchor.target = '_blank';
  anchor.rel = 'noreferrer noopener';
  return anchor;
}

export function picture(url: string | undefined, className = ''): HTMLImageElement {
  const image = el('img', className);
  const src = webUrl(url);
  if (src !== undefined) image.src = src;
  image.alt = '';
  image.loading = 'lazy';
  image.referrerPolicy = 'no-referrer';
  return image;
}
