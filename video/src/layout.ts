import { POSTS, type DemoPost } from "./data";

// The mock page, in page pixels. The stage scales it up for 1080p.
export const COLUMN_WIDTH = 640;
export const PANEL_X = COLUMN_WIDTH + 24;
export const PANEL_WIDTH = 320;
export const PAGE_WIDTH = PANEL_X + PANEL_WIDTH;
export const TITLE_HEIGHT = 53;
export const X_TABS_HEIGHT = 53;
export const OUR_TABS_HEIGHT = 48;

export const PANEL_HEAD = 92;
export const PANEL_ROW = 46;

export const IMAGE_HEIGHT = 220;

export function postHeight(post: DemoPost): number {
  return 80 + post.lines * 20 + (post.image ? IMAGE_HEIGHT + 12 : 0);
}

/** Top of each post in the list, before any is removed. */
export function postTop(index: number): number {
  return POSTS.slice(0, index).reduce((sum, post) => sum + postHeight(post), 0);
}

export function listTop(tabsShown: number): number {
  return TITLE_HEIGHT + X_TABS_HEIGHT + OUR_TABS_HEIGHT * tabsShown;
}

export function panelRowCenter(index: number): number {
  return PANEL_HEAD + index * PANEL_ROW + PANEL_ROW / 2;
}

// Our tab row, in order, with fixed widths so the cursor can find a tab.
export const TAB_WIDTHS = [52, 86, 92, 78, 124, 132];
export function tabCenter(index: number): number {
  return TAB_WIDTHS.slice(0, index).reduce((a, b) => a + b, 4) + (TAB_WIDTHS[index] ?? 0) / 2;
}
