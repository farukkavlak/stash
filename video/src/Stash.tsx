import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Backdrop, Finish, forGif } from "./Backdrop";
import { POSTS, UNSORTED } from "./data";
import { COLUMN_WIDTH, PAGE_WIDTH, PANEL_X, listTop, panelRowCenter, postTop, tabCenter } from "./layout";
import { Ghost, Page, type PageState } from "./Page";
import { Cursor, KeyCap, Logo, Toast } from "./Pieces";
import { color, FPS, keyframes, rise } from "./theme";
import { Words } from "./Words";

// Scene boundaries, in frames at 30 fps.
const INTRO = [0, 120];
const TABS = [120, 240];
const DRAG = [240, 400];
const KEYS = [400, 560];
const REMOVE = [560, 700];
const SORTED = [700, 830];
const END = [830, 920];
export const DURATION = END[1];

// The page is drawn in page pixels and scaled up onto the 1080p frame.
const SCALE = 1.45;
const STAGE_X = (1920 - PAGE_WIDTH * SCALE) / 2;
const STAGE_Y = 180;
const VISIBLE = (1080 - STAGE_Y) / SCALE;

const post = (id: string) => POSTS.findIndex((entry) => entry.id === id);
const after = (frame: number, at: number) => (frame >= at ? 1 : 0);

// Scroll positions for each scene, chosen so the post in play sits in view.
const SCROLL_KEYS = postTop(post("meme")) - 24;
const SCROLL_REMOVE = postTop(post("old")) - 80;

/** A point on a post's text, at a given scroll. */
function postPoint(id: string, scroll: number): { x: number; y: number } {
  return { x: 470, y: listTop(1) + postTop(post(id)) - scroll + 44 };
}

const MOVIE_ROW = { x: PANEL_X + 120, y: panelRowCenter(1) };
const FILM = postPoint("film", 0);
const MEME = postPoint("meme", SCROLL_KEYS);
const LAMP = postPoint("lamp", SCROLL_KEYS);
const OLD = postPoint("old", SCROLL_REMOVE);
const NO_CATEGORY_TAB = { x: tabCenter(5) - 20, y: listTop(0) + 34 };

const DROP = DRAG[0] + 112;
const MEME_KEY = KEYS[0] + 55;
const LAMP_KEY = KEYS[0] + 105;
const DELETE_KEY = REMOVE[0] + 52;
const TAB_CLICK = SORTED[0] + 60;

/** The cursor's path: [frame, x, y] points, eased between each. */
const CURSOR: [number, number, number][] = [
  [DRAG[0] + 8, COLUMN_WIDTH + 120, 520],
  [DRAG[0] + 45, FILM.x, FILM.y],
  [DRAG[0] + 58, FILM.x, FILM.y],
  [DROP - 6, MOVIE_ROW.x, MOVIE_ROW.y],
  [KEYS[0] + 20, MOVIE_ROW.x, MOVIE_ROW.y],
  [MEME_KEY - 12, MEME.x, MEME.y],
  [MEME_KEY + 18, MEME.x, MEME.y],
  [LAMP_KEY - 12, LAMP.x, LAMP.y],
  [REMOVE[0] + 10, LAMP.x, LAMP.y],
  [DELETE_KEY - 12, OLD.x, OLD.y],
  [SORTED[0] + 30, OLD.x, OLD.y],
  [TAB_CLICK - 8, NO_CATEGORY_TAB.x, NO_CATEGORY_TAB.y],
];

function cursorAt(frame: number) {
  return {
    x: keyframes(frame, CURSOR.map(([f, x]) => [f, x])),
    y: keyframes(frame, CURSOR.map(([f, , y]) => [f, y])),
  };
}

function keyShown(frame: number, at: number) {
  return keyframes(frame, [[at - 2, 0], [at + 3, 1], [at + 22, 1], [at + 30, 0]]);
}

