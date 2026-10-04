export function dig(value: unknown, ...keys: string[]): unknown {
  let current = value;
  for (const key of keys) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

// The next-page marker: { cursorType: "Bottom", value }.
export function bottomCursor(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const node = value as Record<string, unknown>;
  if (node['cursorType'] === 'Bottom' && typeof node['value'] === 'string') return node['value'];
  for (const child of Object.values(node)) {
    const found = bottomCursor(child);
    if (found !== undefined) return found;
  }
  return undefined;
}

export function timelineEntries(body: unknown): unknown[] {
  const data = dig(body, 'data');
  if (typeof data !== 'object' || data === null) return [];
  for (const timeline of Object.values(data)) {
    const instructions = dig(timeline, 'timeline', 'instructions');
    if (!Array.isArray(instructions)) continue;
    return instructions.flatMap((instruction) => {
      const entries = dig(instruction, 'entries');
      return Array.isArray(entries) ? (entries as unknown[]) : [];
    });
  }
  return [];
}

export function hasPosts(body: unknown): boolean {
  return timelineEntries(body).some((entry) => dig(entry, 'content', 'itemContent', 'tweet_results') !== undefined);
}
