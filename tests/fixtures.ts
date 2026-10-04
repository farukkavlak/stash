// Builders for X's bookmarks answer, shaped like the real one.
export interface TweetOptions {
  id: string;
  text?: string;
  handle?: string;
  range?: [number, number];
  media?: unknown[];
  urls?: { url: string; expanded_url: string }[];
  quote?: unknown;
  card?: unknown;
  note?: string;
}

export function tweet(options: TweetOptions): unknown {
  return {
    __typename: 'Tweet',
    rest_id: options.id,
    core: { user_results: { result: { core: { screen_name: options.handle ?? 'ada', name: 'Ada' } } } },
    legacy: {
      full_text: options.text ?? 'hello',
      created_at: 'Wed Oct 10 20:19:24 +0000 2018',
      ...(options.range === undefined ? {} : { display_text_range: options.range }),
      entities: { urls: options.urls ?? [] },
      ...(options.media === undefined ? {} : { extended_entities: { media: options.media } }),
    },
    ...(options.quote === undefined ? {} : { quoted_status_result: { result: options.quote } }),
    ...(options.card === undefined ? {} : { card: options.card }),
    ...(options.note === undefined ? {} : { note_tweet: { note_tweet_results: { result: { text: options.note } } } }),
  };
}

export function bookmarksAnswer(results: unknown[], cursor?: string): unknown {
  const entries: unknown[] = results.map((result, index) => ({
    entryId: `tweet-${index}`,
    content: { itemContent: { tweet_results: { result } } },
  }));
  if (cursor !== undefined) entries.push({ entryId: 'cursor-bottom-1', content: { value: cursor, cursorType: 'Bottom' } });
  return { data: { bookmark_timeline_v2: { timeline: { instructions: [{ type: 'TimelineAddEntries', entries }] } } } };
}