function pageState(frame: number): PageState {
  const sorted = keyframes(frame, [[TAB_CLICK + 4, 0], [TAB_CLICK + 24, 1]]);
  const removed = keyframes(frame, [[DELETE_KEY + 2, 0], [DELETE_KEY + 18, 1]]);
  return {
    tabsShown: rise(frame, TABS[0] + 30),
    panelShown: rise(frame, TABS[0] + 48),
    scroll:
      frame < TABS[0]
        ? keyframes(frame, [[0, 900], [INTRO[1], 0]], Easing.out(Easing.cubic))
        : keyframes(frame, [
            [KEYS[0], 0], [KEYS[0] + 25, SCROLL_KEYS],
            [REMOVE[0], SCROLL_KEYS], [REMOVE[0] + 25, SCROLL_REMOVE],
            [SORTED[0], SCROLL_REMOVE], [SORTED[0] + 25, 0],
          ]),
    categoryOf: {
      film: frame >= DROP ? "movie" : undefined,
      meme: frame >= MEME_KEY + 2 ? "meme" : undefined,
      lamp: frame >= LAMP_KEY + 2 ? "shop" : undefined,
    },
    counts: {
      meme: 12 + after(frame, MEME_KEY + 2),
      movie: 7 + after(frame, DROP),
      shop: 4 + after(frame, LAMP_KEY + 2),
      read: 9,
    },
    unsorted: UNSORTED - after(frame, DROP) - after(frame, MEME_KEY + 2) - after(frame, LAMP_KEY + 2) - after(frame, DELETE_KEY + 2),
    collapsed: { old: removed, film: sorted, meme: sorted, lamp: sorted },
    over: frame >= DROP - 24 && frame < DROP + 10
      ? { id: "movie", amount: keyframes(frame, [[DROP - 24, 0], [DROP - 8, 1], [DROP + 2, 1], [DROP + 10, 0]]) }
      : undefined,
    hovered: frame >= MEME_KEY - 12 && frame < MEME_KEY + 18 ? "meme" : frame >= LAMP_KEY - 12 && frame < REMOVE[0] ? "lamp" : undefined,
    noCategory: keyframes(frame, [[TAB_CLICK, 0], [TAB_CLICK + 6, 1]]),
  };
}

function Sfx({ at, name, volume = 1 }: { at: number; name: string; volume?: number }) {
  return (
    <Sequence from={Math.max(0, at)} durationInFrames={FPS}>
      <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
    </Sequence>
  );
}

