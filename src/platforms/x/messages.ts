// The hook and the content script talk over postMessage. Other page scripts can
// send these too, so everything received is checked.
export const SOURCE = 'stash';

export type Message =
  | { source: typeof SOURCE; kind: 'posts'; body: unknown }
  | { source: typeof SOURCE; kind: 'loadMore' }
  | { source: typeof SOURCE; kind: 'end'; reason: string }
  | { source: typeof SOURCE; kind: 'remove'; requestId: number; postId: string; queryId: string | undefined }
  | { source: typeof SOURCE; kind: 'removed'; requestId: number; ok: boolean; error?: string };

export function isMessage(value: unknown): value is Message {
  return typeof value === 'object' && value !== null && (value as { source?: unknown }).source === SOURCE;
}

export function send(message: Message): void {
  window.postMessage(message, window.location.origin);
}

export function onMessage(listener: (message: Message) => void): void {
  window.addEventListener('message', (event) => {
    // Not from frames.
    if (event.source === window && isMessage(event.data)) listener(event.data);
  });
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
