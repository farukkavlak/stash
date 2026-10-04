// X's bookmarks answer to posts. Every field is checked here; a post without a valid id is dropped.
import type { Media, Post } from '../../types';
import { webUrl } from '../../urls';
import { dig, timelineEntries } from './timeline';

const POST_ID = /^\d{1,25}$/;
const HANDLE = /^\w{1,50}$/;

const CARD_IMAGES = [
  'photo_image_full_size_large',
  'thumbnail_image_large',
  'summary_photo_image_large',
  'player_image_large',
  'photo_image_full_size_original',
  'thumbnail_image_original',
  'player_image',
];

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function parseDate(value: unknown): string | undefined {
  const raw = text(value);
  if (raw === undefined) return undefined;
  const time = Date.parse(raw);
  return Number.isNaN(time) ? undefined : new Date(time).toISOString();
}

// X escapes only these three.
function unescapeText(value: string): string {
  return value.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
}

function expandLinks(value: string, entities: unknown): string {
  let expanded = value;
  for (const entity of list(dig(entities, 'urls'))) {
    const short = text(dig(entity, 'url'));
    const full = text(dig(entity, 'expanded_url'));
    if (short !== undefined && full !== undefined) expanded = expanded.replaceAll(short, full);
  }
  return expanded;
}

// Drops a reply's leading @names and the media link. The range counts code points.
function shownPart(value: string, range: unknown): string {
  const [start, end] = list(range);
  if (typeof start !== 'number' || typeof end !== 'number') return value;
  return Array.from(value).slice(start, end).join('');
}

function postText(tweet: unknown): string {
  const note = dig(tweet, 'note_tweet', 'note_tweet_results', 'result');
  const long = text(dig(note, 'text'));
  if (long !== undefined) return expandLinks(long, dig(note, 'entity_set'));
  const legacy = dig(tweet, 'legacy');
  const shown = shownPart(unescapeText(text(dig(legacy, 'full_text')) ?? ''), dig(legacy, 'display_text_range'));
  return expandLinks(shown, dig(legacy, 'entities')).trim();
}

function bestVideo(entry: unknown): string | undefined {
  let best: { url: string; bitrate: number } | undefined;
  for (const variant of list(dig(entry, 'video_info', 'variants'))) {
    const url = webUrl(dig(variant, 'url'));
    if (url === undefined || dig(variant, 'content_type') !== 'video/mp4') continue;
    const bitrate = dig(variant, 'bitrate');
    const rate = typeof bitrate === 'number' ? bitrate : 0;
    if (best === undefined || rate > best.bitrate) best = { url, bitrate: rate };
  }
  return best?.url;
}

function parseAttached(entry: unknown): Media | undefined {
  const image = webUrl(dig(entry, 'media_url_https'));
  if (image === undefined) return undefined;
  const type = dig(entry, 'type');
  if (type !== 'video' && type !== 'animated_gif') return { kind: 'photo', image };
  const video = bestVideo(entry);
  return { kind: type === 'video' ? 'video' : 'gif', image, ...(video === undefined ? {} : { video }) };
}

function cardValue(bindings: unknown[], key: string): unknown {
  return dig(bindings.find((binding) => dig(binding, 'key') === key), 'value');
}

// A link preview. X calls it a card.
function parseCard(tweet: unknown): Media | undefined {
  const bindings = list(dig(tweet, 'card', 'legacy', 'binding_values'));
  const image = CARD_IMAGES.map((key) => webUrl(dig(cardValue(bindings, key), 'image_value', 'url'))).find(Boolean);
  if (image === undefined) return undefined;
  const link = webUrl(dig(cardValue(bindings, 'card_url'), 'string_value')) ?? webUrl(dig(tweet, 'card', 'rest_id'));
  const title = text(dig(cardValue(bindings, 'title'), 'string_value'));
  return { kind: 'link', image, ...(link === undefined ? {} : { link }), ...(title === undefined ? {} : { title }) };
}

function parseMedia(tweet: unknown): Media[] {
  const media: Media[] = [];
  for (const entry of list(dig(tweet, 'legacy', 'extended_entities', 'media'))) {
    const parsed = parseAttached(entry);
    if (parsed !== undefined) media.push(parsed);
  }
  const card = media.length === 0 ? parseCard(tweet) : undefined;
  if (card !== undefined) media.push(card);
  return media;
}

function parseAuthor(tweet: unknown): Pick<Post, 'author' | 'handle' | 'avatar'> {
  const user = dig(tweet, 'core', 'user_results', 'result');
  const rawHandle = text(dig(user, 'core', 'screen_name')) ?? text(dig(user, 'legacy', 'screen_name'));
  const handle = rawHandle !== undefined && HANDLE.test(rawHandle) ? rawHandle : '';
  return {
    handle,
    author: text(dig(user, 'core', 'name')) ?? text(dig(user, 'legacy', 'name')) ?? handle,
    avatar: webUrl(dig(user, 'avatar', 'image_url')) ?? webUrl(dig(user, 'legacy', 'profile_image_url_https')),
  };
}

function parseTweet(result: unknown, withQuote: boolean): Post | undefined {
  // Posts with a visibility notice are wrapped one level deeper.
  const tweet = dig(result, 'tweet') ?? result;
  const id = text(dig(tweet, 'rest_id'));
  if (id === undefined || !POST_ID.test(id)) return undefined;
  const author = parseAuthor(tweet);
  // One level only, as on X.
  const quote = withQuote ? parseTweet(dig(tweet, 'quoted_status_result', 'result'), false) : undefined;
  return {
    id,
    url: `https://x.com/${author.handle || 'i'}/status/${id}`,
    ...author,
    text: postText(tweet),
    date: parseDate(dig(tweet, 'legacy', 'created_at')),
    media: parseMedia(tweet),
    ...(quote === undefined ? {} : { quote }),
  };
}

export function parseBookmarks(body: unknown): Post[] {
  const posts: Post[] = [];
  for (const entry of timelineEntries(body)) {
    const post = parseTweet(dig(entry, 'content', 'itemContent', 'tweet_results', 'result'), true);
    if (post !== undefined) posts.push(post);
  }
  return posts;
}