export function Stash() {
  const frame = useCurrentFrame();
  const state = pageState(frame);
  const cursor = cursorAt(frame);

  // The intro shows the page racing by, blurred; it then settles into focus.
  const focus = keyframes(frame, [[INTRO[1] - 16, 0], [TABS[0] + 14, 1]]);
  const stageOpacity = Math.min(keyframes(frame, [[0, 0], [10, 1]]), keyframes(frame, [[END[0], 1], [END[0] + 14, 0]]));
  const stageScale = 1 + 0.06 * (1 - focus);

  const pressed = Math.max(
    keyframes(frame, [[DRAG[0] + 52, 0], [DRAG[0] + 58, 1], [DROP - 2, 1], [DROP + 4, 0]]),
    keyframes(frame, [[TAB_CLICK - 4, 0], [TAB_CLICK, 1], [TAB_CLICK + 6, 0]]),
  );
  const dragging = frame >= DRAG[0] + 58 && frame < DROP;
  const cursorOpacity = keyframes(frame, [[DRAG[0] + 4, 0], [DRAG[0] + 14, 1], [SORTED[1] - 16, 1], [SORTED[1] - 6, 0]]);
  const toast = keyframes(frame, [[DELETE_KEY + 6, 0], [DELETE_KEY + 14, 1], [REMOVE[1] - 10, 1], [REMOVE[1], 0]]);
  const film = POSTS[post("film")];

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Backdrop />

      <div style={{ position: "absolute", left: STAGE_X, top: STAGE_Y, width: PAGE_WIDTH, height: VISIBLE, transformOrigin: "0 0", transform: `scale(${SCALE})` }}>
        <div
          style={{
            width: "100%", height: "100%", overflow: "hidden", opacity: stageOpacity,
            transformOrigin: "50% 0", transform: `scale(${stageScale})`, filter: `blur(${(1 - focus) * 7}px)`,
            maskImage: "linear-gradient(to bottom, black 85%, transparent)",
          }}
        >
          <Page state={state} />
        </div>
      </div>

      {/* Cursor, key badges and the dragged post sit above the page's fade-out mask. */}
      <div style={{ position: "absolute", left: STAGE_X, top: STAGE_Y, transformOrigin: "0 0", transform: `scale(${SCALE})` }}>
        {dragging && film && (
          <div style={{ position: "absolute", left: cursor.x + 12, top: cursor.y + 10, opacity: 0.95 }}>
            <Ghost post={film} />
          </div>
        )}
        <Toast shown={toast} x={COLUMN_WIDTH / 2} y={VISIBLE - 150} />
        <KeyCap label="1" x={cursor.x} y={cursor.y} shown={keyShown(frame, MEME_KEY)} />
        <KeyCap label="3" x={cursor.x} y={cursor.y} shown={keyShown(frame, LAMP_KEY)} />
        <KeyCap label="Del" x={cursor.x} y={cursor.y} shown={keyShown(frame, DELETE_KEY)} />
        <Cursor x={cursor.x} y={cursor.y} pressed={pressed} opacity={cursorOpacity} />
      </div>

      <div style={{ position: "absolute", top: 64, width: "100%" }}>
        <Words text="Years of saved posts." start={INTRO[0] + 8} end={INTRO[0] + 58} size={64} />
        <Words text="Good luck finding anything." start={INTRO[0] + 62} end={INTRO[1] - 2} size={64} />
        <Words text="Stash adds categories to your X bookmarks." start={TABS[0] + 6} end={TABS[1] - 4} size={52} />
        <Words text="Drag a post onto a category." start={DRAG[0] + 4} end={DRAG[1] - 4} size={52} />
        <Words text="Or point at it and press a number." start={KEYS[0] + 4} end={KEYS[1] - 4} size={52} />
        <Words text="Delete what you don't need." start={REMOVE[0] + 4} end={REMOVE[1] - 4} size={52} />
        <Words text="No category shows what's left to sort." start={SORTED[0] + 4} end={SORTED[1] - 4} size={52} />
      </div>

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 12 }}>
        <div style={{ opacity: rise(frame, END[0] + 6), transform: `scale(${0.8 + 0.2 * rise(frame, END[0] + 6)})` }}>
          {frame >= END[0] && <Logo size={150} />}
        </div>
        <Words text="Stash" start={END[0] + 12} end={END[1] + 30} size={140} weight={700} />
        <Words text="github.com/farukkavlak/stash" start={END[0] + 20} end={END[1] + 30} size={40} weight={500} tone={color.amber} />
        <Words text="Chrome extension · free and open source" start={END[0] + 28} end={END[1] + 30} size={26} weight={400} tone={color.muted} />
      </AbsoluteFill>

      <Finish />

      {/* Sound: each cue starts ~2 frames before its visual, which reads as in sync. */}
      {!forGif && (
        <>
          <Sfx at={INTRO[1] - 14} name="whoosh" volume={0.8} />
          <Sfx at={TABS[0] + 28} name="tick" />
          <Sfx at={TABS[0] + 46} name="tick" volume={0.7} />
          <Sfx at={DROP - 2} name="drop" />
          <Sfx at={MEME_KEY - 1} name="key0" />
          <Sfx at={MEME_KEY + 1} name="drop" volume={0.6} />
          <Sfx at={LAMP_KEY - 1} name="key1" />
          <Sfx at={LAMP_KEY + 1} name="drop" volume={0.6} />
          <Sfx at={DELETE_KEY - 1} name="key2" />
          <Sfx at={DELETE_KEY + 1} name="swipe" />
          <Sfx at={TAB_CLICK - 2} name="tick" />
          <Sfx at={END[0] - 4} name="whoosh" volume={0.7} />
          <Sfx at={END[0] + 10} name="tick" volume={0.8} />
        </>
      )}
    </AbsoluteFill>
  );
}
