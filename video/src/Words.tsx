import React from "react";
import { Easing, useCurrentFrame } from "remotion";
import { color, font, keyframes, rise } from "./theme";

/** A line that comes in word by word (fade, rise, unblur) and leaves faster as a whole. */
export function Words({ text, start, end, size, weight = 600, tone = color.text }: {
  text: string; start: number; end: number; size: number; weight?: number; tone?: string;
}) {
  const frame = useCurrentFrame();
  if (frame < start || frame > end) return null;
  const exit = keyframes(frame, [[end - 7, 1], [end, 0]], Easing.in(Easing.cubic));
  return (
    <div
      style={{
        width: "100%",
        textAlign: "center",
        fontFamily: font,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: size > 80 ? -4 : -0.6,
        color: tone,
        opacity: exit,
        transform: `translateY(${(1 - exit) * -10}px)`,
      }}
    >
      {text.split(" ").map((word, i) => {
        const p = rise(frame, start + i * 3);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              marginRight: "0.26em",
              opacity: p,
              transform: `translateY(${(1 - p) * 22}px)`,
              filter: `blur(${(1 - p) * 6}px)`,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}
