import React from "react";
import { CATEGORIES, POSTS, type DemoPost } from "./data";
import {
  COLUMN_WIDTH, IMAGE_HEIGHT, OUR_TABS_HEIGHT, PANEL_HEAD, PANEL_ROW, PANEL_WIDTH, PANEL_X,
  TAB_WIDTHS, TITLE_HEIGHT, X_TABS_HEIGHT, postHeight,
} from "./layout";
import { color, font } from "./theme";

export interface PageState {
  tabsShown: number;
  panelShown: number;
  scroll: number;
  categoryOf: Record<string, string | undefined>;
  counts: Record<string, number>;
  unsorted: number;
  // How far each post has collapsed out of the list, 0 to 1.
  collapsed: Record<string, number>;
  // A category row lit up under a dragged post, 0 to 1.
  over: { id: string; amount: number } | undefined;
  hovered: string | undefined;
  // 0: the "All" tab is selected, 1: "No category".
  noCategory: number;
}

const ICON = { width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", stroke: color.muted, strokeWidth: 1.8 };

function ActionIcons({ bookmarked }: { bookmarked: boolean }) {
  return (
    <>
      <svg {...ICON}><path d="M4 5h16v11H9l-5 4z" strokeLinejoin="round" /></svg>
      <svg {...ICON}><path d="M7 7h10v6M17 17H7v-6M14 10l3 3 3-3M10 14l-3-3-3 3" strokeLinejoin="round" /></svg>
      <svg {...ICON}><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" strokeLinejoin="round" /></svg>
      <svg {...ICON} fill={bookmarked ? color.accent : "none"} stroke={bookmarked ? color.accent : color.muted}>
        <path d="M6 3h12v18l-6-4-6 4z" strokeLinejoin="round" />
      </svg>
    </>
  );
}

function Avatar({ post, size = 40 }: { post: DemoPost; size?: number }) {
  return (
    <div
      style={{
        flex: `0 0 ${size}px`, width: size, height: size, borderRadius: 999, background: post.avatar,
        display: "grid", placeItems: "center", color: "#fff", fontWeight: 700, fontSize: size * 0.42,
      }}
    >
      {post.name[0]?.toUpperCase()}
    </div>
  );
}

function Picture({ post, height }: { post: DemoPost; height: number }) {
  if (!post.image) return null;
  return (
    <div
      style={{
        height, borderRadius: 16, border: `1px solid ${color.line}`, marginTop: 12,
        background: `linear-gradient(135deg, ${post.image.from}, ${post.image.to})`,
        display: "flex", alignItems: "flex-end", padding: 14, color: "rgba(255,255,255,0.85)", fontSize: 15,
      }}
    >
      {post.image.caption}
    </div>
  );
}

function CategoryChip({ name }: { name: string | undefined }) {
  const set = name !== undefined;
  return (
    <div
      style={{
        padding: "2px 10px", borderRadius: 999, fontSize: 13,
        border: `1px solid ${set ? color.accent : color.line}`, color: set ? color.accent : color.muted,
      }}
    >
      {name ?? "+ Category"}
    </div>
  );
}

function PostCard({ post, state }: { post: DemoPost; state: PageState }) {
  const collapse = state.collapsed[post.id] ?? 0;
  const height = postHeight(post) * (1 - collapse);
  return (
    <div style={{ height, overflow: "hidden", opacity: 1 - collapse }}>
      <div
        style={{
          display: "flex", gap: 12, padding: "12px 16px", height: postHeight(post),
          borderBottom: `1px solid ${color.line}`,
          background: state.hovered === post.id ? "rgba(231, 233, 234, 0.03)" : "transparent",
        }}
      >
        <Avatar post={post} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 4, fontSize: 15, color: color.muted }}>
            <span style={{ color: color.text, fontWeight: 700 }}>{post.name}</span>
            <span>@{post.handle} · {post.when}</span>
          </div>
          <div style={{ marginTop: 2, fontSize: 15, lineHeight: "20px", color: color.text }}>{post.text}</div>
          <Picture post={post} height={IMAGE_HEIGHT} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingRight: 8 }}>
            <ActionIcons bookmarked />
            <CategoryChip name={state.categoryOf[post.id]} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Tab({ label, count, width, selected }: { label: string; count?: string; width: number; selected: number }) {
  return (
    <div
      style={{
        position: "relative", width, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        fontSize: 15, fontWeight: selected > 0.5 ? 700 : 500, color: selected > 0.5 ? color.text : color.muted,
      }}
    >
      {label}
      {count !== undefined && <span style={{ fontSize: 13, fontWeight: 400, color: color.muted }}>{count}</span>}
      <div
        style={{
          position: "absolute", left: 12, right: 12, bottom: 0, height: 4, borderRadius: 999,
          background: color.accent, opacity: selected, transform: `scaleX(${0.4 + 0.6 * selected})`,
        }}
      />
    </div>
  );
}

