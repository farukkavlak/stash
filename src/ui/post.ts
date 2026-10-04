// Media and quoted posts, shared by the one-by-one view and the list.
import type { Media, Post } from '../types';
import { webUrl } from '../urls';
import { el, link, picture } from './dom';

export const POST_CSS = `
  .media { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 2px;
    margin-bottom: 12px; border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
  .media img, .media video { display: block; width: 100%; max-height: 420px; object-fit: cover; background: #000; }
  .media video { object-fit: contain; }
  .media .preview { color: inherit; text-decoration: none; }
  .media .title { padding: 8px 12px; color: var(--muted); font-size: 14px; border-top: 1px solid var(--line); }
  .media .play { position: relative; display: block; }
  .media .play span { position: absolute; left: 8px; bottom: 8px; padding: 2px 8px; border-radius: 6px;
    background: rgba(0, 0, 0, 0.7); color: #fff; font-size: 12px; }
  .quote { margin-bottom: 12px; padding: 12px; border: 1px solid var(--line); border-radius: 16px; }
  .quote .who { color: var(--muted); font-size: 14px; margin-bottom: 4px; }
  .quote .who b { color: var(--text); }
  .quote .said { font-size: 15px; line-height: 20px; white-space: pre-wrap; overflow-wrap: anywhere; margin-bottom: 8px; }
  .quote .media { margin-bottom: 0; }
`;

// For a video the page won't let us play.
function posterLink(media: Media, postUrl: string): HTMLElement {
  const box = link(postUrl, '');
  box.classList.add('play');
  box.append(picture(media.image), el('span', '', '▶ Play on X'));
  return box;
}

function video(media: Media, postUrl: string): HTMLElement {
  const src = webUrl(media.video);
  if (src === undefined) return posterLink(media, postUrl);
  const player = el('video', '');
  player.poster = webUrl(media.image) ?? '';
  player.src = src;
  player.preload = 'none';
  player.playsInline = true;
  if (media.kind === 'gif') {
    player.muted = true;
    player.loop = true;
    player.autoplay = true;
  } else {
    player.controls = true;
  }
  player.addEventListener('error', () => player.replaceWith(posterLink(media, postUrl)));
  return player;
}

function preview(media: Media, postUrl: string): HTMLElement {
  const box = link(media.link ?? postUrl, '');
  box.classList.add('preview');
  box.append(picture(media.image));
  if (media.title !== undefined) box.append(el('div', 'title', media.title));
  return box;
}

function mediaNode(media: Media, postUrl: string): HTMLElement {
  if (media.kind === 'video' || media.kind === 'gif') return video(media, postUrl);
  if (media.kind === 'link') return preview(media, postUrl);
  return picture(media.image);
}

function renderMedia(post: Post): HTMLElement | undefined {
  if (post.media.length === 0) return undefined;
  const grid = el('div', 'media');
  grid.append(...post.media.map((media) => mediaNode(media, post.url)));
  return grid;
}

function renderQuote(post: Post): HTMLElement | undefined {
  const quote = post.quote;
  if (quote === undefined) return undefined;
  const box = el('div', 'quote');
  const who = el('div', 'who');
  who.append(el('b', '', quote.author), ` @${quote.handle}`);
  box.append(who, el('div', 'said', quote.text));
  const media = renderMedia(quote);
  if (media !== undefined) box.append(media);
  return box;
}

export function postExtras(post: Post): HTMLElement[] {
  return [renderMedia(post), renderQuote(post)].filter((node) => node !== undefined);
}
