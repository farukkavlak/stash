import { describe, expect, it } from 'vitest';
import { parseBookmarks } from '../src/platforms/x/parse';
import { bookmarksAnswer, tweet } from './fixtures';

const parseOne = (result: unknown) => parseBookmarks(bookmarksAnswer([result]))[0];

describe('parseBookmarks', () => {
  it('reads a post with its author, link and date', () => {
    expect(parseOne(tweet({ id: '42', handle: 'ada', text: 'hi' }))).toEqual({
      id: '42',
      url: 'https://x.com/ada/status/42',
      author: 'Ada',
      handle: 'ada',
      avatar: undefined,
      text: 'hi',
      date: '2018-10-10T20:19:24.000Z',
      media: [],
    });
  });

  it('drops a post whose id is not a number', () => {
    expect(parseBookmarks(bookmarksAnswer([tweet({ id: '1/../2' })]))).toEqual([]);
  });

  it('refuses a handle that is not a plain name', () => {
    expect(parseOne(tweet({ id: '1', handle: 'a/b' }))?.url).toBe('https://x.com/i/status/1');
  });

  it('unescapes the text and keeps only the shown part', () => {
    const post = parseOne(tweet({ id: '1', text: '@bob Tom &amp; Jerry https://t.co/media', range: [5, 16] }));
    expect(post?.text).toBe('Tom & Jerry');
  });

  it('counts the shown range in code points, as X does', () => {
    expect(parseOne(tweet({ id: '1', text: '😀 ok https://t.co/x', range: [0, 4] }))?.text).toBe('😀 ok');
  });

  it('writes short links out in full', () => {
    const urls = [{ url: 'https://t.co/abc', expanded_url: 'https://example.com/page' }];
    expect(parseOne(tweet({ id: '1', text: 'see https://t.co/abc', urls }))?.text).toBe('see https://example.com/page');
  });

  it('prefers the full text of a long post', () => {
    expect(parseOne(tweet({ id: '1', text: 'cut…', note: 'the whole thing' }))?.text).toBe('the whole thing');
  });

  it('picks the sharpest mp4 of a video', () => {
    const media = [
      {
        type: 'video',
        media_url_https: 'https://pbs.twimg.com/poster.jpg',
        video_info: {
          variants: [
            { content_type: 'application/x-mpegURL', url: 'https://video.twimg.com/x.m3u8' },
            { content_type: 'video/mp4', bitrate: 256000, url: 'https://video.twimg.com/low.mp4' },
            { content_type: 'video/mp4', bitrate: 2176000, url: 'https://video.twimg.com/high.mp4' },
          ],
        },
      },
    ];
    expect(parseOne(tweet({ id: '1', media }))?.media).toEqual([
      { kind: 'video', image: 'https://pbs.twimg.com/poster.jpg', video: 'https://video.twimg.com/high.mp4' },
    ]);
  });

  it('never keeps a link that is not a web address', () => {
    const media = [{ type: 'photo', media_url_https: 'javascript:alert(1)' }];
    expect(parseOne(tweet({ id: '1', media }))?.media).toEqual([]);
  });

  it('reads a link preview', () => {
    const card = {
      rest_id: 'https://t.co/card',
      legacy: {
        binding_values: [
          { key: 'title', value: { string_value: 'A page' } },
          { key: 'thumbnail_image_large', value: { image_value: { url: 'https://pbs.twimg.com/card.jpg' } } },
        ],
      },
    };
    expect(parseOne(tweet({ id: '1', card }))?.media).toEqual([
      { kind: 'link', image: 'https://pbs.twimg.com/card.jpg', link: 'https://t.co/card', title: 'A page' },
    ]);
  });

  it('reads a quoted post, one level deep', () => {
    const inner = tweet({ id: '3', text: 'innermost' });
    const quoted = tweet({ id: '2', text: 'quoted', quote: inner });
    const post = parseOne(tweet({ id: '1', quote: quoted }));
    expect(post?.quote?.text).toBe('quoted');
    expect(post?.quote?.quote).toBeUndefined();
  });

  it('opens a post wrapped in a visibility notice', () => {
    expect(parseOne({ __typename: 'TweetWithVisibilityResults', tweet: tweet({ id: '7' }) })?.id).toBe('7');
  });

  it('returns nothing for an answer of another shape', () => {
    expect(parseBookmarks({ errors: [{ message: 'nope' }] })).toEqual([]);
    expect(parseBookmarks('not json')).toEqual([]);
  });
});
