import { describe, expect, it } from 'vitest';
import { bottomCursor, hasPosts } from '../src/platforms/x/timeline';
import { bookmarksAnswer, tweet } from './fixtures';

describe('bottomCursor', () => {
  it('finds the next-page marker', () => {
    expect(bottomCursor(bookmarksAnswer([tweet({ id: '1' })], 'next'))).toBe('next');
  });

  it('is empty when there is none', () => {
    expect(bottomCursor(bookmarksAnswer([tweet({ id: '1' })]))).toBeUndefined();
  });
});

describe('hasPosts', () => {
  it('tells the last, empty page from one with posts', () => {
    expect(hasPosts(bookmarksAnswer([tweet({ id: '1' })], 'next'))).toBe(true);
    expect(hasPosts(bookmarksAnswer([], 'next'))).toBe(false);
  });
});
