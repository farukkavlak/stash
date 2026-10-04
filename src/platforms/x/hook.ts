// Runs in the page's own world to use its login. Reads X's bookmark answers and
// sends the same requests the page does. Talks only to X.
import { errorText, onMessage, send, SOURCE } from './messages';
import { bottomCursor, hasPosts } from './timeline';

const GRAPHQL = '/i/api/graphql/';
const OPERATION = /\/i\/api\/graphql\/([\w-]+)\/(\w+)/;
const POST_ID = /^\d{1,25}$/;
const QUERY_ID = /^[\w-]{1,64}$/;
const REPLAYED = ['authorization', 'x-twitter-auth-type', 'x-twitter-active-user', 'x-twitter-client-language'];

const pageFetch = window.fetch.bind(window);
let seenHeaders: Record<string, string> = {};
// Learned from the page's own requests.
const queryIds = new Map<string, string>();
let bookmarksUrl: string | undefined;
let nextCursor: string | undefined;
let loading = false;

function remember(url: string, headers: Record<string, string>): void {
  const match = OPERATION.exec(url);
  if (match === null) return;
  const [, queryId, operation] = match;
  if (queryId !== undefined && operation !== undefined) queryIds.set(operation, queryId);
  if (headers['authorization'] !== undefined) seenHeaders = headers;
}

function publish(url: string, responseText: string): void {
  if (OPERATION.exec(url)?.[2] !== 'Bookmarks') return;
  let body: unknown;
  try {
    body = JSON.parse(responseText);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return;
  }
  bookmarksUrl = url;
  nextCursor = bottomCursor(body);
  send({ source: SOURCE, kind: 'posts', body });
  if (!hasPosts(body)) send({ source: SOURCE, kind: 'end', reason: 'done' });
}

function hookXhr(): void {
  const requests = new WeakMap<XMLHttpRequest, { url: string; headers: Record<string, string> }>();
  const proto = XMLHttpRequest.prototype;
  // Called below with the right `this`.
  /* eslint-disable @typescript-eslint/unbound-method */
  const open = proto.open;
  const setRequestHeader = proto.setRequestHeader;
  const sendRequest = proto.send;
  /* eslint-enable @typescript-eslint/unbound-method */

  proto.open = function (this: XMLHttpRequest, ...args: Parameters<typeof open>) {
    requests.set(this, { url: String(args[1]), headers: {} });
    open.apply(this, args);
  } as typeof proto.open;

  proto.setRequestHeader = function (name, value) {
    const request = requests.get(this);
    if (request !== undefined) request.headers[name.toLowerCase()] = value;
    setRequestHeader.call(this, name, value);
  };

  proto.send = function (body) {
    const request = requests.get(this);
    if (request !== undefined && request.url.includes(GRAPHQL)) {
      remember(request.url, request.headers);
      this.addEventListener('load', () => {
        if (this.responseType === '' || this.responseType === 'text') publish(request.url, this.responseText);
      });
    }
    sendRequest.call(this, body);
  };
}

// Never break X's own request: one we can't read passes through untouched.
function readRequest(input: RequestInfo | URL, init?: RequestInit): Request | undefined {
  try {
    return new Request(input, init);
  } catch (error) {
    if (error instanceof TypeError) return undefined;
    throw error;
  }
}

function hookFetch(): void {
  window.fetch = async (input, init) => {
    const request = readRequest(input, init);
    const response = await pageFetch(input, init);
    if (request?.url.includes(GRAPHQL) === true) {
      remember(request.url, Object.fromEntries(request.headers.entries()));
      // A cancelled request has no answer to read.
      response.clone().text().then((body) => publish(request.url, body), () => undefined);
    }
    return response;
  };
}

function csrfToken(): string {
  const match = /(?:^|;\s*)ct0=([^;]+)/.exec(document.cookie);
  if (match?.[1] === undefined) throw new Error('Not logged in to X');
  return match[1];
}

function authHeaders(): Record<string, string> {
  if (seenHeaders['authorization'] === undefined) throw new Error('No X request seen yet. Reload the page.');
  const headers: Record<string, string> = { 'x-csrf-token': csrfToken() };
  for (const name of REPLAYED) {
    const value = seenHeaders[name];
    if (value !== undefined) headers[name] = value;
  }
  return headers;
}

function nextPageUrl(): string | undefined {
  if (bookmarksUrl === undefined || nextCursor === undefined) return undefined;
  const url = new URL(bookmarksUrl, window.location.origin);
  const variables: unknown = JSON.parse(url.searchParams.get('variables') ?? '{}');
  url.searchParams.set('variables', JSON.stringify({ ...(variables as object), cursor: nextCursor }));
  return url.toString();
}

async function loadMore(): Promise<void> {
  const url = nextPageUrl();
  if (url === undefined) throw new Error('X has not loaded your bookmarks yet');
  const response = await pageFetch(url, { credentials: 'include', headers: authHeaders() });
  if (!response.ok) throw new Error(`X answered ${response.status}`);
  publish(url, await response.text());
}

function onLoadMore(): void {
  if (loading) return;
  loading = true;
  loadMore()
    .catch((error: unknown) => send({ source: SOURCE, kind: 'end', reason: errorText(error) }))
    .finally(() => {
      loading = false;
    });
}

async function remove(postId: string, offeredQueryId: string | undefined): Promise<void> {
  const queryId = queryIds.get('DeleteBookmark') ?? offeredQueryId;
  if (!POST_ID.test(postId)) throw new Error('Not a post id');
  if (queryId === undefined || !QUERY_ID.test(queryId)) throw new Error("X's remove request was not found");
  const response = await pageFetch(`${GRAPHQL}${queryId}/DeleteBookmark`, {
    method: 'POST',
    credentials: 'include',
    headers: { ...authHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify({ variables: { tweet_id: postId }, queryId }),
  });
  if (!response.ok) throw new Error(`X answered ${response.status}`);
  const answer: unknown = await response.json();
  const errors = (answer as { errors?: { message?: string }[] }).errors;
  if (Array.isArray(errors) && errors.length > 0) throw new Error(errors[0]?.message ?? 'X refused the request');
}

onMessage((message) => {
  if (message.kind === 'loadMore') onLoadMore();
  if (message.kind !== 'remove') return;
  const { requestId } = message;
  remove(message.postId, message.queryId).then(
    () => send({ source: SOURCE, kind: 'removed', requestId, ok: true }),
    (error: unknown) => send({ source: SOURCE, kind: 'removed', requestId, ok: false, error: errorText(error) }),
  );
});

hookXhr();
hookFetch();
