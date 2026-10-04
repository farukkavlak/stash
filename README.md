<img src="icons/icon-128.png" width="64" alt="">

# Stash

Sort years of saved X posts into categories and remove the ones you don't need.

Stash is a Chrome extension. It works inside X's bookmarks page, using the login you
already have. No account, no API key, no server.

## Features

- Category tabs under X's "Bookmarks / Likes" tabs
- Drag a post onto a category in the side panel, or press `1`-`9` over it
- `Delete` over a post removes the bookmark, with five seconds to undo
- **No category** lists everything still to sort
- **Sort** shows one post at a time, with keys for each decision

## Install

```
npm install
npm run build
```

Open `chrome://extensions`, turn on Developer mode, click "Load unpacked" and pick this
folder.

## Keys in the one-by-one view

| Key   | Does                          |
| ----- | ----------------------------- |
| `1-9` | Keep in that category         |
| `K`   | Keep with no category         |
| `D`   | Remove the bookmark           |
| `Z`   | Undo                          |
| `L`   | Show what was removed         |
| `Esc` | Close                         |

## Privacy

Your data stays in this browser. Stash only talks to X, and only sends the requests X's
own page sends.

| Permission                    | Why                                                   |
| ----------------------------- | ----------------------------------------------------- |
| `storage`, `unlimitedStorage` | Saves categories and kept posts                       |
| `abs.twimg.com`               | Reads X's scripts to find its "remove bookmark" request |

## Development

```
npm run watch    rebuild on change
npm run check    type check, lint, test, build
```

All X-specific code is in `src/platforms/x/`. X's internal API is not public, so when X
changes it, that folder needs a fix.

Not affiliated with X Corp. MIT license.
