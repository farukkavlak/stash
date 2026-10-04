// Finds X's request ids in its scripts, which the page itself can't fetch.
const SCRIPT_HOST = 'https://abs.twimg.com/';
const MAX_SCRIPTS = 300;
const BOOKMARKS_PAGE = 'https://x.com/i/bookmarks';

interface FindQueryId {
  kind: 'findQueryId';
  operation: string;
  scripts: string[];
}

function isFindQueryId(value: unknown): value is FindQueryId {
  const message = value as Partial<FindQueryId> | null;
  return (
    typeof message === 'object' &&
    message !== null &&
    message.kind === 'findQueryId' &&
    typeof message.operation === 'string' &&
    /^\w{1,64}$/.test(message.operation) &&
    Array.isArray(message.scripts)
  );
}

function queryIdPatterns(operation: string): RegExp[] {
  return [
    new RegExp(`queryId:"([\\w-]+)",operationName:"${operation}"`),
    new RegExp(`operationName:"${operation}"[^}]{0,300}?queryId:"([\\w-]+)"`),
  ];
}

// Most ids are in the main bundle.
function mainFirst(a: string, b: string): number {
  return Number(b.includes('/main.')) - Number(a.includes('/main.'));
}

async function findQueryId(operation: string, scripts: unknown[]): Promise<string | undefined> {
  const patterns = queryIdPatterns(operation);
  const urls = scripts
    .filter((url): url is string => typeof url === 'string' && url.startsWith(SCRIPT_HOST))
    .sort(mainFirst)
    .slice(0, MAX_SCRIPTS);
  for (const url of urls) {
    const response = await fetch(url);
    if (!response.ok) continue;
    const code = await response.text();
    for (const pattern of patterns) {
      const match = pattern.exec(code)?.[1];
      if (match !== undefined) return match;
    }
  }
  return undefined;
}

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !isFindQueryId(message)) return false;
  findQueryId(message.operation, message.scripts).then(
    (queryId) => sendResponse({ queryId }),
    () => sendResponse({}),
  );
  return true;
});

chrome.action.onClicked.addListener(() => {
  void chrome.tabs.create({ url: BOOKMARKS_PAGE });
});
