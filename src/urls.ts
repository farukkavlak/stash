// Other scripts on the page could fake post data, so only http(s) links get through.
export function webUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (!URL.canParse(value)) return undefined;
  const url = new URL(value);
  return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
}
