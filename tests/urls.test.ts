import { describe, expect, it } from 'vitest';
import { webUrl } from '../src/urls';

describe('webUrl', () => {
  it('keeps web addresses', () => {
    expect(webUrl('https://x.com/a')).toBe('https://x.com/a');
    expect(webUrl('http://example.com/')).toBe('http://example.com/');
  });

  it('refuses everything else', () => {
    expect(webUrl('javascript:alert(1)')).toBeUndefined();
    expect(webUrl('data:text/html,hi')).toBeUndefined();
    expect(webUrl('/relative')).toBeUndefined();
    expect(webUrl(42)).toBeUndefined();
  });
});
