import React from "react";
import { Composition } from "remotion";
import { Stash, DURATION } from "./Stash";
import { FPS } from "./theme";

export function Root() {
  return <Composition id="Stash" component={Stash} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} />;
}
