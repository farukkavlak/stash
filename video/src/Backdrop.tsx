import React from "react";
import { AbsoluteFill, getInputProps, useCurrentFrame } from "remotion";
import { color } from "./theme";

/**
 * Rendering for the README GIF (`--props='{"forGif":true}'`): GIF compression collapses
 * when every pixel changes each frame, so the drift and grain are turned off there.
 */
export const forGif = Boolean(getInputProps().forGif);

/** Black, with two very soft, slowly drifting pools of light: amber and X blue. */
export function Backdrop() {
  const frame = useCurrentFrame();
  const t = forGif ? 0 : frame;
  const drift1 = Math.sin(t / 60) * 40;
  const drift2 = Math.cos(t / 75) * 35;
  return (
    <AbsoluteFill style={{ background: color.background }}>
      <div
        style={{
          position: "absolute", width: 1400, height: 1400, borderRadius: "50%",
          top: -720, left: -320 + drift1, filter: "blur(70px)",
          background: "radial-gradient(circle, rgba(245, 165, 36, 0.10), transparent 62%)",
        }}
      />
      <div
        style={{
          position: "absolute", width: 1200, height: 1200, borderRadius: "50%",
          bottom: -620, right: -260 - drift2, filter: "blur(80px)",
          background: "radial-gradient(circle, rgba(29, 155, 240, 0.08), transparent 65%)",
        }}
      />
    </AbsoluteFill>
  );
}

/** Topmost finishing layer: a vignette and moving film grain. */
export function Finish() {
  const frame = useCurrentFrame();
  const noise = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;
  return (
    <>
      <AbsoluteFill
        style={{ pointerEvents: "none", background: "radial-gradient(ellipse at center, transparent 55%, rgba(0, 0, 0, 0.55) 100%)" }}
      />
      {!forGif && (
        <AbsoluteFill
          style={{
            pointerEvents: "none",
            backgroundImage: noise,
            backgroundSize: "220px",
            backgroundPosition: `${(frame * 7) % 220}px ${(frame * 13) % 220}px`,
            opacity: 0.05,
            mixBlendMode: "screen",
          }}
        />
      )}
    </>
  );
}