function OurTabs({ state }: { state: PageState }) {
  return (
    <div style={{ height: OUR_TABS_HEIGHT * state.tabsShown, overflow: "hidden" }}>
      <div
        style={{
          height: OUR_TABS_HEIGHT, display: "flex", borderBottom: `1px solid ${color.line}`, paddingLeft: 4,
          opacity: state.tabsShown, transform: `translateY(${(1 - state.tabsShown) * -12}px)`,
        }}
      >
        <Tab label="All" width={TAB_WIDTHS[0] ?? 0} selected={1 - state.noCategory} />
        {CATEGORIES.map((category, index) => (
          <Tab key={category.id} label={category.name} count={String(state.counts[category.id] ?? 0)} width={TAB_WIDTHS[index + 1] ?? 0} selected={0} />
        ))}
        <Tab label="No category" count={String(state.unsorted)} width={TAB_WIDTHS[5] ?? 0} selected={state.noCategory} />
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", padding: "0 12px", borderLeft: `1px solid ${color.line}` }}>
          <div style={{ padding: "6px 16px", borderRadius: 999, background: color.text, color: color.background, fontSize: 14, fontWeight: 700 }}>Sort</div>
        </div>
      </div>
    </div>
  );
}

function XHeader() {
  return (
    <>
      <div style={{ height: TITLE_HEIGHT, display: "flex", alignItems: "center", padding: "0 16px", fontSize: 20, fontWeight: 700, color: color.text }}>
        History
      </div>
      <div style={{ height: X_TABS_HEIGHT, display: "flex", borderBottom: `1px solid ${color.line}` }}>
        {["Bookmarks", "Likes"].map((label, index) => (
          <div key={label} style={{ flex: 1, display: "grid", placeItems: "center", position: "relative", fontSize: 15, fontWeight: index === 0 ? 700 : 500, color: index === 0 ? color.text : color.muted }}>
            {label}
            {index === 0 && <div style={{ position: "absolute", bottom: 0, width: 72, height: 4, borderRadius: 999, background: color.accent }} />}
          </div>
        ))}
      </div>
    </>
  );
}

function Panel({ state }: { state: PageState }) {
  const row = (id: string, children: React.ReactNode, tone = color.text) => {
    const lit = state.over?.id === id ? state.over.amount : 0;
    const shade = id === "remove" ? "244, 33, 46" : "29, 155, 240";
    return (
      <div
        key={id}
        style={{
          height: PANEL_ROW, display: "flex", alignItems: "center", gap: 10, padding: "0 16px",
          borderTop: `1px solid ${color.line}`, color: tone, fontSize: 15,
          background: `rgba(${shade}, ${0.2 * lit})`, boxShadow: `inset ${3 * lit}px 0 rgb(${shade})`,
        }}
      >
        {children}
      </div>
    );
  };
  const key = (label: string) => <span style={{ width: 22, color: color.muted, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{label}</span>;
  return (
    <div
      style={{
        position: "absolute", left: PANEL_X, top: 0, width: PANEL_WIDTH, borderRadius: 16,
        border: `1px solid ${color.line}`, overflow: "hidden", background: color.background,
        opacity: state.panelShown, transform: `translateX(${(1 - state.panelShown) * 40}px)`,
      }}
    >
      <div style={{ height: PANEL_HEAD, padding: "12px 16px" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: color.text }}>Categories</div>
        <div style={{ marginTop: 6, fontSize: 13, color: color.muted }}>Drag a post here, or point at it and press a number.</div>
      </div>
      {CATEGORIES.map((category, index) =>
        row(category.id, <>
          {key(String(index + 1))}
          <span style={{ flex: 1 }}>{category.name}</span>
          <span style={{ fontSize: 13, color: color.muted }}>{state.counts[category.id]}</span>
        </>),
      )}
      <div style={{ padding: "8px 12px 12px", borderTop: `1px solid ${color.line}` }}>
        <div style={{ padding: "8px 12px", border: `1px solid ${color.line}`, borderRadius: 999, fontSize: 14, color: color.muted }}>+ New category</div>
      </div>
      {row("remove", <>{key("Del")}Remove bookmark</>, color.danger)}
    </div>
  );
}

/** The bookmarks page with Stash added, in page pixels. */
export function Page({ state }: { state: PageState }) {
  return (
    <div style={{ position: "relative", fontFamily: font }}>
      <div style={{ width: COLUMN_WIDTH, borderLeft: `1px solid ${color.line}`, borderRight: `1px solid ${color.line}`, minHeight: 2000, background: color.background }}>
        <XHeader />
        <OurTabs state={state} />
        <div style={{ height: 2000, overflow: "hidden" }}>
          <div style={{ transform: `translateY(${-state.scroll}px)` }}>
            {POSTS.map((post) => <PostCard key={post.id} post={post} state={state} />)}
          </div>
        </div>
      </div>
      <Panel state={state} />
    </div>
  );
}

/** A small copy of a post that follows the cursor while it is dragged. */
export function Ghost({ post }: { post: DemoPost }) {
  return (
    <div
      style={{
        width: 280, padding: 10, borderRadius: 14, background: "#16181c", border: `1px solid ${color.line}`,
        boxShadow: "0 18px 40px rgba(0,0,0,0.6)", display: "flex", gap: 10, fontFamily: font, transform: "rotate(-3deg)",
      }}
    >
      <Avatar post={post} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: color.text }}>{post.name}</div>
        <div style={{ fontSize: 13, color: color.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{post.text}</div>
        {post.image && <div style={{ height: 70, marginTop: 6, borderRadius: 8, background: `linear-gradient(135deg, ${post.image.from}, ${post.image.to})` }} />}
      </div>
    </div>
  );
}

