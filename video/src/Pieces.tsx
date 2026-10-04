import React from "react";
import { color, font } from "./theme";

/** The macOS arrow pointer. Pressed, it shrinks a little. */
export function Cursor({ x, y, pressed, opacity }: { x: number; y: number; pressed: number; opacity: number }) {
  return (
    <svg
      width={26} height={34} viewBox="0 0 26 34"
      style={{ position: "absolute", left: x - 3, top: y - 2, opacity, transform: `scale(${1 - 0.12 * pressed})`, transformOrigin: "3px 2px", filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.5))" }}
    >
      <path d="M3 2v25l6.5-6.2 4.3 10 4.2-1.8-4.2-9.8H23z" fill="#fff" stroke="#000" strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
}

/** The key just pressed, shown beside the cursor. */
export function KeyCap({ label, x, y, shown }: { label: string; x: number; y: number; shown: number }) {
  return (
    <div
      style={{
        position: "absolute", left: x + 26, top: y + 18, minWidth: 40, height: 40, padding: "0 12px",
        display: "grid", placeItems: "center", borderRadius: 9, fontFamily: font, fontSize: 20, fontWeight: 600,
        color: color.text, background: "#202327", border: "1px solid #3e4144", boxShadow: "0 3px 0 #3e4144",
        opacity: shown, transform: `scale(${0.7 + 0.3 * shown}) translateY(${(1 - shown) * 6}px)`,
      }}
    >
      {label}
    </div>
  );
}

export function Toast({ shown, x, y }: { shown: number; x: number; y: number }) {
  return (
    <div
      style={{
        position: "absolute", left: x, top: y, transform: `translate(-50%, ${(1 - shown) * 20}px)`, opacity: shown,
        display: "flex", gap: 16, padding: "12px 16px", borderRadius: 6, background: color.accent, color: "#fff",
        fontFamily: font, fontSize: 15, whiteSpace: "nowrap", boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
      }}
    >
      Bookmark removed <b style={{ textDecoration: "underline" }}>Undo</b>
    </div>
  );
}

/** Stash's icon, drawn from icons/icon.svg. */
export function Logo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128">
      <rect width="128" height="128" rx="28" fill={color.amber} />
      <path d="M45 14h38a6 6 0 0 1 6 6v46L64 53 39 66V20a6 6 0 0 1 6-6z" fill={color.ink} />
      <path d="M16 74h22l8 12h36l8-12h22v22a12 12 0 0 1-12 12H28a12 12 0 0 1-12-12z" fill={color.ink} />
    </svg>
  );
}
