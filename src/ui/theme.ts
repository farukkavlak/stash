import { guardFields } from './keys';

// Uses X's colours, read from the page.
const DARK = { text: '#e7e9ea', muted: '#71767b', line: '#2f3336', hover: 'rgba(231, 233, 234, 0.1)', bg: '#000' };
const DIM = { text: '#f7f9f9', muted: '#8b98a5', line: '#38444d', hover: 'rgba(247, 249, 249, 0.1)', bg: '#15202b' };
const LIGHT = { text: '#0f1419', muted: '#536471', line: '#eff3f4', hover: 'rgba(15, 20, 25, 0.1)', bg: '#fff' };

// X sets its colour after we start, so this is read again on every page change.
function pagePalette(): typeof DARK {
  const body = document.body as HTMLElement | null;
  if (body === null) return DARK;
  const [r = 0, g = 0, b = 0, alpha = 1] = (getComputedStyle(body).backgroundColor.match(/[\d.]+/g) ?? []).map(Number);
  if (alpha === 0) return DARK;
  if (r + g + b > 600) return LIGHT;
  return b > 30 ? DIM : DARK;
}

const sheets = new Map<string, CSSStyleSheet>();
let current = pagePalette();

function themeCss(palette: typeof DARK): string {
  return `
    :host {
      --text: ${palette.text}; --muted: ${palette.muted}; --line: ${palette.line};
      --hover: ${palette.hover}; --bg: ${palette.bg}; --accent: #1d9bf0; --danger: #f4212e;
      color: var(--text);
      font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    * { box-sizing: border-box; font-family: inherit; }
    [hidden] { display: none !important; }
  `;
}

export function attachStyled(host: HTMLElement, css: string): ShadowRoot {
  // Open, so X can see our inputs and skip its shortcuts while we type.
  const root = host.attachShadow({ mode: 'open' });
  guardFields(host, root);
  let sheet = sheets.get(css);
  if (sheet === undefined) {
    // Not blocked by the page's style-src policy.
    sheet = new CSSStyleSheet();
    sheet.replaceSync(themeCss(current) + css);
    sheets.set(css, sheet);
  }
  root.adoptedStyleSheets = [sheet];
  return root;
}

export function refreshTheme(): void {
  const palette = pagePalette();
  if (palette === current) return;
  current = palette;
  for (const [css, sheet] of sheets) sheet.replaceSync(themeCss(palette) + css);
}
