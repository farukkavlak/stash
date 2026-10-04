import { Easing, interpolate, spring } from "remotion";

// X's dark theme, as the extension draws it, plus Stash's amber.
export const color = {
  background: "#000000",
  text: "#e7e9ea",
  muted: "#71767b",
  line: "#2f3336",
  hover: "rgba(231, 233, 234, 0.1)",
  accent: "#1d9bf0",
  danger: "#f4212e",
  amber: "#f5a524",
  ink: "#1b1405",
};

export const font = `-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;

export const FPS = 30;

/** Piecewise interpolation through [frame, value] keyframes, eased between each pair. */
export function keyframes(frame: number, points: [number, number][], easing = Easing.inOut(Easing.cubic)) {
  return interpolate(
    frame,
    points.map(([f]) => f),
    points.map(([, v]) => v),
    { easing, extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
}

export function rise(frame: number, start: number, damping = 18) {
  return spring({ frame: frame - start, fps: FPS, config: { damping, mass: 0.8 } });
}
